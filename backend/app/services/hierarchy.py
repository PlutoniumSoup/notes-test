from typing import Dict, List, Optional
from ..models.schemas import GraphNode, GraphLink
from ..db.neo4j import get_neo4j_driver
from ..db.elastic import get_es
from ..core.config import get_settings
from ..services.knowledge import upsert_node, link_nodes
import hashlib
import logging

logger = logging.getLogger(__name__)


def create_hierarchical_graph(
    main_topic: str,
    main_concepts: List[str],
    concept_hierarchy: Dict[str, List[str]],
    concept_descriptions: Dict[str, str],
    tags: List[str],
    summary: str
) -> tuple[List[GraphNode], List[GraphLink]]:
    """
    Создает иерархический граф знаний:
    - Центральный узел (главная тема)
    - Узлы первого уровня (основные концепции)
    - Узлы второго уровня (связанные концепции)
    """
    driver = get_neo4j_driver()
    es = get_es()
    s = get_settings()
    
    nodes: List[GraphNode] = []
    links: List[GraphLink] = []
    
    with driver.session() as session:
        # Создаем центральный узел (главная тема)
        main_id = hashlib.md5(main_topic.encode()).hexdigest()[:16]
        main_node = GraphNode(
            id=f"topic_{main_id}",
            label=main_topic,
            summary=summary,
            tags=tags,
            has_gap=False,
            level=0
        )
        upsert_node(session, main_node)
        nodes.append(main_node)
        
        # Индексируем в Elasticsearch
        es.index(index=s.elastic_index_nodes, id=main_node.id, document={
            "id": main_node.id,
            "label": main_node.label,
            "summary": main_node.summary,
            "tags": main_node.tags,
            "has_gap": main_node.has_gap,
            "level": 0
        })
        
        # Создаем узлы первого уровня (основные концепции)
        for concept in main_concepts:
            concept_id = hashlib.md5(concept.encode()).hexdigest()[:16]
            concept_description = concept_descriptions.get(concept, f"Концепция: {concept}")
            
            concept_node = GraphNode(
                id=f"concept_{concept_id}",
                label=concept,
                summary=concept_description,
                tags=tags,
                has_gap=False,
                level=1
            )
            upsert_node(session, concept_node)
            nodes.append(concept_node)
            
            # Связываем центральный узел с концепцией первого уровня
            link_nodes(session, main_node.id, concept_node.id, "contains")
            links.append(GraphLink(
                source=main_node.id,
                target=concept_node.id,
                relation="contains"
            ))
            
            # Индексируем в Elasticsearch
            es.index(index=s.elastic_index_nodes, id=concept_node.id, document={
                "id": concept_node.id,
                "label": concept_node.label,
                "summary": concept_node.summary,
                "tags": concept_node.tags,
                "has_gap": concept_node.has_gap,
                "level": 1
            })
            
            # Создаем узлы второго уровня (связанные концепции)
            related_concepts = concept_hierarchy.get(concept, [])
            for related in related_concepts:
                related_id = hashlib.md5(related.encode()).hexdigest()[:16]
                related_description = concept_descriptions.get(related, f"Связанная концепция: {related}")
                
                related_node = GraphNode(
                    id=f"related_{related_id}",
                    label=related,
                    summary=related_description,
                    tags=tags,
                    has_gap=False,
                    level=2
                )
                upsert_node(session, related_node)
                nodes.append(related_node)
                
                # Связываем концепцию первого уровня с концепцией второго уровня
                link_nodes(session, concept_node.id, related_node.id, "part_of")
                links.append(GraphLink(
                    source=concept_node.id,
                    target=related_node.id,
                    relation="part_of"
                ))
                
                # Индексируем в Elasticsearch
                es.index(index=s.elastic_index_nodes, id=related_node.id, document={
                    "id": related_node.id,
                    "label": related_node.label,
                    "summary": related_node.summary,
                    "tags": related_node.tags,
                    "has_gap": related_node.has_gap,
                    "level": 2
                })
    
    return nodes, links

