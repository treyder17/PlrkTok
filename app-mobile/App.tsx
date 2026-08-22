import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  View,
  Text,
  StatusBar,
  Pressable,
  ViewToken,
} from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import FeedCard from "./FeedCard";
import TabBar, { TabKey } from "./TabBar";
import Placeholder from "./Placeholder";
import ProfileScreen from "./ProfileScreen";
import SearchScreen from "./SearchScreen";
import {
  Listing,
  fetchFeed,
  sendInteraction,
  setSaved,
  fetchSavedIds,
  setLiked,
  fetchLikedIds,
} from "./api";
import { I18nProvider, useI18n } from "./i18n";
import { colors, radius, spacing, type } from "./theme";

const { height } = Dimensions.get("window");

function Feed() {
  const { t } = useI18n();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const seenIds = useRef<string[]>([]);
  const currentIndex = useRef(0);
  const viewStartTime = useRef<number>(Date.now());
  // Spiegel von `listings` als Ref: onViewableItemsChanged darf laut FlatList nicht
  // wechseln, hängt also für immer am ersten Render fest und sähe sonst nur [].
  const listingsRef = useRef<Listing[]>([]);
  const isLoadingMore = useRef(false);

  useEffect(() => {
    listingsRef.current = listings;
  }, [listings]);

  // Gemerkte Angebote einmal laden, damit die Merk-Knoepfe gefuellt starten
  // statt bei jedem App-Start leer zu wirken.
  useEffect(() => {
    fetchSavedIds()
      .then((ids) => setSavedIds(new Set(ids)))
      .catch(() => {});
    fetchLikedIds()
      .then((ids) => setLikedIds(new Set(ids)))
      .catch(() => {});
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoadingMore.current) return; // sonst feuern mehrere Requests parallel
    isLoadingMore.current = true;
    try {
      const newListings = await fetchFeed(seenIds.current);
      if (newListings.length === 0) return;
      seenIds.current = [...seenIds.current, ...newListings.map((l) => l.id)];
      setListings((prev) => [...prev, ...newListings]);
      setError(null);
    } catch (e) {
      setError("feed.errorBody");
    } finally {
      isLoadingMore.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMore();
  }, [loadMore]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    loadMore();
  }, [loadMore]);

  const toggleLike = useCallback((id: string) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      const willLike = !next.has(id);
      if (willLike) next.add(id);
      else next.delete(id);
      // Eigener Endpoint statt /interact: nur so ist ein Like ein Zustand, der
      // sich zuruecknehmen laesst und ueber alle Nutzer zaehlbar ist.
      setLiked(id, willLike).catch(() => {});
      return next;
    });
  }, []);

  const toggleSave = useCallback((id: string) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      const willSave = !next.has(id);
      if (willSave) next.add(id);
      else next.delete(id);
      // Optimistisch: der Knopf reagiert sofort, das Backend zieht nach.
      setSaved(id, willSave).catch(() => {});
      return next;
    });
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length === 0) return;
      const newIndex = viewableItems[0].index ?? 0;
      const current = listingsRef.current;

      // Dwell time für vorheriges Item tracken
      if (currentIndex.current !== newIndex && current[currentIndex.current]) {
        const dwell = Date.now() - viewStartTime.current;
        sendInteraction(current[currentIndex.current].id, "view", dwell);
      }

      currentIndex.current = newIndex;
      viewStartTime.current = Date.now();

      // Nachladen, wenn wir uns dem Ende nähern
      if (newIndex >= current.length - 5) {
        loadMore();
      }
    }
  );

  if (loading && listings.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (error && listings.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>{t("feed.errorTitle")}</Text>
        <Text style={styles.errorText}>{t(error)}</Text>
        <Pressable
          onPress={retry}
          style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
        >
          <Text style={styles.retryText}>{t("feed.retry")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      data={listings}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <FeedCard
          item={item}
          liked={likedIds.has(item.id)}
          saved={savedIds.has(item.id)}
          onToggleLike={() => toggleLike(item.id)}
          onToggleSave={() => toggleSave(item.id)}
        />
      )}
      /*
        Kein pagingEnabled zusammen mit snapToInterval - die beiden beissen sich.
        Entscheidend ist disableIntervalMomentum: ohne das traegt der Schwung
        eines kraeftigen Wischers ueber mehrere Rasterpunkte hinweg, man landet
        also zwei oder drei Angebote weiter. Damit ist pro Wisch genau ein
        Rasterschritt erlaubt, wie bei TikTok.
      */
      showsVerticalScrollIndicator={false}
      snapToInterval={height}
      snapToAlignment="start"
      disableIntervalMomentum
      decelerationRate="fast"
      onViewableItemsChanged={onViewableItemsChanged.current}
      viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
      windowSize={3}
      maxToRenderPerBatch={3}
      initialNumToRender={2}
      removeClippedSubviews
    />
  );
}

