/**
 * Zugriff auf Playerok - aus dem WebView heraus, nicht daneben.
 *
 * Erster Ansatz war: Cookie aus dem WebView auslesen, speichern, und mit fetch
 * aus React Native nachbauen. Das hat zwei Probleme, die dieser Weg beide nicht
 * hat:
 *
 * 1. Das token-Cookie ist mit hoher Wahrscheinlichkeit HttpOnly. Auslesen
 *    braucht dann Androids System-CookieStore, also ein weiteres natives Modul -
 *    und das dafuer uebliche (@react-native-cookies/cookies) laesst sich mit
 *    Gradle 9 nicht bauen, weil es noch jcenter() referenziert.
 * 2. Selbst nachgebaute Anfragen muessen User-Agent und Header exakt treffen,
 *    sonst schlaegt DDoS-Guard zu (__ddg5_ haengt an IP und User-Agent).
 *
 * Loesung: die Anfrage im WebView selbst ausfuehren. Der laeuft auf
 * playerok.com, also haengt der Browser die Cookies von sich aus an - HttpOnly
 * eingeschlossen - und sendet genau die Header, die die Seite auch sonst sendet.
 * Wir bekommen die Zugangsdaten nie zu sehen und speichern sie nirgends.
 */

export type Viewer = {
  id: string;
  username: string;
  email: string | null;
  role: string | null;
  balanceValue: number | null;
  avatarURL: string | null;
  testimonialCounter: number | null;
  unreadChatsCounter: number | null;
  canPublishItems: boolean | null;
};

/** Wortlaut aus playerokapi/misc.py - diese Query braucht keinen Persisted-Hash. */
export const VIEWER_QUERY = `query viewer {
  viewer {
    id
    username
    email
    role
    unreadChatsCounter
    canPublishItems
    balance { value __typename }
    profile { id avatarURL testimonialCounter __typename }
    __typename
  }
}`;

export class PlayerokAuthError extends Error {}

/**
 * Bruecke, die im WebView installiert wird. Nimmt Auftraege von React Native an,
 * fuehrt sie als fetch auf gleichem Origin aus und schickt die Antwort zurueck.
 */
export const BRIDGE_JS = `
(function () {
  if (window.__plrktokReady) { return; }
  window.__plrktokReady = true;

  window.__plrktokCall = function (id, body) {
    fetch('/graphql', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'content-type': 'application/json',
        'apollographql-client-name': 'web',
        'apollo-require-preflight': 'true',
        'x-apollo-operation-name': body.operationName || 'query',
        'x-gql-op': body.operationName || 'query',
        'x-gql-path': '/'
      },
      body: JSON.stringify(body)
    })
      .then(function (r) {
        return r.text().then(function (t) {
          window.ReactNativeWebView.postMessage(
            JSON.stringify({ id: id, status: r.status, body: t })
          );
        });
      })
      .catch(function (e) {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({ id: id, status: 0, error: String(e) })
        );
      });
  };

  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
})();
true;
`;

/** Antwort der Bruecke auswerten und in einen Viewer uebersetzen. */
export function parseViewer(status: number, rawBody: string): Viewer {
  if (status === 401 || status === 403) {
    throw new PlayerokAuthError("Nicht angemeldet");
  }

  let json: any;
  try {
    json = JSON.parse(rawBody);
  } catch {
    // DDoS-Guard antwortet mit einer HTML-Seite statt JSON.
    throw new PlayerokAuthError("Playerok hat die Anfrage abgewiesen");
  }

  // Abgelaufene Sessions kommen als HTTP 200 mit GraphQL-Fehlern zurueck,
  // nicht als HTTP-Fehler - deshalb hier nochmal pruefen.
  if (json.errors?.length) {
    const msg = String(json.errors[0]?.message ?? "");
    if (/unauthor|forbidden|not authenticated|bot|guard/i.test(msg)) {
      throw new PlayerokAuthError(msg);
    }
    throw new Error(msg || "Playerok lieferte einen Fehler");
  }

  const v = json?.data?.viewer;
  if (!v) throw new PlayerokAuthError("Keine Kontodaten erhalten");

  return {
    id: v.id,
    username: v.username,
    email: v.email ?? null,
    role: v.role ?? null,
    balanceValue: v.balance?.value ?? null,
    avatarURL: v.profile?.avatarURL ?? null,
    testimonialCounter: v.profile?.testimonialCounter ?? null,
    unreadChatsCounter: v.unreadChatsCounter ?? null,
    canPublishItems: v.canPublishItems ?? null,
  };
}
