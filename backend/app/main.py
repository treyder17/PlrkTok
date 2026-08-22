import asyncio
import os
import secrets
from fastapi import FastAPI, Depends, Query, Header, HTTPException
from sqlalchemy import or_
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from .database import get_db, init_db, SessionLocal
from .models import Listing, SavedItem, Like, ShareEvent
from .algorithm import build_feed, record_interaction, count_engagement
from .playerok_sync import sync_all_categories

SYNC_INTERVAL_SECONDS = 600  # alle 10 Minuten neu von Playerok laden

# Schutz für POST /sync: ohne den wäre der Endpoint öffentlich spambar und würde
# uns in Playeroks Rate-Limit fahren. Ist SYNC_TOKEN nicht gesetzt, ist der
# Endpoint komplett dicht (der automatische periodic_sync läuft trotzdem weiter).
SYNC_TOKEN = os.environ.get("SYNC_TOKEN")

app = FastAPI(title="Playerok Feed API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # für Dev; später einschränken
    allow_methods=["*"],
    allow_headers=["*"],
)


def _run_sync_blocking() -> int:
    db = SessionLocal()
    try:
        return sync_all_categories(db)
    finally:
        db.close()


async def periodic_sync():
    while True:
        try:
            # sync_all_categories ist blockierend (requests + time.sleep). Direkt im
            # Event-Loop aufgerufen würde es die komplette API minutenlang einfrieren
            # (Railway-Healthcheck schlägt dann fehl) -> in einen Thread auslagern.
            new_count = await asyncio.to_thread(_run_sync_blocking)
            print(f"[sync] {new_count} neue Angebote")
        except Exception as e:
            print(f"[sync] Fehler: {e}")
        await asyncio.sleep(SYNC_INTERVAL_SECONDS)


@app.on_event("startup")
def on_startup():
    init_db()
    asyncio.create_task(periodic_sync())


class ListingOut(BaseModel):
    id: str
    title: str
    description: Optional[str]
    price: float
    currency: str
    category: str
    image_url: Optional[str]
    seller_username: Optional[str]
    profile_url: str
    # Reichweite ueber alle PlrkTok-Nutzer. Kein comment_count: Playerok hat
    # keine Kommentare an Angeboten, ein Zaehler waere dauerhaft 0.
    like_count: int = 0
    save_count: int = 0
    share_count: int = 0

    class Config:
        from_attributes = True


class InteractionIn(BaseModel):
    user_id: str
    listing_id: str
    action: str  # "view" | "skip" | "like" | "profile_tap"
    dwell_time_ms: int = 0


@app.get("/feed", response_model=list[ListingOut])
def get_feed(
    user_id: str = Query(...),
    exclude: str = Query("", description="Komma-separierte Liste bereits gesehener IDs"),
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db),
):
    exclude_ids = [x for x in exclude.split(",") if x]
    listings = build_feed(db, user_id, exclude_ids, limit)
    return with_counts(db, listings)


@app.post("/interact")
def post_interaction(payload: InteractionIn, db: Session = Depends(get_db)):
    listing = db.query(Listing).filter(Listing.id == payload.listing_id).first()
    if not listing:
        return {"ok": False, "error": "listing not found"}
    record_interaction(db, payload.user_id, listing, payload.action, payload.dwell_time_ms)
    return {"ok": True}


def with_counts(db: Session, listings: list[Listing]) -> list[dict]:
    """Angebote in Ausgabe-Dicts mit Reichweitenzahlen verwandeln."""
    counts = count_engagement(db, [l.id for l in listings])
    out = []
    for l in listings:
        c = counts.get(l.id, {})
        out.append(
            {
                "id": l.id,
                "title": l.title,
                "description": l.description,
                "price": l.price,
                "currency": l.currency,
                "category": l.category,
                "image_url": l.image_url,
                "seller_username": l.seller_username,
                "profile_url": l.profile_url,
                "like_count": c.get("like_count", 0),
                "save_count": c.get("save_count", 0),
                "share_count": c.get("share_count", 0),
            }
        )
    return out


class LikeIn(BaseModel):
    user_id: str
    listing_id: str
    liked: bool


@app.post("/like")
def post_like(payload: LikeIn, db: Session = Depends(get_db)):
    """Like setzen oder zuruecknehmen. Idempotent wie /save."""
    listing = db.query(Listing).filter(Listing.id == payload.listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="listing not found")

    existing = (
        db.query(Like)
        .filter(Like.user_id == payload.user_id, Like.listing_id == payload.listing_id)
        .first()
    )

    if payload.liked and existing is None:
        db.add(Like(user_id=payload.user_id, listing_id=payload.listing_id))
        record_interaction(db, payload.user_id, listing, "like", 0)
    elif not payload.liked and existing is not None:
        db.delete(existing)

    db.commit()
    return {"ok": True, "liked": payload.liked}


