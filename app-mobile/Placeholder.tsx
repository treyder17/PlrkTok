import React from "react";
import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing, type } from "./theme";

/**
 * Bildschirme, die auf das verbundene Playerok-Konto warten.
 *
 * Absichtlich ehrlich formuliert: die Daten dahinter (eigene Kaeufer, Chats,
 * eigenes Profil) liegen alle hinter dem Login. Ein leerer Bildschirm ohne
 * Erklaerung wuerde wie ein Fehler wirken.
 */
export default function Placeholder({
  icon,
  title,
  body,
  actionLabel,
  actionUrl,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  body: string;
  actionLabel?: string;
  actionUrl?: string;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.xxl }]}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={34} color={colors.textSecondary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>

      {actionLabel && actionUrl && (
        <Pressable
          onPress={() => Linking.openURL(actionUrl)}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        >
          <Text style={styles.btnText}>{actionLabel}</Text>
          <Ionicons name="open-outline" size={17} color={colors.textPrimary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.bgSecondary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  title: {
    ...type.title,
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  body: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: spacing.xl,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: 12,
    borderRadius: radius.pill,
  },
  btnPressed: {
    backgroundColor: colors.accentPressed,
  },
  btnText: {
    ...type.seller,
    color: colors.textPrimary,
  },
});
