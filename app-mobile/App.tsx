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
import { Listing, fetchFeed, sendInteraction } from "./api";
import { colors, radius, spacing, type } from "./theme";

const { height } = Dimensions.get("window");

function Feed() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FeedCard item={item} />}
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
    </View>
  );
}

export default function App() {
  // SafeAreaProvider muss laut Expo-57-Doku an der Wurzel stehen, sonst liefert
  // useSafeAreaInsets in den Karten nur Nullen - und mit edgeToEdgeEnabled=true
  // rutschte der Inhalt unter die Systemleisten.
  return (
    <SafeAreaProvider>
      <Feed />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPrimary,
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
