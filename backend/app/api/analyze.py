from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List
from ..services.llm import analyze_note_with_llm
from ..core.security import get_current_user
from ..db.models import User
from ..services.wikipedia import populate_knowledge_base_from_keywords
from ..services.hierarchy import create_hierarchical_graph
from ..db.neo4j import get_neo4j_driver
from ..db.elastic import get_es
from ..core.config import get_settings
from ..models.schemas import GraphNode, GraphLink, GraphData
from ..services.knowledge import upsert_node, link_nodes, search_nodes_by_keywords, graph_from_cypher_records
from ..services.node_matching import normalize_for_id, find_matching_node, merge_node_data
from ..services.prompt_injection_filter import sanitize_content, detect_injection_attempt
import hashlib
import logging

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/analyze", tags=["analyze"])


@router.post("/note")
async def analyze_note(
    content: str = Query(..., min_length=10),
    note_id: str = Query(None),  # Optional note ID for tracking
    current_user: User = Depends(get_current_user)
):
    """
    Анализирует заметку с помощью LLM и создает/связывает узлы графа знаний
    """
    # Ограничение длины контента
    if len(content) > 2000:
        raise HTTPException(
            status_code=400,
            detail="Слишком длинная заметка! Максимум 2000 символов. Пожалуйста, разбейте на несколько заметок."
        )
    
    # Защита от prompt injection
    is_injection, patterns = detect_injection_attempt(content)
    if is_injection:
        logger.warning(f"Prompt injection attempt detected for user {current_user.id}. Patterns: {patterns}")
        # Очищаем контент от опасных инструкций
        content = sanitize_content(content)
        if len(content.strip()) < 10:
            raise HTTPException(
                status_code=400,
                detail="Content contains prohibited instructions and cannot be processed"
            )

    # Анализ с помощью LLM
    analysis = analyze_note_with_llm(content)
    if not analysis:
        return {
            "tags": [],
            "nodes": [],
            "links": [],
            "model_used": "none",
            "main_topic": "Анализ не удался"
        }

    # Обработка НОВОГО формата (concepts/relationships)
    concepts = analysis.get("concepts", [])
    relationships = analysis.get("relationships", [])
    tags = analysis.get("tags", [])
    main_topic = analysis.get("main_topic", "")
    model_used = analysis.get("model_used", "unknown")
    
    logger.info(f"Analysis completed. Model: {model_used}, Topic: {main_topic}, Concepts: {len(concepts)}")
    
    # Проверка лимита узлов за последние 2 дня
    driver = get_neo4j_driver()
    try:
        with driver.session() as session:
            # Подсчитываем количество новых узлов, которые будут созданы
            new_nodes_count = len(concepts)
            
            # Подсчитываем количество узлов, созданных за последние 2 дня
            # Используем упрощенный запрос - считаем узлы с created_at за последние 2 дня
            nodes_created_result = session.run(
                """
                MATCH (n:Node {user_id: $user_id})
                WHERE n.created_at IS NOT NULL
                AND n.created_at >= datetime() - duration({days: 2})
                RETURN count(n) AS node_count
                """,
                user_id=str(current_user.id)
            )
            record = nodes_created_result.single()
            nodes_created_last_2_days = record["node_count"] if record else 0
            
            # Если запрос не сработал (старые узлы без created_at), считаем все узлы
            # но только если их больше 30 (тогда применяем лимит)
            if nodes_created_last_2_days == 0:
                total_nodes_result = session.run(
                    """
                    MATCH (n:Node {user_id: $user_id})
                    RETURN count(n) AS total_count
                    """,
                    user_id=str(current_user.id)
                )
                total_record = total_nodes_result.single()
                total_nodes = total_record["total_count"] if total_record else 0
                
                # Если узлов больше 30, считаем что лимит достигнут (старые узлы)
                if total_nodes >= 100:
                    nodes_created_last_2_days = 100
            
            # Проверяем лимит
            MAX_NODES_PER_2_DAYS = 100
            if nodes_created_last_2_days + new_nodes_count > MAX_NODES_PER_2_DAYS:
                remaining = MAX_NODES_PER_2_DAYS - nodes_created_last_2_days
                if remaining <= 0:
                    raise HTTPException(
                        status_code=429,
                        detail="🚫 Лимит узлов исчерпан! За последние 2 дня создано уже 100 узлов. "
                               "Пожалуйста, берегите токены автора - проект может развалиться на этапе бутстрэппинга"
                               "Попробуйте через пару дней или удалите старые узлы."
                    )
                else:
                    raise HTTPException(
                        status_code=429,
                        detail=f"⚠️ Почти достигнут лимит! За последние 2 дня создано {nodes_created_last_2_days} узлов. "
                               f"Можно создать еще только {remaining} узл(ов). "
                               "Берегите токены автора - проект может развалиться на этапе бутстрэппинга!"
                    )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking node limit: {e}")
        # Продолжаем выполнение, если не удалось проверить лимит
    
    # Создаем узлы из концептов
    created_nodes = []
    node_id_map = {}  # map concept_id -> node_id
    
    try:
        with driver.session() as session:
            # Сначала определяем главный концепт (с наибольшим количеством связей)
            concept_connections = {}
            for rel in relationships:
                source = rel.get("source", "")
                target = rel.get("target", "")
                concept_connections[source] = concept_connections.get(source, 0) + 1
                concept_connections[target] = concept_connections.get(target, 0) + 1
            
            # Главный концепт - тот, у которого больше всего связей
            main_concept_id = max(concept_connections.items(), key=lambda x: x[1])[0] if concept_connections else (concepts[0].get("id", "") if concepts else "")
            
            # Строим граф связей для определения уровней
            adjacency = {}
            for rel in relationships:
                source = rel.get("source", "")
                target = rel.get("target", "")
                if source not in adjacency:
                    adjacency[source] = []
                if target not in adjacency:
                    adjacency[target] = []
                adjacency[source].append(target)
                adjacency[target].append(source)
            
            # BFS для определения уровней от главного концепта
            node_levels = {}
            if main_concept_id and main_concept_id in adjacency:
                queue = [(main_concept_id, 0)]
                visited = {main_concept_id}
                while queue:
                    current, level = queue.pop(0)
                    node_levels[current] = level
                    for neighbor in adjacency.get(current, []):
                        if neighbor not in visited:
                            visited.add(neighbor)
                            queue.append((neighbor, level + 1))
            
            # Получаем все существующие узлы пользователя для сопоставления
            existing_nodes_result = session.run(
                """
                MATCH (n:Node {user_id: $user_id})
                RETURN n.id AS id, n.label AS label, n.summary AS summary,
                       n.knowledge_gaps AS knowledge_gaps, n.recommendations AS recommendations,
                       n.tags AS tags, n.has_gap AS has_gap, n.level AS level
                """,
                user_id=str(current_user.id)
            )
            existing_nodes = [dict(record) for record in existing_nodes_result]
            logger.info(f"Found {len(existing_nodes)} existing nodes for matching")
            
            # Создаем/обновляем узлы для каждого концепта
            for concept in concepts:
                concept_id = concept.get("id", "")
                label = concept.get("label", "")
                description = concept.get("description", "")
                knowledge_gaps = concept.get("knowledge_gaps", [])
                recommendations = concept.get("recommendations", [])
                concept_tags = tags  # Используем общие теги заметки
                
                # Нормализуем label для генерации стабильного ID
                normalized_label = normalize_for_id(label)
                stable_id = hashlib.md5(f"{normalized_label}_{current_user.id}".encode()).hexdigest()[:16]
                
                logger.debug(f"Processing concept: '{label}' -> normalized: '{normalized_label}' -> stable_id: {stable_id}")
                
                # Пытаемся найти существующий похожий узел (порог 0.9 для избежания ложных совпадений)
                matching_node = find_matching_node(label, existing_nodes, threshold=0.9)
                if not matching_node:
                    # Пробуем также найти по нормализованному ID
                    for existing_node in existing_nodes:
                        existing_id = existing_node.get("id", "")
                        if existing_id == stable_id:
                            logger.info(f"Found exact ID match: '{label}' -> node_id={stable_id}")
                            matching_node = (stable_id, 1.0)
                            break
                existing_node_data = None
                merged_data = None
                if matching_node:
                    matched_id, similarity = matching_node
                    logger.info(f"Matching existing node: '{label}' -> node_id={matched_id} (similarity={similarity:.2f})")
                    # Используем ID существующего узла
                    stable_id = matched_id
                    
                    # Находим данные существующего узла
                    existing_node_data = next((n for n in existing_nodes if n.get("id") == matched_id), None)
                    if existing_node_data:
                        # Объединяем данные
                        merged_data = merge_node_data(existing_node_data, {
                            "summary": description,
                            "knowledge_gaps": knowledge_gaps,
                            "recommendations": recommendations,
                            "tags": concept_tags
                        })
                        description = merged_data.get("summary", description)
                        knowledge_gaps = merged_data.get("knowledge_gaps", knowledge_gaps)
                        recommendations = merged_data.get("recommendations", recommendations)
                        concept_tags = merged_data.get("tags", concept_tags)
                
                # Определяем уровень узла
                level = node_levels.get(concept_id, 0)
                if concept_id == main_concept_id:
                    level = 0  # Главный концепт всегда уровень 0
                
                # Объединяем пробелы и рекомендации
                if matching_node and existing_node_data and 'merged_data' in locals() and merged_data:
                    # Используем объединенные данные из merged_data
                    merged_gaps = merged_data.get("knowledge_gaps", knowledge_gaps)
                    merged_recs = merged_data.get("recommendations", recommendations)
                else:
                    # Получаем существующие пробелы и рекомендации из БД
                    existing_node = session.run(
                        """
                        MATCH (n:Node {id: $id, user_id: $user_id})
                        RETURN n.knowledge_gaps AS gaps, n.recommendations AS recs
                        """,
                        id=stable_id,
                        user_id=str(current_user.id)
                    ).single()
                    
                    existing_gaps = existing_node["gaps"] if existing_node and existing_node["gaps"] else []
                    existing_recs = existing_node["recs"] if existing_node and existing_node["recs"] else []
                    
                    # Объединяем пробелы и рекомендации (убираем дубликаты)
                    merged_gaps = list(set(existing_gaps + knowledge_gaps))
                    merged_recs = list(set(existing_recs + recommendations))
                
                # Проверяем, есть ли пробелы знаний
                has_gap = len(merged_gaps) > 0 or len(merged_recs) > 0
                
                # Upsert узел в Neo4j
                result = session.run(
                    """
                    MERGE (n:Node {id: $id, user_id: $user_id})
                    ON CREATE SET 
                        n.label = $label,
                        n.summary = $description,
                        n.tags = $tags,
                        n.created_at = datetime(),
                        n.has_gap = $has_gap,
                        n.level = $level,
                        n.knowledge_gaps = $gaps,
                        n.recommendations = $recs
                    ON MATCH SET
                        n.summary = CASE WHEN n.summary IS NULL OR n.summary = '' THEN $description ELSE n.summary END,
                        n.updated_at = datetime(),
                        n.has_gap = CASE WHEN size($gaps) > 0 OR size($recs) > 0 THEN true ELSE n.has_gap END,
                        n.knowledge_gaps = $gaps,
                        n.recommendations = $recs,
                        n.level = CASE WHEN $level < n.level OR n.level IS NULL THEN $level ELSE n.level END
                    WITH n
                    OPTIONAL MATCH (note:Note {id: $note_id}) 
                    WHERE $note_id IS NOT NULL
                    FOREACH(_ IN CASE WHEN note IS NOT NULL THEN [1] ELSE [] END |
                        MERGE (n)-[:MENTIONED_IN]->(note)
                    )
                    RETURN n
                    """,
                    id=stable_id,
                    user_id=str(current_user.id),
                    label=label,
                    description=description,
                    tags=concept_tags,
                    note_id=note_id,
                    has_gap=has_gap,
                    level=level,
                    gaps=merged_gaps,
                    recs=merged_recs
                )
                
                node_id_map[concept_id] = stable_id
                created_nodes.append({
                    "id": stable_id,
                    "label": label,
                    "summary": description,
                    "has_gap": has_gap,
                    "level": level,
                    "tags": concept_tags,
                    "knowledge_gaps": merged_gaps,
                    "recommendations": merged_recs
                })
            
            # Создаем связи между узлами
            links = []
            for rel in relationships:
                source_concept_id = rel.get("source", "")
                target_concept_id = rel.get("target", "")
                rel_type = rel.get("type", "related_to")
                rel_desc = rel.get("description", "")
                
                source_id = node_id_map.get(source_concept_id)
                target_id = node_id_map.get(target_concept_id)
                
                if source_id and target_id:
                    session.run(
                        """
                        MATCH (a:Node {id: $source_id, user_id: $user_id})
                        MATCH (b:Node {id: $target_id, user_id: $user_id})
                        MERGE (a)-[r:RELATED {type: $rel_type}]->(b)
                        ON CREATE SET r.description = $description
                        """,
                        source_id=source_id,
                        target_id=target_id,
                        user_id=str(current_user.id),
                        rel_type=rel_type,
                        description=rel_desc
                    )
                    links.append({
                        "source": source_id,
                        "target": target_id,
                        "relation": rel_type
                    })
            
            # Эволюция узлов: если у узла первого уровня большая подветка, превращаем его в центральный
            for node_id in node_id_map.values():
                # Подсчитываем количество связей (исходящих и входящих)
                result = session.run(
                    """
                    MATCH (n:Node {id: $node_id, user_id: $user_id})-[r:RELATED]-(connected:Node {user_id: $user_id})
                    WITH n, count(r) AS connection_count
                    MATCH (n)-[out:RELATED]->(outgoing:Node {user_id: $user_id})
                    WITH n, connection_count, count(out) AS outgoing_count
                    RETURN n.level AS level, connection_count, outgoing_count
                    """,
                    node_id=node_id,
                    user_id=str(current_user.id)
                )
                record = result.single()
                if record:
                    connection_count = record["connection_count"] or 0
                    outgoing_count = record["outgoing_count"] or 0
                    current_level = record["level"] or 0
                    
                    # Если у узла первого уровня больше 5 связей или больше 3 исходящих, делаем его центральным
                    if current_level == 1 and (connection_count >= 5 or outgoing_count >= 3):
                        session.run(
                            """
                            MATCH (n:Node {id: $node_id, user_id: $user_id})
                            SET n.level = 0
                            """,
                            node_id=node_id,
                            user_id=str(current_user.id)
                        )
                        logger.info(f"Node {node_id} evolved to level 0 (central) due to {connection_count} connections")
            
        logger.info(f"Created {len(created_nodes)} nodes and {len(links)} links")
        
    except Exception as e:
        logger.error(f"Failed to create graph: {e}")
        logger.exception(e)
        created_nodes = []
        links = []

    return {
        "main_topic": main_topic,
        "tags": tags if tags else ["общее"],
        "nodes": created_nodes,
        "links": links,
        "model_used": model_used
    }


