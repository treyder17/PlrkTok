# Playerok Feed – TikTok-Style Discovery App

## Struktur
```
playerok-feed/
├── backend/          FastAPI Backend (Feed-API, Algorithmus, Playerok-Sync)
│   └── app/
│       ├── main.py           API-Endpoints
│       ├── models.py         DB-Schema (Listing, Interaction, UserPreference)
│       ├── algorithm.py      Scoring-Logik für den Feed
│       ├── playerok_sync.py  Zieht Angebote von Playerok (aktuell Mock-Daten)
│       └── database.py
└── app-mobile/       React Native (Expo) Android App
    ├── App.tsx        Swipe-Feed (Snap-Scroll)
    ├── FeedCard.tsx    Einzelne Angebots-Karte
    └── api.ts          Backend-Kommunikation
```

## Backend starten

```bash
cd backend
pip install -r requirements.txt
```

### Playerok-Login einrichten (WICHTIG, ohne das bleibt der Feed leer)

Die echte `playerokapi` braucht ein eingeloggtes Playerok-Konto, auch nur zum
**Lesen** von Angeboten. So kommst du an die nötigen Werte:

1. Auf playerok.com in Chrome/Firefox einloggen
2. DevTools öffnen (F12) → Tab "Application" (Chrome) bzw. "Storage" (Firefox) → Cookies → playerok.com
3. Werte kopieren:
   - `token` → das ist dein `PLAYEROK_TOKEN`
   - `__ddg5_` → das ist dein `PLAYEROK_DDG5`
4. Als Umgebungsvariablen setzen, bevor du den Server startest:

```bash
export PLAYEROK_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export PLAYEROK_DDG5="der_ddg5_wert"
export PLAYEROK_USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"
```

Tipp: `PLAYEROK_USER_AGENT` sollte exakt der User-Agent deines Browsers sein, mit
dem du eingeloggt warst (Devtools → Network → irgendein Request → Request Headers).

**Wichtig:** `__ddg5_` verfällt, wenn sich deine IP oder dein User-Agent ändert.
Läuft der Server auf einer anderen Maschine/Cloud als dein Browser, muss er ggf.
über die gleiche IP raus (z.B. per Proxy) oder du musst den Cookie neu holen,
wenn der Sync anfängt zu failen.

Dann starten:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Testen: http://localhost:8000/health sollte `{"status": "ok"}` zeigen.

Der Server synct jetzt automatisch alle 5 Minuten neue Angebote im Hintergrund
(siehe `SYNC_INTERVAL_SECONDS` in `app/main.py`). Für einen sofortigen manuellen Sync:
```bash
curl -X POST http://localhost:8000/sync
```

Falls die Zugangsdaten fehlen oder falsch sind, läuft der Server trotzdem weiter
(der Sync loggt nur einen Fehler) – so kannst du das Backend auch ohne Playerok-Login
schon mal testen, nur bleibt der Feed dann leer.

## Game-Slugs anpassen

In `backend/app/playerok_sync.py`, Liste `GAME_SLUGS`: aktuell sind 7 Beispiel-Spiele
eingetragen. Die Slugs entsprechen den URL-Segmenten auf playerok.com
(z.B. `playerok.com/games/brawl-stars` → Slug `brawl-stars`). Ergänze hier alle
Spiele/Apps, die im Feed auftauchen sollen.

## Backend öffentlich deployen (Railway) – damit auch Freunde außerhalb deines WLANs die App nutzen können

1. Auf [railway.app](https://railway.app) einloggen, neues Projekt erstellen
2. "Deploy from GitHub repo" – dafür den `backend`-Ordner in ein GitHub-Repo pushen
   (oder Railway CLI: `railway up` direkt aus dem `backend`-Ordner, ohne GitHub)
3. Postgres-Addon hinzufügen: im Projekt "+ New" → "Database" → "PostgreSQL".
   Railway setzt automatisch `DATABASE_URL` für dein Backend-Service – nichts weiter zu tun,
   `database.py` erkennt das automatisch.
4. Environment-Variablen beim Backend-Service setzen (Settings → Variables):
   - `PLAYEROK_COOKIES` = dein kompletter Cookie-String
   - `PLAYEROK_USER_AGENT` = dein Browser-User-Agent
5. Nach dem Deploy bekommst du eine öffentliche URL wie `https://dein-projekt.up.railway.app`
6. In `app-mobile/api.ts`: `API_BASE` auf genau diese URL setzen (mit `https://`, ohne Port)

Danach läuft dein Backend 24/7 in der Cloud – jeder mit der APK kann die App nutzen,
unabhängig vom WLAN. Denk dran: dein Playerok-Token läuft nach ca. einer Woche ab
(siehe Kommentar in `playerok_sync.py`), dann musst du `PLAYEROK_COOKIES` in Railway
neu setzen.

## App starten (Android)

```bash
cd app-mobile
npm install
npx expo start --android
```

Voraussetzung: Android Studio + Emulator, oder Expo Go App auf echtem Handy
(dann `api.ts` API_BASE auf deine lokale IP ändern, nicht 10.0.2.2).

## Wie der Algorithmus funktioniert

- Jede Kategorie hat ein Gewicht pro User (Start: 1.0, neutral)
- Like/Profil-Tap erhöht das Gewicht der Kategorie, Skip senkt es
- Lange Betrachtungszeit (>4s) zählt als Interesse
- 20% des Feeds sind "Explore"-Angebote (zufällig, andere Kategorien), damit
  der Feed nicht in einer Bubble feststeckt und Cold-Start (neue User) gut
  funktioniert
- Scoring kombiniert: Kategorie-Gewicht × (Recency + Popularität)

## Nächste sinnvolle Schritte

1. `playerokapi` echt anbinden (Mock-Daten raus)
2. Bilder: Playerok-Angebote brauchen echte `image_url` – prüfen, was die API liefert
3. Sync als Background-Job (APScheduler oder externer Cronjob), damit Feed sich füllt
4. User-ID: aktuell fix "device_local_user" – für echten Multi-User-Betrieb
   Device-ID (z.B. `expo-application`) oder Login einbauen
5. Rate-Limits von Playerok beachten beim Sync-Intervall