@app.get("/liked/ids")
def get_liked_ids(user_id: str = Query(...), db: Session = Depends(get_db)):
    rows = db.query(Like.listing_id).filter(Like.user_id == user_id).all()
    return {"ids": [r[0] for r in rows]}


class ShareIn(BaseModel):
    user_id: str
    listing_id: str


@app.post("/share")
def post_share(payload: ShareIn, db: Session = Depends(get_db)):
    """Teilen ist ein Ereignis, kein Zustand - mehrfach teilen zaehlt mehrfach."""
    listing = db.query(Listing).filter(Listing.id == payload.listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="listing not found")

    db.add(ShareEvent(user_id=payload.user_id, listing_id=payload.listing_id))
    record_interaction(db, payload.user_id, listing, "share", 0)
    db.commit()
    return {"ok": True}


@app.get("/search", response_model=list[ListingOut])
def search(
    q: str = Query(..., min_length=1),
    limit: int = Query(30, le=50),
    db: Session = Depends(get_db),
):
    """Volltextsuche ueber Titel und Kategorie.

    ilike statt like, damit die Suche unabhaengig von Gross- und Kleinschreibung
    funktioniert - auf SQLite wie auf Postgres.
    """
    needle = f"%{q.strip()}%"
    rows = (
        db.query(Listing)
        .filter(or_(Listing.title.ilike(needle), Listing.category.ilike(needle)))
        .order_by(Listing.popularity_score.desc())
        .limit(limit)
        .all()
    )
    return with_counts(db, rows)


class SaveIn(BaseModel):
    user_id: str
    listing_id: str
    saved: bool


@app.post("/save")
def post_save(payload: SaveIn, db: Session = Depends(get_db)):
    """Angebot merken oder Merken zuruecknehmen. Idempotent - zweimal dasselbe
    Setzen aendert nichts, damit ein doppelter Tap keinen Fehler wirft."""
    listing = db.query(Listing).filter(Listing.id == payload.listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="listing not found")

    existing = (
        db.query(SavedItem)
        .filter(SavedItem.user_id == payload.user_id, SavedItem.listing_id == payload.listing_id)
        .first()
    )

    if payload.saved and existing is None:
        db.add(SavedItem(user_id=payload.user_id, listing_id=payload.listing_id))
        # Eigenes Signal, nicht als "like" verbuchen: sonst zaehlte jedes Merken
        # zusaetzlich als Like und die Like-Zahl waere zu hoch.
        record_interaction(db, payload.user_id, listing, "save", 0)
    elif not payload.saved and existing is not None:
        db.delete(existing)

    db.commit()
    return {"ok": True, "saved": payload.saved}


@app.get("/saved", response_model=list[ListingOut])
def get_saved(user_id: str = Query(...), db: Session = Depends(get_db)):
    """Alle gemerkten Angebote eines Users, neueste zuerst."""
    rows = (
        db.query(Listing)
        .join(SavedItem, SavedItem.listing_id == Listing.id)
        .filter(SavedItem.user_id == user_id)
        .order_by(SavedItem.created_at.desc())
        .all()
    )
    return with_counts(db, rows)


@app.get("/saved/ids")
def get_saved_ids(user_id: str = Query(...), db: Session = Depends(get_db)):
    """Nur die IDs - die App braucht das beim Start, um die Merk-Knoepfe
    korrekt gefuellt zu zeichnen, ohne alle Angebote nachzuladen."""
    rows = db.query(SavedItem.listing_id).filter(SavedItem.user_id == user_id).all()
    return {"ids": [r[0] for r in rows]}


def require_sync_token(x_sync_token: Optional[str] = Header(None)):
    """Vergleich per compare_digest, damit das Token nicht über Antwortzeiten erratbar ist."""
    if not SYNC_TOKEN:
        raise HTTPException(
            status_code=503,
            detail="Sync-Endpoint deaktiviert: SYNC_TOKEN ist auf dem Server nicht gesetzt.",
        )
    if not x_sync_token or not secrets.compare_digest(x_sync_token, SYNC_TOKEN):
        raise HTTPException(status_code=401, detail="Ungültiges oder fehlendes X-Sync-Token.")


@app.post("/sync", dependencies=[Depends(require_sync_token)])
def trigger_sync(db: Session = Depends(get_db)):
    """Manuell Angebote von Playerok nachladen. Braucht den Header X-Sync-Token."""
    new_count = sync_all_categories(db)
    return {"ok": True, "new_listings": new_count}


@app.get("/health")
def health():
    return {"status": "ok"}
