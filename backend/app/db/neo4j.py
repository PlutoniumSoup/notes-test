from neo4j import GraphDatabase, Driver
from neo4j.exceptions import ServiceUnavailable
from ..core.config import get_settings
from functools import lru_cache
import time
import logging

logger = logging.getLogger(__name__)


@lru_cache
def get_neo4j_driver() -> Driver:
    s = get_settings()
    return GraphDatabase.driver(s.neo4j_uri, auth=(s.neo4j_user, s.neo4j_password))


def init_neo4j_schema(max_retries=5, retry_delay=2):
    """
    Инициализирует схему Neo4j с повторными попытками подключения
    """
    for attempt in range(max_retries):
        try:
            driver = get_neo4j_driver()
            # Проверяем доступность Neo4j
            driver.verify_connectivity()
            with driver.session() as session:
                session.run("CREATE CONSTRAINT IF NOT EXISTS FOR (n:Node) REQUIRE n.id IS UNIQUE")
            logger.info("Neo4j schema initialized successfully")
            return
        except (ServiceUnavailable, Exception) as e:
            if attempt < max_retries - 1:
                logger.warning(f"Neo4j connection failed (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {retry_delay}s...")
                time.sleep(retry_delay)
            else:
                logger.error(f"Failed to connect to Neo4j after {max_retries} attempts: {e}")
                logger.warning("Application will continue without Neo4j. Some features may not work.")
