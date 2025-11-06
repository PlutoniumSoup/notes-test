from typing import List, Tuple
from neo4j import Session
from elasticsearch import Elasticsearch
from ..models.schemas import GraphNode, GraphLink, GraphData


def upsert_node(session: Session, node: GraphNode):
    session.run(
        """
        MERGE (n:Node {id: $id})
        SET n.label = $label,
            n.summary = $summary,
            n.tags = $tags,
            n.has_gap = $has_gap,
            n.level = $level
        """,
        id=node.id,
        label=node.label,
        summary=node.summary,
        tags=node.tags,
        has_gap=node.has_gap,
        level=getattr(node, 'level', None),
    )


def link_nodes(session: Session, source_id: str, target_id: str, relation: str):
    session.run(
        """
        MATCH (a:Node {id: $source}), (b:Node {id: $target})
        MERGE (a)-[r:RELATED {relation: $relation}]->(b)
        RETURN r
        """,
        source=source_id,
        target=target_id,
        relation=relation,
    )


def search_nodes_by_keywords(es: Elasticsearch, index: str, keywords: List[str], limit: int = 10) -> List[GraphNode]:
    if not keywords:
        return []
    query = {
        "query": {
            "bool": {
                "should": [
                    {"match": {"label": " ".join(keywords)}},
                    {"match": {"summary": " ".join(keywords)}}
                ]
            }
        },
        "size": limit,
    }
    res = es.search(index=index, body=query)
    nodes: List[GraphNode] = []
    for hit in res["hits"]["hits"]:
        src = hit["_source"]
        nodes.append(
            GraphNode(
                id=src.get("id"),
                label=src.get("label", ""),
                summary=src.get("summary"),
                tags=src.get("tags", []),
                has_gap=bool(src.get("has_gap", False)),
            )
        )
    return nodes


def graph_from_cypher_records(records) -> GraphData:
    node_map = {}
    links: List[GraphLink] = []
    for rec in records:
        a = rec.get("a")
        b = rec.get("b")
        r = rec.get("r")
        if a and a.id not in node_map:
            node_map[a.id] = GraphNode(
                id=a["id"],
                label=a.get("label", a["id"]),
                summary=a.get("summary"),
                tags=a.get("tags", []),
                has_gap=bool(a.get("has_gap", False)),
                level=a.get("level"),
            )
        if b and b.id not in node_map:
            node_map[b.id] = GraphNode(
                id=b["id"],
                label=b.get("label", b["id"]),
                summary=b.get("summary"),
                tags=b.get("tags", []),
                has_gap=bool(b.get("has_gap", False)),
                level=b.get("level"),
            )
        if r:
            links.append(
                GraphLink(
                    source=a["id"],
                    target=b["id"],
                    relation=r.get("relation", "related"),
                )
            )
    return GraphData(nodes=list(node_map.values()), links=links)
