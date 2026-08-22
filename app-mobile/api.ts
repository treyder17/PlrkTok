// Öffentliches Backend auf Railway - funktioniert von überall, nicht nur im lokalen WLAN
export const API_BASE = "https://plrktok-production.up.railway.app";

export type Listing = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  category: string;
  image_url: string | null;
  seller_username: string | null;
  profile_url: string;
  /** Reichweite ueber alle PlrkTok-Nutzer. Kein comment_count: Playerok hat
   *  keine Kommentare an Angeboten, der Zaehler waere dauerhaft 0. */
  like_count: number;
  save_count: number;
  share_count: number;
};

const USER_ID = "device_local_user"; // später durch echte User-ID / Device-ID ersetzen

/*
  Sprache fuer die Titel. Liegt als Modulvariable und nicht als Parameter an
  jedem Aufruf, weil sonst jede aufrufende Stelle sie durchschleifen muesste.
  Der I18nProvider setzt sie, sobald die gespeicherte Wahl geladen ist.
*/
let apiLang = "ru";
export function setApiLang(lang: string) {
  apiLang = lang;
}

// Jede ID ist ein 36-Zeichen-UUID. Ungebremst wird die URL nach ein paar hundert
// Swipes so lang, dass der Server mit 414 (URI Too Long) abbricht -> auf die
// zuletzt gesehenen begrenzen.
const MAX_EXCLUDE_IDS = 200;

export async function fetchFeed(excludeIds: string[]): Promise<Listing[]> {
  const exclude = excludeIds.slice(-MAX_EXCLUDE_IDS).join(",");
  const res = await fetch(
    `${API_BASE}/feed?user_id=${USER_ID}&exclude=${encodeURIComponent(exclude)}&limit=20&lang=${apiLang}`
  );
  if (!res.ok) throw new Error("Feed konnte nicht geladen werden");
  return res.json();
}

export async function sendInteraction(
  listingId: string,
  action: "view" | "skip" | "like" | "profile_tap",
  dwellTimeMs: number = 0
) {
  try {
    await fetch(`${API_BASE}/interact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: USER_ID,
        listing_id: listingId,
        action,
        dwell_time_ms: dwellTimeMs,
      }),
    });
  } catch (e) {
    // Interaction-Fehler sollen den Feed nicht blockieren
    console.warn("Interaction fehlgeschlagen", e);
  }
}

export async function setSaved(listingId: string, saved: boolean): Promise<void> {
  await fetch(`${API_BASE}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: USER_ID, listing_id: listingId, saved }),
  });
}

/** IDs der gemerkten Angebote - beim Start, damit die Merk-Knoepfe gefuellt starten. */
export async function fetchSavedIds(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/saved/ids?user_id=${USER_ID}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.ids) ? data.ids : [];
}

export async function fetchSaved(): Promise<Listing[]> {
  const res = await fetch(`${API_BASE}/saved?user_id=${USER_ID}&lang=${apiLang}`);
  if (!res.ok) throw new Error("Gemerkte Angebote konnten nicht geladen werden");
  return res.json();
}

export async function setLiked(listingId: string, liked: boolean): Promise<void> {
  await fetch(`${API_BASE}/like`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: USER_ID, listing_id: listingId, liked }),
  });
}

export async function fetchLikedIds(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/liked/ids?user_id=${USER_ID}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.ids) ? data.ids : [];
}

export async function sendShare(listingId: string): Promise<void> {
  await fetch(`${API_BASE}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: USER_ID, listing_id: listingId }),
  });
}

export async function searchListings(query: string): Promise<Listing[]> {
  const res = await fetch(
    `${API_BASE}/search?q=${encodeURIComponent(query)}&limit=40&lang=${apiLang}`
  );
  if (!res.ok) throw new Error("Suche fehlgeschlagen");
  return res.json();
}
