import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Dimensions,
  StyleSheet,
  ActivityIndicator,
  View,
  Text,
  StatusBar,
  ViewToken,
} from "react-native";
import FeedCard from "./FeedCard";
import { Listing, fetchFeed, sendInteraction } from "./api";

const { height } = Dimensions.get("window");

export default function App() {
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
    } catch (e) {
      setError("Feed konnte nicht geladen werden. Läuft das Backend?");
    } finally {
      isLoadingMore.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  center: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#f87171",
    fontSize: 16,
    textAlign: "center",
    padding: 20,
  },
});
