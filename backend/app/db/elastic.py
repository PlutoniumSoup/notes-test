from elasticsearch import Elasticsearch
from elastic_transport import ConnectionError as ESConnectionError
from ..core.config import get_settings
from functools import lru_cache
import time
import logging

logger = logging.getLogger(__name__)


@lru_cache
def get_es() -> Elasticsearch:
    s = get_settings()
    return Elasticsearch(s.elasticsearch_url, request_timeout=5)


def ensure_indices(max_retries=5, retry_delay=2):
    """
    Создает индексы в Elasticsearch с повторными попытками подключения
    """
    s = get_settings()
    
    for attempt in range(max_retries):
        try:
            es = get_es()
            # Проверяем доступность Elasticsearch
            if not es.ping():
                raise ESConnectionError("Elasticsearch is not available")
            
            note_mapping = {
                "mappings": {
                    "properties": {
                        "id": {"type": "integer"},
                        "title": {"type": "text"},
                        "content": {"type": "text"},
                        "tags": {"type": "keyword"},
                    }
                }
            }

            node_mapping = {
                "mappings": {
                    "properties": {
                        "id": {"type": "keyword"},
                        "label": {"type": "text"},
                        "summary": {"type": "text"},
                        "tags": {"type": "keyword"},
                        "has_gap": {"type": "boolean"}
                    }
                }
            }

            if not es.indices.exists(index=s.elastic_index_notes):
                es.indices.create(index=s.elastic_index_notes, **note_mapping)
                logger.info(f"Created index: {s.elastic_index_notes}")
            
            if not es.indices.exists(index=s.elastic_index_nodes):
                es.indices.create(index=s.elastic_index_nodes, **node_mapping)
                logger.info(f"Created index: {s.elastic_index_nodes}")
            
            logger.info("Elasticsearch indices initialized successfully")
            return
            
        except (ESConnectionError, Exception) as e:
            if attempt < max_retries - 1:
                logger.warning(f"Elasticsearch connection failed (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
            else:
                logger.error(f"Failed to connect to Elasticsearch after {max_retries} attempts: {e}")
                logger.warning("Application will continue without Elasticsearch. Some features may not work.")
