import React from "react";
import { View, Text, Image, StyleSheet, Pressable, Dimensions, Linking } from "react-native";
import { Listing, sendInteraction } from "./api";

const { height, width } = Dimensions.get("window");

export default function FeedCard({ item }: { item: Listing }) {
  const openProfile = () => {
    sendInteraction(item.id, "profile_tap");
    Linking.openURL(item.profile_url);
  };

  const onLike = () => {
    sendInteraction(item.id, "like");
  };

  return (
    <View style={styles.card}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderText}>{item.category}</Text>
        </View>
      )}

      <View style={styles.overlay}>
        <View style={styles.info}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.price}>
            {item.price} {item.currency}
          </Text>
          {item.seller_username && (
            <Text style={styles.seller}>@{item.seller_username}</Text>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.actionBtn} onPress={onLike}>
            <Text style={styles.actionText}>♥{"\n"}Like</Text>
          </Pressable>
          <Pressable style={styles.actionBtn} onPress={openProfile}>
            <Text style={styles.actionText}>👤{"\n"}Profil</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height,
    width,
    backgroundColor: "#111",
    justifyContent: "flex-end",
  },
  image: {
    ...StyleSheet.absoluteFill,
    resizeMode: "cover",
  },
  imagePlaceholder: {
    backgroundColor: "#222",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: "#666",
    fontSize: 18,
    textTransform: "uppercase",
  },
  overlay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    padding: 20,
    paddingBottom: 60,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  info: {
    flex: 1,
  },
  title: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  price: {
    color: "#4ade80",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 4,
  },
  seller: {
    color: "#ccc",
    fontSize: 14,
    marginTop: 4,
  },
  actions: {
    alignItems: "center",
  },
  actionBtn: {
    marginBottom: 16,
    alignItems: "center",
  },
  actionText: {
    color: "#fff",
    fontSize: 12,
    textAlign: "center",
  },
});
