import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing, type } from "./theme";

export default function ConnectScreen({
  onAccept,
  onDecline,
  error,
}: {
  onAccept: () => void;
  onDecline: () => void;
  error: string | null;
}) {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={[
        styles.wrapContent,
        { paddingTop: insets.top + spacing.xl, paddingBottom: spacing.xxl * 3 },
      ]}
    >
      <View style={styles.logoRow}>
        <View style={styles.logoBox}>
          <Text style={styles.logoText}>P</Text>
        </View>
        <Ionicons name="swap-horizontal" size={22} color={colors.textSecondary} />
        <View style={[styles.logoBox, styles.logoBoxAlt]}>
          <Ionicons name="game-controller" size={22} color={colors.textPrimary} />
        </View>
      </View>

      <Text style={styles.title}>PlrkTok mit deinem Playerok-Konto verbinden?</Text>

      <Text style={styles.body}>
        Wir öffnen dafür die echte Anmeldeseite von playerok.com. Du gibst deine
        Zugangsdaten dort ein, nicht bei uns.
      </Text>

      {/*
        Bewusst offengelegt. Playerok hat kein OAuth - es gibt also keine
        offizielle Freigabe, die wir vorzeigen koennten. Das hier ist eine
        Anfrage von PlrkTok, nicht von Playerok, und das soll man sehen.
      */}
      <View style={styles.factBox}>
        <Fact icon="phone-portrait-outline" text="Deine Anmeldedaten bleiben auf diesem Gerät. Sie werden nicht an unseren Server geschickt." />
        <Fact icon="eye-outline" text="PlrkTok liest damit dein Profil, dein Guthaben und deine Nachrichten." />
        <Fact icon="log-out-outline" text="Du kannst die Verbindung jederzeit im Profil wieder trennen." />
        <Fact
          icon="alert-circle-outline"
          text="PlrkTok ist kein offizielles Playerok-Produkt. Playerok hat diese App nicht geprüft oder freigegeben."
          warn
        />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        onPress={onAccept}
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
      >
        <Text style={styles.primaryText}>Autorisieren</Text>
      </Pressable>

      <Pressable
        onPress={onDecline}
        style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryText}>Ablehnen</Text>
      </Pressable>

      <Text style={styles.declineHint}>
        Ohne Verbindung kannst du den Feed weiter normal benutzen.
      </Text>
    </ScrollView>
  );
}

function Fact({
  icon,
  text,
  warn,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  text: string;
  warn?: boolean;
}) {
  return (
    <View style={styles.fact}>
      <Ionicons
        name={icon}
        size={19}
        color={warn ? "#f5a524" : colors.textSecondary}
        style={styles.factIcon}
      />
      <Text style={[styles.factText, warn && styles.factTextWarn]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  wrapContent: {
    paddingHorizontal: spacing.xl,
    alignItems: "center",
  },
  web: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  center: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    justifyContent: "center",
    alignItems: "center",
  },
  checkingText: {
    ...type.body,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  logoBox: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
  },
  logoBoxAlt: {
    backgroundColor: colors.bgSecondary,
  },
  logoText: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: "800",
  },
  title: {
    ...type.title,
    fontSize: 22,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  body: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: spacing.xl,
  },
  factBox: {
    alignSelf: "stretch",
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  fact: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  factIcon: {
    marginRight: spacing.md,
    marginTop: 1,
  },
  factText: {
    ...type.body,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  factTextWarn: {
    color: "#f5a524",
  },
  error: {
    ...type.body,
    color: "#f87171",
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  primaryBtn: {
    alignSelf: "stretch",
    backgroundColor: colors.accent,
    paddingVertical: 15,
    borderRadius: radius.pill,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  primaryBtnPressed: {
    backgroundColor: colors.accentPressed,
  },
  primaryText: {
    ...type.seller,
    fontSize: 16,
    color: colors.textPrimary,
  },
  secondaryBtn: {
    alignSelf: "stretch",
    paddingVertical: 14,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  secondaryText: {
    ...type.seller,
    fontSize: 15,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.6,
  },
  declineHint: {
    ...type.body,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
});
