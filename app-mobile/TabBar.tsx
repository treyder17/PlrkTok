import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius, spacing, type } from "./theme";
import { useI18n } from "./i18n";

export type TabKey = "home" | "buyers" | "create" | "inbox" | "profile";

type Tab = {
  key: TabKey;
  labelKey: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconActive: React.ComponentProps<typeof Ionicons>["name"];
};

const TABS: Tab[] = [
  { key: "home", labelKey: "tab.home", icon: "home-outline", iconActive: "home" },
  { key: "buyers", labelKey: "tab.buyers", icon: "people-outline", iconActive: "people" },
  { key: "create", labelKey: "", icon: "add", iconActive: "add" },
  { key: "inbox", labelKey: "tab.inbox", icon: "mail-outline", iconActive: "mail" },
  { key: "profile", labelKey: "tab.profile", icon: "person-outline", iconActive: "person" },
];

export default function TabBar({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (key: TabKey) => void;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      {TABS.map((tab) => {
        // Der Plus-Knopf ist kein Tab wie die anderen, sondern eine Aktion -
        // deshalb hebt er sich bewusst als gefuellte Flaeche ab.
        if (tab.key === "create") {
          return (
            <Pressable
              key={tab.key}
              onPress={() => onChange(tab.key)}
              style={({ pressed }) => [styles.createBtn, pressed && styles.createBtnPressed]}
              hitSlop={6}
            >
              <Ionicons name="add" size={26} color={colors.textPrimary} />
            </Pressable>
          );
        }

        const isActive = active === tab.key;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            hitSlop={4}
          >
            <Ionicons
              name={isActive ? tab.iconActive : tab.icon}
              size={23}
              color={isActive ? colors.textPrimary : colors.textMuted}
            />
            <Text
              style={[styles.label, isActive ? styles.labelActive : null]}
              numberOfLines={1}
            >
              {tab.labelKey ? t(tab.labelKey) : ""}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    backgroundColor: colors.bgPrimary,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  pressed: {
    opacity: 0.6,
  },
  label: {
    ...type.label,
    fontSize: 10,
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.textPrimary,
  },
  createBtn: {
    width: 46,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: spacing.xs,
  },
  createBtnPressed: {
    backgroundColor: colors.accentPressed,
  },
});
