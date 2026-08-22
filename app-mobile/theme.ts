/**
 * Playerok-Design-Tokens.
 *
 * Nicht geraten: ausgelesen aus den CSS-Custom-Properties von playerok.com
 * (_next/static/css/c586b052050867bd.css). Playerok definiert jede Variable
 * zweimal - einmal fuer das helle, einmal fuer das dunkle Theme. Wir bauen einen
 * Vollbild-Feed, da ist das dunkle die richtige Wahl.
 */

// Graustufen, dunkles Theme
export const gray = {
  25: "#f6f6f7",
  50: "#edeef0",
  100: "#e4e5e8",
  200: "#d3d6db",
  300: "#c8cbd1",
  400: "#b6b9c1",
  500: "#a4a8b2",
  600: "#707580",
  700: "#515561",
  800: "#41444e",
  900: "#282933",
  950: "#1a1b21",
} as const;

// Playerok-Blau
export const brand = {
  400: "#5286ff",
  500: "#2663f0",
  600: "#1849cc",
  700: "#173b90",
} as const;

export const colors = {
  bgPrimary: gray[950],
  bgSecondary: gray[900],
  bgTertiary: gray[700],
  textPrimary: gray[25],
  textSecondary: gray[500],
  textMuted: gray[600],
  border: gray[700],
  accent: brand[500],
  accentPressed: brand[600],
  accentLight: brand[400],
  // Fuer den Preis: Playerok hebt Betraege nicht farbig hervor, sondern ueber
  // Gewicht und Groesse. Das bisherige Giftgruen kam aus keinem ihrer Tokens.
  price: gray[25],
  like: "#ff3b5c",
  overlayScrim: "rgba(0,0,0,0.55)",
} as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const type = {
  title: { fontSize: 19, fontWeight: "700" as const, letterSpacing: -0.3 },
  price: { fontSize: 26, fontWeight: "800" as const, letterSpacing: -0.6 },
  seller: { fontSize: 14, fontWeight: "600" as const },
  label: { fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.2 },
  body: { fontSize: 14, fontWeight: "400" as const },
} as const;

/** Playerok zeigt Preise als "1 649 ₽" - Tausender mit schmalem Leerraum. */
export function formatPrice(value: number, currency: string): string {
  const rounded = Math.round(value);
  const grouped = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const symbol = currency === "RUB" ? "₽" : currency;
  return `${grouped} ${symbol}`;
}

/**
 * Zaehler kurz halten, wie bei TikTok: 999 -> "999", 1500 -> "1,5K", 23000 -> "23K".
 * Null wird zu einem Gedankenstrich, damit die Leiste nicht wie kaputt aussieht,
 * wenn noch niemand reagiert hat.
 */
export function formatCount(n: number): string {
  if (!n) return "–";
  if (n < 1000) return String(n);
  if (n < 10000) {
    const v = (n / 1000).toFixed(1).replace(".", ",");
    return `${v.endsWith(",0") ? v.slice(0, -2) : v}K`;
  }
  if (n < 1000000) return `${Math.round(n / 1000)}K`;
  return `${(n / 1000000).toFixed(1).replace(".", ",")}M`;
}
