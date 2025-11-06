from fastapi import APIRouter, HTTPException
from ..db.neo4j import get_neo4j_driver
from ..models.schemas import GraphNode, GraphLink, GraphData
from ..services.knowledge import upsert_node, link_nodes, graph_from_cypher_records


router = APIRouter(prefix="/graph", tags=["graph"])


@router.post("/nodes", response_model=GraphNode)
def create_or_update_node(node: GraphNode):
    driver = get_neo4j_driver()
    with driver.session() as session:
        upsert_node(session, node)
    return node


@router.post("/links", response_model=GraphLink)
def create_link(link: GraphLink):
    driver = get_neo4j_driver()
    with driver.session() as session:
        link_nodes(session, link.source, link.target, link.relation)
    return link


@router.get("/neighbors/{node_id}", response_model=GraphData)
def get_neighbors(node_id: str):
    driver = get_neo4j_driver()
    with driver.session() as session:
        records = session.run(
            """
            MATCH (a:Node {id: $id})-[r:RELATED]-(b:Node)
            RETURN a, r, b
            """,
            id=node_id,
        )
        data = graph_from_cypher_records(records)
    return data
