import React, { useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Dimensions,
  Linking,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ActionRail from "./ActionRail";
import { Listing, sendInteraction } from "./api";
import { colors, radius, spacing, type, formatPrice } from "./theme";

const { height, width } = Dimensions.get("window");

/** Hoehe der Tab-Leiste, die als naechstes drunter kommt - Platz schon freihalten. */
const TAB_BAR_SPACE = 64;

type Props = {
  item: Listing;
  liked: boolean;
  saved: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
};

export default function FeedCard({
  item,
  liked,
  saved,
  onToggleLike,
  onToggleSave,
}: Props) {
  const insets = useSafeAreaInsets();

  const openProfile = useCallback(() => {
    sendInteraction(item.id, "profile_tap");
    Linking.openURL(item.profile_url);
  }, [item.id, item.profile_url]);


  return (
    <View style={styles.card}>
      {item.image_url ? (
        <>
          {/*
            Die API liefert nur eine 300px-Thumbnail mit signierter URL - groesser
            geht nicht, jede Aenderung am Pfad quittiert imgproxy mit 403.
            Formatfuellend gezogen wird das sichtbar matschig. Deshalb der uebliche
            Kniff: die Thumbnail stark unscharf als Hintergrund, das scharfe
            Original in Originalproportion darueber.
          */}
          <Image
            source={{ uri: item.image_url }}
            style={styles.backdrop}
            blurRadius={28}
          />
          <View style={styles.backdropTint} />
          <Image
            source={{ uri: item.image_url }}
            style={styles.image}
            resizeMode="contain"
          />
        </>
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Ionicons name="image-outline" size={44} color={colors.textMuted} />
          <Text style={styles.placeholderText}>{item.category}</Text>
        </View>
      )}

      {/* Scrim, damit die Schrift ueber jedem Motiv lesbar bleibt */}
      <LinearGradient
        colors={["transparent", "rgba(20,22,26,0.75)", colors.bgPrimary] as const}
        locations={[0, 0.55, 1] as const}
        style={styles.scrim}
        pointerEvents="none"
      />

      <View
        style={[
          styles.content,
          { paddingBottom: insets.bottom + TAB_BAR_SPACE + spacing.lg },
        ]}
      >
        <View style={styles.info}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>{item.category}</Text>
          </View>

          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>

          <Text style={styles.price}>
            {formatPrice(item.price, item.currency)}
          </Text>

          {item.seller_username && (
            <Pressable
              style={({ pressed }) => [styles.sellerRow, pressed && styles.pressed]}
              onPress={openProfile}
              hitSlop={6}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.seller_username.slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.seller} numberOfLines={1}>
                {item.seller_username}
              </Text>
            </Pressable>
          )}

          <Pressable
            onPress={openProfile}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaText}>Auf Playerok ansehen</Text>
            <Ionicons name="arrow-forward" size={17} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ActionRail
          item={item}
          liked={liked}
          saved={saved}
          onToggleLike={onToggleLike}
          onToggleSave={onToggleSave}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height,
    width,
    backgroundColor: colors.bgPrimary,
    justifyContent: "flex-end",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    resizeMode: "cover",
    transform: [{ scale: 1.15 }],
  },
  backdropTint: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(20,22,26,0.45)",
  },
  image: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  imagePlaceholder: {
    backgroundColor: colors.bgSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  scrim: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: height * 0.5,
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: spacing.lg,
  },
  info: {
    flex: 1,
    paddingRight: spacing.md,
  },
  chip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    marginBottom: spacing.md,
  },
  chipText: {
    ...type.label,
    color: colors.textPrimary,
    textTransform: "uppercase",
  },
  title: {
    ...type.title,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  price: {
    ...type.price,
    color: colors.price,
    marginBottom: spacing.md,
  },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  avatarText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  seller: {
    ...type.seller,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: 11,
    borderRadius: radius.pill,
  },
  ctaPressed: {
    backgroundColor: colors.accentPressed,
    transform: [{ scale: 0.97 }],
  },
  ctaText: {
    ...type.seller,
    color: colors.textPrimary,
  },
  pressed: {
    opacity: 0.6,
  },
});
