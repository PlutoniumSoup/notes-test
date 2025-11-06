from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import orjson
import logging
from .core.config import get_settings
from .db.postgres import Base, engine
from .db.elastic import ensure_indices
from .db.neo4j import init_neo4j_schema
from .api.notes import router as notes_router
from .api.graph import router as graph_router
from .api.search import router as search_router
from .api.analyze import router as analyze_router
from .api.wikipedia import router as wikipedia_router

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def orjson_dumps(v, *, default):
    return orjson.dumps(v, default=default).decode()


def create_app() -> FastAPI:
    s = get_settings()
    app = FastAPI(title=s.app_name)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.on_event("startup")
    def on_startup():
        try:
            # Инициализация Postgres
            try:
                Base.metadata.create_all(bind=engine)
                logger.info("PostgreSQL initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize PostgreSQL: {e}")
                logger.warning("Application will continue without PostgreSQL. Some features may not work.")
            
            # Инициализация Elasticsearch (с повторными попытками)
            ensure_indices()
            
            # Инициализация Neo4j (с повторными попытками)
            init_neo4j_schema()
            
            logger.info("Application startup completed")
        except Exception as e:
            logger.error(f"Startup error: {e}")
            # Приложение продолжит работу даже если некоторые сервисы недоступны

    app.include_router(notes_router)
    app.include_router(graph_router)
    app.include_router(search_router)
    app.include_router(analyze_router)
    app.include_router(wikipedia_router)
    return app


app = create_app()
