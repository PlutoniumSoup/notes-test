import requests
import time
from typing import Dict, List, Optional
from ..db.neo4j import get_neo4j_driver
from ..db.elastic import get_es
from ..core.config import get_settings
from ..models.schemas import GraphNode, GraphLink
from ..services.knowledge import upsert_node, link_nodes
import hashlib
import logging

logger = logging.getLogger(__name__)

# Wikipedia API endpoint
WIKIPEDIA_API_URL = "https://ru.wikipedia.org/api/rest_v1/page/summary"
WIKIPEDIA_SEARCH_URL = "https://ru.wikipedia.org/api/rest_v1/page/search"


def fetch_wikipedia_article(title: str) -> Optional[Dict]:
    """
    Получает статью из Wikipedia по названию
    """
    try:
        url = f"{WIKIPEDIA_API_URL}/{title}"
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            return {
                "title": data.get("title", title),
                "extract": data.get("extract", ""),
                "content_urls": data.get("content_urls", {}).get("desktop", {}).get("page", ""),
                "thumbnail": data.get("thumbnail", {}).get("source", ""),
            }
        else:
            logger.warning(f"Wikipedia API returned {response.status_code} for {title}")
            return None
    except Exception as e:
        logger.error(f"Error fetching Wikipedia article {title}: {e}")
        return None


def search_wikipedia_articles(query: str, limit: int = 10) -> List[Dict]:
    """
    Ищет статьи в Wikipedia по запросу
    """
    try:
        url = f"{WIKIPEDIA_SEARCH_URL}/{query}"
        params = {"limit": limit}
        response = requests.get(url, params=params, timeout=10)
        if response.status_code == 200:
            data = response.json()
            return data.get("pages", [])
        else:
            logger.warning(f"Wikipedia search returned {response.status_code}")
            return []
    except Exception as e:
        logger.error(f"Error searching Wikipedia: {e}")
        return []


def create_node_from_wikipedia(title: str, extract: str, tags: List[str] = None) -> GraphNode:
    """
    Создает узел графа знаний из статьи Wikipedia
    """
    node_id = hashlib.md5(title.encode()).hexdigest()[:16]
    return GraphNode(
        id=f"wiki_{node_id}",
        label=title,
        summary=extract[:500] if len(extract) > 500 else extract,
        tags=tags or ["wikipedia"],
        has_gap=False
    )


def import_wikipedia_article(title: str) -> Optional[GraphNode]:
    """
    Импортирует одну статью из Wikipedia в граф знаний
    """
    article = fetch_wikipedia_article(title)
    if not article:
        return None
    
    node = create_node_from_wikipedia(
        article["title"],
        article["extract"],
        tags=["wikipedia"]
    )
    
    driver = get_neo4j_driver()
    es = get_es()
    s = get_settings()
    
    try:
        with driver.session() as session:
            upsert_node(session, node)
            
            # Индексируем в Elasticsearch
            es.index(index=s.elastic_index_nodes, id=node.id, document={
                "id": node.id,
                "label": node.label,
                "summary": node.summary,
                "tags": node.tags,
                "has_gap": node.has_gap
            })
        
        logger.info(f"Imported Wikipedia article: {title}")
        return node
    except Exception as e:
        logger.error(f"Error importing Wikipedia article {title}: {e}")
        return None


def import_wikipedia_articles_by_keywords(keywords: List[str], max_articles: int = 20) -> List[GraphNode]:
    """
    Импортирует статьи из Wikipedia по ключевым словам
    """
    imported_nodes = []
    seen_titles = set()
    
    for keyword in keywords[:10]:  # Ограничиваем количество ключевых слов
        if len(imported_nodes) >= max_articles:
            break
            
        # Ищем статьи по ключевому слову
        search_results = search_wikipedia_articles(keyword, limit=5)
        
        for result in search_results:
            if len(imported_nodes) >= max_articles:
                break
                
            title = result.get("title", "")
            if title in seen_titles:
                continue
            seen_titles.add(title)
            
            # Получаем полную статью
            article = fetch_wikipedia_article(title)
            if article and article.get("extract"):
                node = create_node_from_wikipedia(
                    article["title"],
                    article["extract"],
                    tags=["wikipedia", keyword.lower()]
                )
                
                driver = get_neo4j_driver()
                es = get_es()
                s = get_settings()
                
                try:
                    with driver.session() as session:
                        upsert_node(session, node)
                        
                        # Индексируем в Elasticsearch
                        es.index(index=s.elastic_index_nodes, id=node.id, document={
                            "id": node.id,
                            "label": node.label,
                            "summary": node.summary,
                            "tags": node.tags,
                            "has_gap": node.has_gap
                        })
                    
                    imported_nodes.append(node)
                    logger.info(f"Imported: {title}")
                    
                    # Небольшая задержка, чтобы не перегружать API
                    time.sleep(0.5)
                except Exception as e:
                    logger.error(f"Error importing {title}: {e}")
    
    return imported_nodes


def link_wikipedia_nodes(nodes: List[GraphNode]):
    """
    Создает связи между узлами Wikipedia на основе общих тегов
    """
    driver = get_neo4j_driver()
    
    with driver.session() as session:
        for i, node1 in enumerate(nodes):
            for node2 in nodes[i+1:]:
                # Связываем узлы, если у них есть общие теги
                common_tags = set(node1.tags) & set(node2.tags)
                if common_tags:
                    link_nodes(session, node1.id, node2.id, "related")
                    logger.debug(f"Linked {node1.label} <-> {node2.label}")


def populate_knowledge_base_from_keywords(keywords: List[str], max_articles: int = 20):
    """
    Заполняет базу знаний статьями из Wikipedia по ключевым словам
    """
    logger.info(f"Starting Wikipedia import for keywords: {keywords}")
    nodes = import_wikipedia_articles_by_keywords(keywords, max_articles)
    if nodes:
        link_wikipedia_nodes(nodes)
        logger.info(f"Imported {len(nodes)} articles from Wikipedia")
    return nodes