@router.get("/graph/{node_id}", response_model=GraphData)
def get_node_graph(
    node_id: str,
    current_user: User = Depends(get_current_user)
):
    """Получает граф вокруг узла"""
    driver = get_neo4j_driver()
    with driver.session() as session:
        records = session.run(
            """
            MATCH (a:Node {id: $id, user_id: $user_id})-[r:RELATED|contains|related_to]-(b:Node {user_id: $user_id})
            RETURN a, r, b
            LIMIT 50
            """,
            id=node_id,
            user_id=str(current_user.id)
        )
        data = graph_from_cypher_records(records)
    return data


@router.get("/node/{node_id}/notes")
def get_node_notes(
    node_id: str,
    current_user: User = Depends(get_current_user)
):
    """Получает список заметок, в которых упоминается узел"""
    driver = get_neo4j_driver()
    with driver.session() as session:
        result = session.run(
            """
            MATCH (n:Node {id: $node_id, user_id: $user_id})-[:MENTIONED_IN]->(note:Note)
            RETURN note.id AS id, note.title AS title, note.created_at AS created_at
            ORDER BY note.created_at DESC
            """,
            node_id=node_id,
            user_id=str(current_user.id)
        )
        notes = [{"id": r["id"], "title": r["title"], "created_at": str(r["created_at"])} for r in result]
    return {"notes": notes}


@router.patch("/node/{node_id}")
def update_node(
    node_id: str,
    label: str = None,
    summary: str = None,
    current_user: User = Depends(get_current_user)
):
    """Обновляет узел графа"""
    driver = get_neo4j_driver()
    updates = []
    params = {"node_id": node_id, "user_id": str(current_user.id)}
    
    if label is not None:
        updates.append("n.label = $label")
        params["label"] = label
    if summary is not None:
        updates.append("n.summary = $summary")
        params["summary"] = summary
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    with driver.session() as session:
        result = session.run(
            f"""
            MATCH (n:Node {{id: $node_id, user_id: $user_id}})
            SET {', '.join(updates)}, n.updated_at = datetime()
            RETURN n
            """,
            **params
        )
        if not result.single():
            raise HTTPException(status_code=404, detail="Node not found")
    
    return {"status": "updated", "node_id": node_id}


@router.delete("/node/{node_id}")
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
