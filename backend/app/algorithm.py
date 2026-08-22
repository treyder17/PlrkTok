"""
Feed-Algorithmus v1: gewichtetes Scoring, kein ML nötig.

Score = Kategorie-Präferenz * (Recency-Faktor + Popularity-Faktor)

- Kategorie-Präferenz kommt aus UserPreference (lernt aus Interactions)
- Recency: neuere Angebote werden leicht bevorzugt
- Popularity: falls Playerok Views/Likes exposed, fließt das mit ein
- Explore-Anteil: ein kleiner Teil des Feeds sind zufällige Angebote aus
  Kategorien, die der User noch nicht gesehen hat (Cold-Start / Diversität)
"""
import random
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from .models import Listing, UserPreference, Interaction

EXPLORE_RATIO = 0.2  # 20% des Feeds sind "Entdecken"-Angebote


def get_user_weights(db: Session, user_id: str) -> dict[str, float]:
    prefs = db.query(UserPreference).filter(UserPreference.user_id == user_id).all()
    return {p.category: p.weight for p in prefs}


def recency_factor(created_at: datetime) -> float:
    if created_at is None:
        return 0.5
    age_hours = max((datetime.utcnow() - created_at).total_seconds() / 3600, 0.1)
    # neuere Angebote -> höherer Score, flacht mit der Zeit ab
    return 1.0 / (1.0 + age_hours / 24)


def score_listing(listing: Listing, weights: dict[str, float]) -> float:
    cat_weight = weights.get(listing.category, 1.0)  # neutral, wenn unbekannt
    pop = listing.popularity_score or 0.0
    rec = recency_factor(listing.created_at)
    return cat_weight * (1.0 + rec + min(pop / 100, 2.0))


def build_feed(db: Session, user_id: str, exclude_ids: list[str], limit: int = 20) -> list[Listing]:
    """Baut die nächste Batch für den Feed. exclude_ids = bereits gesehene Angebote."""
    weights = get_user_weights(db, user_id)

    query = db.query(Listing)
    if exclude_ids:
        query = query.filter(~Listing.id.in_(exclude_ids))

    candidates = query.limit(500).all()  # Kandidaten-Pool, dann re-ranken
    if not candidates:
        return []

    n_explore = max(int(limit * EXPLORE_RATIO), 1)
    n_personalized = limit - n_explore

    ranked = sorted(candidates, key=lambda l: score_listing(l, weights), reverse=True)
    personalized = ranked[:n_personalized]

    remaining = [l for l in candidates if l not in personalized]
    explore = random.sample(remaining, min(n_explore, len(remaining)))

    feed = personalized + explore
    random.shuffle(feed)  # damit "explore" nicht immer am Ende klebt
    return feed[:limit]


def count_engagement(db: Session, listing_ids: list[str]) -> dict[str, dict[str, int]]:
    """
    Like-, Merk- und Teilen-Zahlen ueber alle Nutzer, fuer die uebergebenen
    Angebote.

    Drei gruppierte Abfragen fuer die ganze Seite, nicht drei pro Angebot -
    sonst waeren es bei 20 Angeboten 60 Abfragen pro Feed-Aufruf.
    """
    from .models import Like, SavedItem, ShareEvent

    counts: dict[str, dict[str, int]] = {
        lid: {"like_count": 0, "save_count": 0, "share_count": 0} for lid in listing_ids
    }
    if not listing_ids:
        return counts

    for model, key in ((Like, "like_count"), (SavedItem, "save_count"), (ShareEvent, "share_count")):
        rows = (
            db.query(model.listing_id, func.count(model.id))
            .filter(model.listing_id.in_(listing_ids))
            .group_by(model.listing_id)
            .all()
        )
        for listing_id, n in rows:
            if listing_id in counts:
                counts[listing_id][key] = n

    return counts


def record_interaction(db: Session, user_id: str, listing: Listing, action: str, dwell_time_ms: int = 0):
    interaction = Interaction(
        user_id=user_id,
        listing_id=listing.id,
        category=listing.category,
        action=action,
        dwell_time_ms=dwell_time_ms,
    )
    db.add(interaction)

    pref = (
        db.query(UserPreference)
        .filter(UserPreference.user_id == user_id, UserPreference.category == listing.category)
        .first()
    )
    if pref is None:
        pref = UserPreference(user_id=user_id, category=listing.category, weight=1.0)
        db.add(pref)

    # Simple Gewichts-Anpassung je nach Aktion
    delta = {
        "like": 0.15,
        "save": 0.18,      # Merken ist ein etwas staerkeres Signal als ein Like
        "share": 0.2,
        "profile_tap": 0.2,
        "view": 0.02,
        "skip": -0.08,
    }.get(action, 0.0)

    # Dwell time boost: lang angeschaut = interessiert
    if dwell_time_ms > 4000:
        delta += 0.05

    pref.weight = max(0.1, min(pref.weight + delta, 5.0))  # clamp
    pref.updated_at = datetime.utcnow()

    db.commit()
