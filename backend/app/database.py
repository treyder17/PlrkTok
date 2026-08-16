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
# pool_pre_ping: zwischen zwei Sync-Zyklen idlet der Dienst 10 Minuten. Postgres bzw.
# Railways Netzwerkschicht schliessen solche Verbindungen serverseitig, die bleiben
# aber als tote Eintraege im Pool liegen -> sporadische 500er, die sich nicht
# reproduzieren lassen. Der Pre-Ping wirft tote Verbindungen vorher weg.
engine = create_engine(DATABASE_URL, connect_args=connect_args, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
