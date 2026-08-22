import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  Linking,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Listing, searchListings, sendInteraction } from "./api";
import { colors, radius, spacing, type, formatPrice, formatCount } from "./theme";
import { useI18n } from "./i18n";

export default function SearchScreen({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Listing[] | null>(null);
  const [loading, setLoading] = useState(false);
  // Laufende Nummer je Anfrage: eine langsame frühere Antwort darf eine
  // neuere nicht überschreiben.
  const seq = useRef(0);

  const run = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setResults(null);
      setLoading(false);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    try {
      const rows = await searchListings(trimmed);
      if (mine === seq.current) setResults(rows);
    } catch {
      if (mine === seq.current) setResults([]);
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, []);

  // Entprellt: nicht bei jedem Tastendruck eine Anfrage schicken.
  useEffect(() => {
    const handle = setTimeout(() => void run(query), 350);
    return () => clearTimeout(handle);
  }, [query, run]);

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.bar}>
        <Pressable onPress={onClose} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("search.placeholder")}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={() => void run(query)}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>

      {loading && results === null ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : results === null ? (
        <View style={styles.center}>
          <Ionicons name="search-outline" size={38} color={colors.textMuted} />
          <Text style={styles.hint}>{t("search.start")}</Text>
        </View>
      ) : results.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>{t("search.empty")}</Text>
          <Text style={styles.hint}>{t("search.emptyHint")}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(x) => x.id}
          contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <Row item={item} />}
        />
      )}
    </View>
  );
}

function Row({ item }: { item: Listing }) {
  const open = useCallback(() => {
    sendInteraction(item.id, "profile_tap");
    Linking.openURL(item.profile_url);
  }, [item]);

  return (
    <Pressable
      onPress={open}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty]}>
          <Ionicons name="image-outline" size={20} color={colors.textMuted} />
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.rowPrice}>{formatPrice(item.price, item.currency)}</Text>
        <View style={styles.rowMeta}>
          <Text style={styles.rowCategory}>{item.category}</Text>
          {item.like_count > 0 && (
            <>
              <Ionicons name="heart" size={11} color={colors.textMuted} />
              <Text style={styles.rowCategory}>{formatCount(item.like_count)}</Text>
            </>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bgPrimary },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  backBtn: { padding: 4 },
  inputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: 42,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    padding: 0,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  hint: {
    ...type.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.md,
  },
  emptyTitle: { ...type.title, color: colors.textPrimary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rowPressed: { backgroundColor: colors.bgSecondary },
  thumb: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.bgSecondary },
  thumbEmpty: { justifyContent: "center", alignItems: "center" },
  rowText: { flex: 1 },
  rowTitle: { ...type.body, fontSize: 14, color: colors.textPrimary, fontWeight: "600" },
  rowPrice: { ...type.seller, fontSize: 15, color: colors.textPrimary, marginTop: 2 },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  rowCategory: { ...type.label, fontSize: 10, color: colors.textMuted },
});
