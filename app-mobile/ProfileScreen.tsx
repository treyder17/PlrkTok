import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ConnectScreen from "./ConnectScreen";
import {
  Viewer,
  PlayerokAuthError,
  BRIDGE_JS,
  VIEWER_QUERY,
  parseViewer,
} from "./playerok";
import { colors, radius, spacing, type, formatPrice } from "./theme";

const PLAYEROK_URL = "https://playerok.com/";

type Stage =
  /** WebView laedt im Hintergrund, wir pruefen ob schon eine Session besteht. */
  | { kind: "probing" }
  /** Keine Session - Zustimmung einholen. */
  | { kind: "consent"; error: string | null }
  /** WebView sichtbar, Nutzer meldet sich bei Playerok an. */
  | { kind: "login" }
  /** Playerok sichtbar, damit der Nutzer sich dort abmelden kann. */
  | { kind: "logout" }
  | { kind: "connected"; viewer: Viewer }
  | { kind: "error"; message: string };

export default function ProfileScreen() {
  const [stage, setStage] = useState<Stage>({ kind: "probing" });
  const webRef = useRef<WebView>(null);
  const insets = useSafeAreaInsets();
  // Wir fragen nach jedem Seitenwechsel erneut ab; ohne Sperre wuerden sich die
  // Antworten ueberlappen und der Bildschirm flackern.
  const pending = useRef(false);

  const askViewer = useCallback(() => {
    if (pending.current) return;
    pending.current = true;
    const body = { operationName: "viewer", query: VIEWER_QUERY, variables: {} };
    webRef.current?.injectJavaScript(
      `window.__plrktokCall && window.__plrktokCall("viewer", ${JSON.stringify(body)}); true;`
    );
  }, []);

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      let msg: any;
      try {
        msg = JSON.parse(e.nativeEvent.data);
      } catch {
        return; // Die Seite selbst postet gelegentlich eigene Nachrichten.
      }

      if (msg.type === "ready") {
        askViewer();
        return;
      }
      if (msg.id !== "viewer") return;

      pending.current = false;

      if (msg.error) {
        setStage({ kind: "error", message: `Netzwerkfehler: ${msg.error}` });
        return;
      }

      try {
        const viewer = parseViewer(msg.status, msg.body);
        setStage({ kind: "connected", viewer });
      } catch (err) {
        if (err instanceof PlayerokAuthError) {
          // Nicht (mehr) angemeldet. Waehrend der Anmeldung ist das der normale
          // Zustand - dann einfach weiter warten, bis der Nutzer fertig ist.
          setStage((prev) =>
            prev.kind === "login" ? prev : { kind: "consent", error: null }
          );
          return;
        }
        setStage({
          kind: "error",
          message: err instanceof Error ? err.message : "Unbekannter Fehler",
        });
      }
    },
    [askViewer]
  );

  const webViewVisible = stage.kind === "login" || stage.kind === "logout";

  return (
    <View style={styles.root}>
      {/*
        Der WebView bleibt immer montiert - er ist unser API-Zugang, nicht nur
        das Anmeldefenster. Wenn er nicht gebraucht wird, liegt er hinter dem
        Inhalt statt abgebaut zu werden, damit die Session nicht verloren geht.
      */}
      <View style={webViewVisible ? styles.webVisible : styles.webHidden} pointerEvents={webViewVisible ? "auto" : "none"}>
        <WebView
          ref={webRef}
          source={{ uri: PLAYEROK_URL }}
          style={styles.web}
          injectedJavaScript={BRIDGE_JS}
          onMessage={onMessage}
          onLoadEnd={() => {
            // Nach jedem Seitenwechsel neu fragen: so merken wir ohne Zutun,
            // sobald die Anmeldung durch ist.
            pending.current = false;
            askViewer();
          }}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          originWhitelist={["https://*.playerok.com", "https://playerok.com"]}
        />
      </View>

      {webViewVisible && (
        <View style={[styles.banner, { paddingTop: insets.top + spacing.sm }]}>
          <Text style={styles.bannerText}>
            {stage.kind === "login"
              ? "Melde dich bei Playerok an. Danach geht es automatisch weiter."
              : "Melde dich hier bei Playerok ab, um die Verbindung zu trennen."}
          </Text>
          <Pressable onPress={() => setStage({ kind: "probing" })} hitSlop={10}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>
      )}

      {!webViewVisible && (
        <View style={styles.overlay}>
          <Content
            stage={stage}
            insets={insets}
            onAccept={() => setStage({ kind: "login" })}
            onDecline={() => setStage({ kind: "consent", error: null })}
            onRetry={() => {
              setStage({ kind: "probing" });
              pending.current = false;
              askViewer();
            }}
            onLogout={() => setStage({ kind: "logout" })}
          />
        </View>
      )}
    </View>
  );
}

