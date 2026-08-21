"""
Datenmodelle für den Playerok-Feed.
"""
from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import declarative_base
from datetime import datetime

Base = declarative_base()


class Listing(Base):
    """Ein einzelnes Angebot, gecached von Playerok."""
    __tablename__ = "listings"

    id = Column(String, primary_key=True)  # Playerok item id
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    price = Column(Float, nullable=False)
    currency = Column(String, default="RUB")
    category = Column(String, index=True)  # z.B. "brawl_stars", "roblox", ...
    image_url = Column(String, nullable=True)
    seller_username = Column(String, index=True)
    seller_id = Column(String, index=True)
    profile_url = Column(String, nullable=False)  # Link zu playerok.com/...
    created_at = Column(DateTime, default=datetime.utcnow)
    fetched_at = Column(DateTime, default=datetime.utcnow)
    popularity_score = Column(Float, default=0.0)  # z.B. Views/Likes von Playerok, falls verfügbar


class Interaction(Base):
    """Trackt User-Verhalten für den Algorithmus."""
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, index=True, nullable=False)
    listing_id = Column(String, ForeignKey("listings.id"), nullable=False)
    category = Column(String, index=True)
    action = Column(String)  # "view" | "skip" | "like" | "profile_tap"
    dwell_time_ms = Column(Integer, default=0)  # wie lange angeschaut
    created_at = Column(DateTime, default=datetime.utcnow)


class SavedItem(Base):
    """Vom User gemerktes Angebot. Eigene Tabelle statt eines Interaction-Eintrags,
    weil Merken ein Zustand ist (an/aus) und kein Ereignis - mit Interactions
    muesste man sonst das jeweils letzte Ereignis pro Angebot auswerten."""
    __tablename__ = "saved_items"
    __table_args__ = (UniqueConstraint("user_id", "listing_id", name="uq_saved_user_listing"),)

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, index=True, nullable=False)
    listing_id = Column(String, ForeignKey("listings.id"), index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class UserPreference(Base):
    """Aggregierte Kategorie-Gewichte pro User, wird vom Algorithmus aktualisiert."""
    __tablename__ = "user_preferences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, index=True, nullable=False)
    category = Column(String, index=True, nullable=False)
    weight = Column(Float, default=1.0)  # >1 = mag User, <1 = mag User nicht
    updated_at = Column(DateTime, default=datetime.utcnow)
