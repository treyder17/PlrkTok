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
};

const USER_ID = "device_local_user"; // später durch echte User-ID / Device-ID ersetzen

// Jede ID ist ein 36-Zeichen-UUID. Ungebremst wird die URL nach ein paar hundert
// Swipes so lang, dass der Server mit 414 (URI Too Long) abbricht -> auf die
// zuletzt gesehenen begrenzen.
const MAX_EXCLUDE_IDS = 200;

export async function fetchFeed(excludeIds: string[]): Promise<Listing[]> {
  const exclude = excludeIds.slice(-MAX_EXCLUDE_IDS).join(",");
  const res = await fetch(
    `${API_BASE}/feed?user_id=${USER_ID}&exclude=${encodeURIComponent(exclude)}&limit=20`
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