function Content({
  stage,
  insets,
  onAccept,
  onDecline,
  onRetry,
  onLogout,
}: {
  stage: Stage;
  insets: { top: number };
  onAccept: () => void;
  onDecline: () => void;
  onRetry: () => void;
  onLogout: () => void;
}) {
  if (stage.kind === "probing") {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (stage.kind === "consent") {
    return <ConnectScreen onAccept={onAccept} onDecline={onDecline} error={stage.error} />;
  }

  if (stage.kind === "error") {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="alert-circle-outline" size={42} color={colors.textSecondary} />
        <Text style={styles.errorText}>{stage.message}</Text>
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
        >
          <Text style={styles.primaryText}>Erneut versuchen</Text>
        </Pressable>
      </View>
    );
  }

  if (stage.kind !== "connected") return null;

  const { viewer } = stage;

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.xl,
        paddingBottom: spacing.xxl * 3,
        paddingHorizontal: spacing.lg,
      }}
    >
      <View style={styles.head}>
        {viewer.avatarURL ? (
          <Image source={{ uri: viewer.avatarURL }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarLetter}>
              {viewer.username.slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.headText}>
          <Text style={styles.username} numberOfLines={1}>
            {viewer.username}
          </Text>
          {viewer.email && (
            <Text style={styles.email} numberOfLines={1}>
              {viewer.email}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.statRow}>
        <Stat
          label="Guthaben"
          value={viewer.balanceValue !== null ? formatPrice(viewer.balanceValue, "RUB") : "–"}
        />
        <Stat label="Bewertungen" value={viewer.testimonialCounter?.toString() ?? "–"} />
        <Stat label="Ungelesen" value={viewer.unreadChatsCounter?.toString() ?? "–"} />
      </View>

      {viewer.canPublishItems === false && (
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={19} color={colors.textSecondary} />
          <Text style={styles.noticeText}>
            Playerok erlaubt diesem Konto derzeit kein Veröffentlichen von Angeboten.
          </Text>
        </View>
      )}

      {/*
        Ehrlich benannt: wir speichern keine Zugangsdaten, die wir loeschen
        koennten - die Session lebt im Cookie-Speicher des WebViews. Ein echtes
        Trennen ist daher das Abmelden bei Playerok selbst.
      */}
      <Pressable
        onPress={onLogout}
        style={({ pressed }) => [styles.dangerBtn, pressed && styles.pressed]}
      >
        <Ionicons name="log-out-outline" size={19} color="#f87171" />
        <Text style={styles.dangerText}>Bei Playerok abmelden</Text>
      </Pressable>
      <Text style={styles.hint}>
        PlrkTok speichert deine Anmeldung nicht selbst. Sie liegt im Browser-Speicher
        dieser App und endet, sobald du dich bei Playerok abmeldest.
      </Text>
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bgPrimary },
  web: { flex: 1, backgroundColor: colors.bgPrimary },
  webVisible: { flex: 1 },
  // Nicht unmounten, nur unsichtbar parken: ein Abbau wuerde die Session
  // mitnehmen und den Nutzer bei jedem Tab-Wechsel neu anmelden lassen.
  webHidden: { position: "absolute", width: 1, height: 1, opacity: 0, top: 0, left: 0 },
  overlay: {
    // Explizit statt StyleSheet.absoluteFill: das ist eine registrierte Style-ID
    // (eine Zahl), spreizen ergibt {} und das Overlay haette keine Position -
    // ohne dass TypeScript etwas merkt.
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bgPrimary,
  },
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  bannerText: {
    ...type.body,
    fontSize: 13,
    color: colors.textPrimary,
    flex: 1,
  },
  wrap: { flex: 1, backgroundColor: colors.bgPrimary },
  center: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  errorText: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
    marginVertical: spacing.lg,
  },
  head: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xl },
  avatar: { width: 64, height: 64, borderRadius: 32, marginRight: spacing.lg },
  avatarFallback: {
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: { color: colors.textPrimary, fontSize: 26, fontWeight: "800" },
  headText: { flex: 1 },
  username: { ...type.title, fontSize: 21, color: colors.textPrimary },
  email: { ...type.body, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  statRow: {
    flexDirection: "row",
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  stat: { flex: 1, alignItems: "center" },
  statValue: { ...type.seller, fontSize: 17, color: colors.textPrimary },
  statLabel: {
    ...type.label,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 3,
    textTransform: "uppercase",
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noticeText: {
    ...type.body,
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 19,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: 13,
    borderRadius: radius.pill,
  },
  primaryBtnPressed: { backgroundColor: colors.accentPressed },
  primaryText: { ...type.seller, color: colors.textPrimary },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingVertical: 13,
    borderRadius: radius.pill,
    marginBottom: spacing.md,
  },
  dangerText: { ...type.seller, color: "#f87171" },
  hint: {
    ...type.body,
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  pressed: { opacity: 0.6 },
});
