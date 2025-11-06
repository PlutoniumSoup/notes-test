from fastapi import APIRouter, HTTPException, Query
from typing import List
from ..services.llm import analyze_note_with_llm, extract_keywords_with_llm, detect_knowledge_gaps
from ..services.wikipedia import populate_knowledge_base_from_keywords
from ..services.hierarchy import create_hierarchical_graph
from ..db.neo4j import get_neo4j_driver
from ..db.elastic import get_es
from ..core.config import get_settings
from ..models.schemas import GraphNode, GraphLink, GraphData
from ..services.knowledge import upsert_node, link_nodes, search_nodes_by_keywords, graph_from_cypher_records
import hashlib
import logging

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("/note")
async def analyze_note(content: str = Query(..., min_length=10)):
    """
    Анализирует заметку с помощью LLM и создает/связывает узлы графа знаний
    """

    # Анализ с помощью LLM
    analysis = analyze_note_with_llm(content)
    if not analysis:
        return {
            "keywords": [],
            "tags": [],
            "summary": "",
            "knowledge_gaps": [],
            "nodes": [],
            "links": [],
            "model_used": "none",
            "reasoning": "Анализ не удался"
        }

    # Извлекаем данные из анализа
    main_topic = analysis.get("main_topic", "")
    main_concepts = analysis.get("main_concepts", [])
    concept_hierarchy = analysis.get("concept_hierarchy", {})
    concept_descriptions = analysis.get("concept_descriptions", {})
    tags = analysis.get("tags", [])
    summary = analysis.get("summary", "")
    knowledge_gaps = analysis.get("knowledge_gaps", [])
    model_used = analysis.get("model_used", "unknown")
    reasoning = analysis.get("reasoning", "")
    
    # Fallback на старый формат, если новый не поддерживается
    keywords = []
    if not main_topic and not main_concepts:
        keywords = analysis.get("keywords", [])
        main_topic = summary[:50] if summary else "Заметка"
        main_concepts = keywords[:5] if keywords else []
        concept_hierarchy = {}
        concept_descriptions = {k: f"Концепция: {k}" for k in keywords}
    
    logger.info(f"Analysis completed. Model: {model_used}, Main topic: {main_topic}, Concepts: {main_concepts}")

    # Создаем иерархический граф
    try:
        created_nodes, links = create_hierarchical_graph(
            main_topic=main_topic,
            main_concepts=main_concepts,
            concept_hierarchy=concept_hierarchy,
            concept_descriptions=concept_descriptions,
            tags=tags if tags else ["общее"],
            summary=summary
        )
        logger.info(f"Created {len(created_nodes)} nodes and {len(links)} links")
    except Exception as e:
        logger.error(f"Failed to create hierarchical graph: {e}")
        logger.exception(e)
        created_nodes = []
        links = []

    return {
        "main_topic": main_topic,
        "main_concepts": main_concepts,
        "tags": tags if tags else ["общее"],
        "summary": summary,
        "knowledge_gaps": knowledge_gaps,
        "nodes": [
            {
                "id": n.id,
                "label": n.label,
                "summary": n.summary,
                "has_gap": n.has_gap,
                "level": getattr(n, 'level', None),
                "tags": n.tags
            }
            for n in created_nodes
        ],
        "links": [{"source": l.source, "target": l.target, "relation": l.relation} for l in links],
        "model_used": model_used,
        "reasoning": reasoning
    }


@router.get("/graph/{node_id}", response_model=GraphData)
def get_node_graph(node_id: str):
    """Получает граф вокруг узла"""
    driver = get_neo4j_driver()
    with driver.session() as session:
        records = session.run(
            """
            MATCH (a:Node {id: $id})-[r:RELATED|contains|related_to]-(b:Node)
            RETURN a, r, b
            LIMIT 50
            """,
            id=node_id,
        )
        data = graph_from_cypher_records(records)
    return data

