"""
Zieht Angebote von Playerok über die echte playerokapi-Library und cached sie lokal.

Setup:
    pip install git+https://github.com/alleexxeeyy/PlayerokAPI.git

Auth: playerokapi braucht ein eingeloggtes Playerok-Konto (Token + ddg5-Cookie oder
vollständige Cookies + User-Agent), auch nur zum Lesen von Angeboten.
Setze die Umgebungsvariablen PLAYEROK_TOKEN und PLAYEROK_DDG5 (oder PLAYEROK_COOKIES),
sowie PLAYEROK_USER_AGENT, bevor du das Backend startest:

    export PLAYEROK_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    export PLAYEROK_DDG5="..."
    export PLAYEROK_USER_AGENT="Mozilla/5.0 ..."

Wie du an Token/ddg5 kommst: im Browser bei playerok.com eingeloggt, DevTools ->
Application/Storage -> Cookies -> "token" und "__ddg5_" kopieren.

WICHTIG: ddg5 "stirbt", wenn sich IP oder User-Agent ändern (siehe playerokapi-Doku).
Für Dauerbetrieb ggf. auf feste Server-IP + gleichbleibenden User-Agent achten.
"""
import os
import time
from datetime import datetime
from sqlalchemy.orm import Session
from .models import Listing

PLAYEROK_TOKEN = os.environ.get("PLAYEROK_TOKEN")
PLAYEROK_DDG5 = os.environ.get("PLAYEROK_DDG5")
PLAYEROK_COOKIES = os.environ.get("PLAYEROK_COOKIES")  # Alternative zu token+ddg5
PLAYEROK_USER_AGENT = os.environ.get(
    "PLAYEROK_USER_AGENT",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
)

# Game-Slugs, die reingezogen werden sollen ("Alle Kategorien" -> hier erweiterbar).
# Slugs entsprechen den Playerok-URL-Segmenten, z.B. playerok.com/games/brawl-stars
GAME_SLUGS = [
    "brawl-stars",
    "roblox",
    "steam",
    "genshin-impact",
    "valorant",
    "fortnite",
    "telegram",
    # ... weitere nach Bedarf ergänzen (Slugs ggf. anpassen, falls Playerok andere nutzt)
]

DELAY_BETWEEN_CATEGORIES = 3  # Sekunden Pause zwischen zwei Game-Slugs
DELAY_BETWEEN_SUBCATEGORIES = 1.5  # Sekunden Pause zwischen Unterkategorien eines Spiels

_account = None


def get_account():
    """Lazy-init des Playerok Accounts, damit das Backend auch ohne Credentials startet
    (nur /sync würde dann fehlschlagen, nicht die ganze App)."""
    global _account
    if _account is not None:
        return _account

    from playerokapi.account import Account

    if not PLAYEROK_TOKEN and not PLAYEROK_COOKIES:
        raise RuntimeError(
            "Keine Playerok-Zugangsdaten gesetzt. "
            "Setze PLAYEROK_TOKEN + PLAYEROK_DDG5 oder PLAYEROK_COOKIES als Umgebungsvariable."
        )

    if PLAYEROK_COOKIES:
        acc = Account(cookies=PLAYEROK_COOKIES, user_agent=PLAYEROK_USER_AGENT)
    else:
        acc = Account(token=PLAYEROK_TOKEN, ddg5=PLAYEROK_DDG5, user_agent=PLAYEROK_USER_AGENT)

    _account = acc.get()  # lädt Account-Daten (id, username, ...)
    return _account


def fetch_category_items(game_slug: str, limit: int = 50):
    """Zieht Items für ein Spiel/App über alle seine Kategorien."""
    acc = get_account()
    game = acc.get_game(slug=game_slug)

    items_out = []
    for i, category in enumerate(game.categories):
        remaining = limit - len(items_out)
        if remaining <= 0:
            break

        if i > 0:
            time.sleep(DELAY_BETWEEN_SUBCATEGORIES)

        item_list = acc.get_items(category_id=category.id, count=min(remaining, 24))

        for item in item_list.items:
            image_url = item.attachment.url if getattr(item, "attachment", None) else None
            seller_username = item.user.username if getattr(item, "user", None) else None

            items_out.append({
                "id": item.id,
                "title": item.name,
                "description": None,  # ItemProfile liefert i.d.R. keine volle Beschreibung, nur get_item(id) tut das
                "price": float(item.price),
                "currency": "RUB",
                "image_url": image_url,
                "seller_username": seller_username,
                "seller_id": item.user.id if getattr(item, "user", None) else None,
                "profile_url": f"https://playerok.com/item/{item.slug}",
                "popularity_score": item.views_counter or 0,
                "created_at_raw": item.created_at,
            })

    return items_out


def sync_category(db: Session, game_slug: str, limit: int = 50):
    items = fetch_category_items(game_slug, limit)
    new_count = 0

    for item in items:
        existing = db.query(Listing).filter(Listing.id == item["id"]).first()
        if existing:
            existing.price = item["price"]
            existing.popularity_score = item.get("popularity_score", existing.popularity_score)
            existing.fetched_at = datetime.utcnow()
        else:
            listing = Listing(
                id=item["id"],
                title=item["title"],
                description=item.get("description"),
                price=item["price"],
                currency=item.get("currency", "RUB"),
                category=game_slug,
                image_url=item.get("image_url"),
                seller_username=item.get("seller_username"),
                seller_id=item.get("seller_id"),
                profile_url=item["profile_url"],
                popularity_score=item.get("popularity_score", 0.0),
                created_at=datetime.utcnow(),
                fetched_at=datetime.utcnow(),
            )
            db.add(listing)
            new_count += 1

    db.commit()
    return new_count


def sync_all_categories(db: Session):
    total_new = 0
    errors = []
    for i, slug in enumerate(GAME_SLUGS):
        if i > 0:
            time.sleep(DELAY_BETWEEN_CATEGORIES)

        # Ein Retry-Versuch bei Rate-Limit- oder PersistedQuery-Fehlern
        for attempt in range(2):
            try:
                total_new += sync_category(db, slug)
                break
            except Exception as e:
                err_str = str(e)
                is_rate_limit = "попыток" in err_str or "429" in err_str
                is_persisted_query = "PersistedQueryNotFound" in err_str
                if (is_rate_limit or is_persisted_query) and attempt == 0:
                    time.sleep(10)
                    continue
                errors.append(f"{slug}: {e}")
                break
    if errors:
        print("Sync-Fehler:", errors)
    return total_new
