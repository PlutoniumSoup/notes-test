from fastapi import APIRouter, HTTPException, Depends
from ..db.neo4j import get_neo4j_driver
from ..models.schemas import GraphNode, GraphLink, GraphData
from ..services.knowledge import upsert_node, link_nodes, graph_from_cypher_records
from ..core.security import get_current_user
from ..db.models import User


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
