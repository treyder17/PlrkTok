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
import { useI18n } from "./i18n";

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
  const { t } = useI18n();

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

      <Text style={styles.title}>{t("consent.title")}</Text>

      <Text style={styles.body}>
        {t("consent.body")}
      </Text>

      {/*
        Bewusst offengelegt. Playerok hat kein OAuth - es gibt also keine
        offizielle Freigabe, die wir vorzeigen koennten. Das hier ist eine
        Anfrage von PlrkTok, nicht von Playerok, und das soll man sehen.
      */}
      <View style={styles.factBox}>
        <Fact icon="phone-portrait-outline" text={t("consent.fact1")} />
        <Fact icon="eye-outline" text={t("consent.fact2")} />
        <Fact icon="log-out-outline" text={t("consent.fact3")} />
        <Fact
          icon="alert-circle-outline"
          text={t("consent.fact4")}
          warn
        />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        onPress={onAccept}
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}
      >
        <Text style={styles.primaryText}>{t("consent.authorize")}</Text>
      </Pressable>

      <Pressable
        onPress={onDecline}
        style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
      >
        <Text style={styles.secondaryText}>{t("consent.decline")}</Text>
      </Pressable>

      <Text style={styles.declineHint}>
        {t("consent.hint")}
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
