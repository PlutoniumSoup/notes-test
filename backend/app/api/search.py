from fastapi import APIRouter, Query
from typing import List
from ..db.elastic import get_es
from ..core.config import get_settings
from ..models.schemas import NoteOut, GraphNode


router = APIRouter(prefix="/search", tags=["search"])


@router.get("/notes", response_model=List[NoteOut])
def search_notes(q: str = Query("")):
    if not q or not q.strip():
        return []
    es = get_es()
    s = get_settings()
    res = es.search(index=s.elastic_index_notes, body={
        "query": {
            "multi_match": {
                "query": q,
                "fields": ["title^2", "content", "tags"]
            }
        },
        "size": 20
    })
    results: List[NoteOut] = []
    for hit in res["hits"]["hits"]:
        src = hit["_source"]
        results.append(NoteOut(**src))
    return results


@router.get("/nodes", response_model=List[GraphNode])
def search_nodes(q: str = Query("")):
    if not q or not q.strip():
        return []
    es = get_es()
    s = get_settings()
    res = es.search(index=s.elastic_index_nodes, body={
        "query": {
            "multi_match": {
                "query": q,
                "fields": ["label^2", "summary", "tags"]
            }
        },
        "size": 20
    })
    results: List[GraphNode] = []
    for hit in res["hits"]["hits"]:
        src = hit["_source"]
        results.append(GraphNode(**src))
    return results
