// Passe die Base-URL an: beim Testen mit Android Emulator ist localhost = 10.0.2.2
// Bei echtem Gerät im selben WLAN: IP deines Rechners, z.B. http://192.168.1.50:8000
export const API_BASE = "http://10.0.2.2:8000";

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

export async function fetchFeed(excludeIds: string[]): Promise<Listing[]> {
  const exclude = excludeIds.join(",");
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
