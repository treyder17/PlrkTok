import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base

# Railway setzt automatisch DATABASE_URL, wenn du ein Postgres-Addon hinzufügst.
# Lokal (ohne diese Env-Var) fällt es auf SQLite zurück.
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./feed.db")

# Railway/Heroku liefern manchmal "postgres://" statt "postgresql://" - SQLAlchemy braucht Letzteres
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
