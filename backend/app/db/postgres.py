from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from ..core.config import get_settings


class Base(DeclarativeBase):
    pass


def _build_postgres_url() -> str:
    s = get_settings()
    return (
        f"postgresql+psycopg2://{s.postgres_user}:{s.postgres_password}"
        f"@{s.postgres_host}:{s.postgres_port}/{s.postgres_db}"
    )


engine = create_engine(_build_postgres_url(), pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_db_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