function Screen({ tab }: { tab: TabKey }) {
  const { t, lang } = useI18n();
  switch (tab) {
    case "home":
      // key an der Sprache: bei Wechsel muss der Feed neu geladen werden,
      // sonst bleiben die bereits geholten Titel in der alten Sprache stehen.
      return <Feed key={lang} />;
    case "buyers":
      return (
        <Placeholder
          icon="people-outline"
          title={t("buyers.title")}
          body={t("buyers.body")}
        />
      );
    case "create":
      return (
        <Placeholder
          icon="add-circle-outline"
          title={t("create.title")}
          body={t("create.body")}
          actionLabel={t("create.action")}
          actionUrl="https://playerok.com/"
        />
      );
    case "inbox":
      return (
        <Placeholder
          icon="mail-outline"
          title={t("inbox.title")}
          body={t("inbox.body")}
        />
      );
    case "profile":
      return <ProfileScreen />;
  }
}

function TopBar({ onSearch }: { onSearch: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
      <Text style={styles.brand}>PlrkTok</Text>
      <Pressable
        onPress={onSearch}
        hitSlop={12}
        style={({ pressed }) => [styles.searchBtn, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name="search" size={22} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
}

function Shell() {
  const [tab, setTab] = useState<TabKey>("home");
  const [searching, setSearching] = useState(false);

  // SafeAreaProvider muss laut Expo-57-Doku an der Wurzel stehen, sonst liefert
  // useSafeAreaInsets in den Karten nur Nullen - und mit edgeToEdgeEnabled=true
  // rutschte der Inhalt unter die Systemleisten.
  if (searching) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <SearchScreen onClose={() => setSearching(false)} />
      </View>
    );
  }

  return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <Screen tab={tab} />
        {/* Suche gehoert ueber den Feed, nicht ueber die Konto-Bildschirme. */}
        {tab === "home" && <TopBar onSearch={() => setSearching(true)} />}
        {/*
          Die Leiste liegt ueber dem Feed statt darunter im Flex-Fluss: die
          Karten sind genau eine Bildschirmhoehe hoch, und snapToInterval haengt
          daran. Ein Balken im Fluss wuerde die Karten stauchen und das
          Einrasten beim Wischen verschieben. Die Karte haelt unten Platz frei.
        */}
        <View style={styles.tabBarWrap}>
          <TabBar active={tab} onChange={setTab} />
        </View>
      </View>
  );
}

export default function App() {
  // SafeAreaProvider muss laut Expo-57-Doku an der Wurzel stehen, sonst liefert
  // useSafeAreaInsets nur Nullen - und mit edgeToEdgeEnabled=true rutschte der
  // Inhalt unter die Systemleisten.
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <Shell />
      </I18nProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  brand: {
    ...type.title,
    fontSize: 18,
    color: colors.textPrimary,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 6,
  },
  searchBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  tabBarWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  center: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  errorTitle: {
    ...type.title,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  errorText: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  retryBtn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
  },
  retryBtnPressed: {
    backgroundColor: colors.accentPressed,
  },
  retryText: {
    ...type.seller,
    color: colors.textPrimary,
  },
});
