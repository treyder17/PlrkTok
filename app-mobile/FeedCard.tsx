import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  Dimensions,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Listing, sendInteraction } from "./api";
import { colors, radius, spacing, type, formatPrice } from "./theme";

const { height, width } = Dimensions.get("window");

/** Hoehe der Tab-Leiste, die als naechstes drunter kommt - Platz schon freihalten. */
const TAB_BAR_SPACE = 64;

export default function FeedCard({ item }: { item: Listing }) {
  const insets = useSafeAreaInsets();

  const openProfile = () => {
    sendInteraction(item.id, "profile_tap");
    Linking.openURL(item.profile_url);
  };

  const onLike = () => sendInteraction(item.id, "like");

  return (
    <View style={styles.card}>
      {item.image_url ? (
        <>
          {/*
            Die API liefert nur eine 300px-Thumbnail mit signierter URL - groesser
            geht nicht, jede Aenderung am Pfad quittiert imgproxy mit 403. Formatfuellend
            gezogen wird das sichtbar matschig. Deshalb der uebliche Kniff: die
            Thumbnail stark unscharf als Hintergrund, das scharfe Original in
            Originalproportion darueber. Die Unschaerfe liest sich als Absicht,
            das Motiv bleibt knackig.
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
            <Pressable style={styles.sellerRow} onPress={openProfile}>
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
        </View>

        <View style={styles.actions}>
          <ActionButton label="Like" glyph="♥" onPress={onLike} tint={colors.like} />
          <ActionButton label="Ansehen" glyph="→" onPress={openProfile} />
        </View>
      </View>
    </View>
  );
}

function ActionButton({
  label,
  glyph,
  onPress,
  tint,
}: {
  label: string;
  glyph: string;
  onPress: () => void;
  tint?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
      hitSlop={8}
    >
      <View style={styles.actionCircle}>
        <Text style={[styles.actionGlyph, tint ? { color: tint } : null]}>
          {glyph}
        </Text>
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
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
    fontSize: 16,
    textTransform: "uppercase",
    letterSpacing: 1,
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
  actions: {
    alignItems: "center",
  },
  actionBtn: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  actionBtnPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.94 }],
  },
  actionCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.14)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  actionGlyph: {
    fontSize: 22,
    color: colors.textPrimary,
    lineHeight: 26,
  },
  actionLabel: {
    ...type.label,
    color: colors.textPrimary,
  },
});
