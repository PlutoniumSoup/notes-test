from fastapi import APIRouter, HTTPException, Depends
from typing import List
from pydantic import BaseModel
from ..db.neo4j import get_neo4j_driver
from ..models.schemas import GraphNode, GraphLink, GraphData
from ..services.knowledge import upsert_node, link_nodes, graph_from_cypher_records
from ..core.security import get_current_user
from ..db.models import User


class BatchDeleteRequest(BaseModel):
    node_ids: List[str]


router = APIRouter(prefix="/graph", tags=["graph"])


@router.post("/nodes", response_model=GraphNode)
def create_or_update_node(
    node: GraphNode,
    current_user: User = Depends(get_current_user)
):
    driver = get_neo4j_driver()
    with driver.session() as session:
        upsert_node(session, node, user_id=str(current_user.id))
    return node


@router.post("/links", response_model=GraphLink)
def create_link(
    link: GraphLink,
    current_user: User = Depends(get_current_user)
):
    driver = get_neo4j_driver()
    with driver.session() as session:
        link_nodes(session, link.source, link.target, link.relation, user_id=str(current_user.id))
    return link


@router.delete("/nodes/{node_id}")
def delete_node(
    node_id: str,
    current_user: User = Depends(get_current_user)
):
    """Удаляет узел графа и все его связи"""
    driver = get_neo4j_driver()
    with driver.session() as session:
        result = session.run(
            """
            MATCH (n:Node {id: $node_id, user_id: $user_id})
            DETACH DELETE n
            RETURN count(n) AS deleted
            """,
            node_id=node_id,
            user_id=str(current_user.id)
        )
        record = result.single()
        if not record or record["deleted"] == 0:
            raise HTTPException(status_code=404, detail="Node not found")
    
    return {"status": "deleted", "node_id": node_id}


@router.patch("/nodes/{node_id}", response_model=GraphNode)
def update_node(
    node_id: str,
    node: GraphNode,
    current_user: User = Depends(get_current_user)
):
    """Обновляет узел графа"""
    driver = get_neo4j_driver()
    with driver.session() as session:
        result = session.run(
            """
            MATCH (n:Node {id: $node_id, user_id: $user_id})
            SET n.label = $label,
                n.summary = $summary,
                n.tags = $tags,
                n.has_gap = $has_gap,
                n.level = $level,
                n.updated_at = datetime()
            RETURN n
            """,
            node_id=node_id,
            user_id=str(current_user.id),
            label=node.label,
            summary=node.summary,
            tags=node.tags,
            has_gap=node.has_gap,
            level=node.level
        )
        if not result.single():
            raise HTTPException(status_code=404, detail="Node not found")
    
    return node


@router.get("/all", response_model=GraphData)
def get_all_graph(
    current_user: User = Depends(get_current_user)
):
    """Получает весь граф пользователя"""
    driver = get_neo4j_driver()
    with driver.session() as session:
        # Получаем все узлы
        nodes_result = session.run(
            """
            MATCH (n:Node {user_id: $user_id})
            RETURN n
            """,
            user_id=str(current_user.id)
        )
        
        # Получаем все связи
        links_result = session.run(
            """
            MATCH (a:Node {user_id: $user_id})-[r:RELATED|contains|related_to]-(b:Node {user_id: $user_id})
            RETURN a, r, b
            """,
            user_id=str(current_user.id)
        )
        
        # Объединяем результаты
        all_records = list(links_result)
        # Добавляем узлы без связей
        for node_rec in nodes_result:
            node = node_rec["n"]
            # Проверяем, есть ли уже этот узел в связях
            found = False
            for rec in all_records:
                if rec.get("a") and rec["a"].id == node.id:
                    found = True
                    break
                if rec.get("b") and rec["b"].id == node.id:
                    found = True
                    break
            if not found:
                all_records.append({"a": node, "r": None, "b": None})
        
        data = graph_from_cypher_records(all_records)
    return data


@router.post("/nodes/batch-delete")
def batch_delete_nodes(
    request: BatchDeleteRequest,
    current_user: User = Depends(get_current_user)
):
    """Удаляет группу узлов графа"""
    if not request.node_ids:
        raise HTTPException(status_code=400, detail="No nodes to delete")
    
    driver = get_neo4j_driver()
    deleted_count = 0
    with driver.session() as session:
        for node_id in request.node_ids:
            result = session.run(
                """
                MATCH (n:Node {id: $node_id, user_id: $user_id})
                DETACH DELETE n
                RETURN count(n) AS deleted
                """,
                node_id=node_id,
                user_id=str(current_user.id)
            )
            record = result.single()
            if record and record["deleted"] > 0:
                deleted_count += 1
    
    return {"status": "deleted", "deleted_count": deleted_count, "total_requested": len(request.node_ids)}


@router.get("/neighbors/{node_id}", response_model=GraphData)
def get_neighbors(
    node_id: str,
    current_user: User = Depends(get_current_user)
):
    driver = get_neo4j_driver()
    with driver.session() as session:
        records = session.run(
            """
            MATCH (a:Node {id: $id, user_id: $user_id})-[r:RELATED]-(b:Node {user_id: $user_id})
            RETURN a, r, b
            """,
            id=node_id,
            user_id=str(current_user.id)
        )
        data = graph_from_cypher_records(records)
    return data
