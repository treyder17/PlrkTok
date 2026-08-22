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
import { SafeAreaProvider } from "react-native-safe-area-context";
import FeedCard from "./FeedCard";
import TabBar, { TabKey } from "./TabBar";
import Placeholder from "./Placeholder";
import ProfileScreen from "./ProfileScreen";
import {
  Listing,
  fetchFeed,
  sendInteraction,
  setSaved,
  fetchSavedIds,
} from "./api";
import { colors, radius, spacing, type } from "./theme";

const { height } = Dimensions.get("window");

function Feed() {
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
      setError("Feed konnte nicht geladen werden.");
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Nur das Setzen melden - beim Abwaehlen waere ein zweites "like"
        // ein falsches Signal an den Algorithmus.
        sendInteraction(id, "like");
      }
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
        <Text style={styles.errorTitle}>Keine Verbindung</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          onPress={retry}
          style={({ pressed }) => [styles.retryBtn, pressed && styles.retryBtnPressed]}
        >
          <Text style={styles.retryText}>Erneut versuchen</Text>
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
      pagingEnabled
      showsVerticalScrollIndicator={false}
      snapToInterval={height}
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
  switch (tab) {
    case "home":
      return <Feed />;
    case "buyers":
      return (
        <Placeholder
          icon="people-outline"
          title="Käufer*innen"
          body="Hier siehst du, wer bei dir gekauft hat und welche Deals offen sind. Dafür muss dein Playerok-Konto verbunden sein."
        />
      );
    case "create":
      return (
        <Placeholder
          icon="add-circle-outline"
          title="Angebot erstellen"
          body="Neue Angebote legst du direkt bei Playerok an. Sobald dein Konto verbunden ist, geht das aus der App heraus."
          actionLabel="Bei Playerok öffnen"
          actionUrl="https://playerok.com/"
        />
      );
    case "inbox":
      return (
        <Placeholder
          icon="mail-outline"
          title="Posteingang"
          body="Nachrichten von Käufern und Verkäufern, Zusagen und Bestätigungen. Läuft über Playeroks Chat und braucht dein verbundenes Konto."
        />
      );
    case "profile":
      return <ProfileScreen />;
  }
}

export default function App() {
  const [tab, setTab] = useState<TabKey>("home");

  // SafeAreaProvider muss laut Expo-57-Doku an der Wurzel stehen, sonst liefert
  // useSafeAreaInsets in den Karten nur Nullen - und mit edgeToEdgeEnabled=true
  // rutschte der Inhalt unter die Systemleisten.
  return (
    <SafeAreaProvider>
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <Screen tab={tab} />
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
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
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
