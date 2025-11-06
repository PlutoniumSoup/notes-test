from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    app_name: str = "KnowYourPath API"
    environment: str = "development"

    api_host: str = "0.0.0.0"
    api_port: int = 8000

    postgres_user: str = "kyppg"
    postgres_password: str = "kyppg"
    postgres_db: str = "kyppg"
    postgres_host: str = "postgres"
    postgres_port: int = 5432

    neo4j_uri: str = "bolt://neo4j:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "neo4jpassword"

    elasticsearch_url: str = "http://elasticsearch:9200"
    elastic_index_notes: str = "notes"
    elastic_index_nodes: str = "nodes"

    google_genai_api_key: str = ""
    gemini_api_key: str = ""  # Альтернативное имя для совместимости

    class Config:
        env_file = ".env"
        case_sensitive = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
