from fastapi import APIRouter, HTTPException, Query
from typing import List
from ..services.wikipedia import (
    import_wikipedia_article,
    import_wikipedia_articles_by_keywords,
    populate_knowledge_base_from_keywords,
    search_wikipedia_articles,
    fetch_wikipedia_article
)
from ..models.schemas import GraphNode
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/wikipedia", tags=["wikipedia"])


@router.post("/import/article")
def import_article(title: str = Query(..., min_length=1)):
    """
    Импортирует одну статью из Wikipedia по названию
    """
    node = import_wikipedia_article(title)
    if not node:
        raise HTTPException(status_code=404, detail=f"Article '{title}' not found")
    return {
        "id": node.id,
        "label": node.label,
        "summary": node.summary,
        "tags": node.tags
    }


@router.post("/import/keywords")
def import_by_keywords(keywords: List[str], max_articles: int = Query(20, ge=1, le=100)):
    """
    Импортирует статьи из Wikipedia по ключевым словам
    """
    if not keywords:
        raise HTTPException(status_code=400, detail="Keywords list is empty")
    
    nodes = populate_knowledge_base_from_keywords(keywords, max_articles)
    return {
        "imported": len(nodes),
        "articles": [
            {
                "id": n.id,
                "label": n.label,
                "summary": n.summary[:200] + "..." if len(n.summary) > 200 else n.summary,
                "tags": n.tags
            }
            for n in nodes
        ]
    }


@router.get("/search")
def search_articles(q: str = Query(..., min_length=1), limit: int = Query(10, ge=1, le=50)):
    """
    Ищет статьи в Wikipedia по запросу
    """
    results = search_wikipedia_articles(q, limit)
    return {
        "query": q,
        "count": len(results),
        "articles": [
            {
                "title": r.get("title", ""),
                "extract": r.get("extract", "")[:200] + "..." if len(r.get("extract", "")) > 200 else r.get("extract", ""),
                "thumbnail": r.get("thumbnail", {}).get("source", "")
            }
            for r in results
        ]
    }


@router.get("/article/{title}")
def get_article(title: str):
    """
    Получает статью из Wikipedia по названию
    """
    article = fetch_wikipedia_article(title)
    if not article:
        raise HTTPException(status_code=404, detail=f"Article '{title}' not found")
    return article

