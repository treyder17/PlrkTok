import asyncio
import os
import secrets
from fastapi import FastAPI, Depends, Query, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from .database import get_db, init_db, SessionLocal
from .models import Listing
from .algorithm import build_feed, record_interaction
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
    return listings


@app.post("/interact")
def post_interaction(payload: InteractionIn, db: Session = Depends(get_db)):
    listing = db.query(Listing).filter(Listing.id == payload.listing_id).first()
    if not listing:
        return {"ok": False, "error": "listing not found"}
    record_interaction(db, payload.user_id, listing, payload.action, payload.dwell_time_ms)
    return {"ok": True}


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
