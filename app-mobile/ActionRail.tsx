import React, { useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Share,
  Alert,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Listing, sendInteraction, setSaved } from "./api";
import { colors, spacing, type, formatPrice } from "./theme";

type Props = {
  item: Listing;
  liked: boolean;
  saved: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
};

/**
 * Die Aktionsleiste rechts, wie bei TikTok: Like, Kommentare, Merken, Teilen.
 */
export default function ActionRail({
  item,
  liked,
  saved,
  onToggleLike,
  onToggleSave,
}: Props) {
  const onShare = useCallback(async () => {
    try {
      // Native Share-API von React Native - braucht kein Extra-Paket. Android
      // ignoriert `url` in Share.share, deshalb steckt der Link in `message`.
      await Share.share({
        message: `${item.title} - ${formatPrice(item.price, item.currency)}\n${item.profile_url}`,
      });
      sendInteraction(item.id, "profile_tap");
    } catch {
      // Abbruch durch den Nutzer ist kein Fehler, den man ihm zeigen muss.
    }
  }, [item]);

  const onComments = useCallback(() => {
    // Playerok hat keine Kommentare an Angeboten: Review haengt an einem
    // abgeschlossenen Deal, und abrufbar sind ueber die API nur die eigenen
    // (get_my_reviews). Das Gegenstueck ist Playeroks Chat mit dem Verkaeufer -
    // der braucht aber den Konto-Login.
    Alert.alert(
      "Noch nicht verfügbar",
      "Fragen an Verkäufer laufen über den Playerok-Chat. Dafür musst du dein Playerok-Konto verbinden - das kommt im nächsten Schritt.",
    );
  }, []);

  return (
    <View style={styles.rail}>
      <RailButton
        icon={liked ? "heart" : "heart-outline"}
        label="Like"
        active={liked}
        activeColor={colors.like}
        onPress={onToggleLike}
      />
      <RailButton icon="chatbubble-outline" label="Fragen" onPress={onComments} muted />
      <RailButton
        icon={saved ? "bookmark" : "bookmark-outline"}
        label={saved ? "Gemerkt" : "Merken"}
        active={saved}
        activeColor={colors.accentLight}
        onPress={onToggleSave}
      />
      <RailButton icon="arrow-redo-outline" label="Teilen" onPress={onShare} />
    </View>
  );
}

function RailButton({
  icon,
  label,
  onPress,
  active,
  activeColor,
  muted,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  active?: boolean;
  activeColor?: string;
  muted?: boolean;
}) {
  const pop = useRef(new Animated.Value(1)).current;

  const handle = useCallback(() => {
    // Kurzer Federpuls: ohne sichtbare Reaktion fuehlt sich ein Tap wie
    // verschluckt an, selbst wenn er ankommt.
    pop.setValue(0.82);
    Animated.spring(pop, {
      toValue: 1,
      friction: 3,
      tension: 190,
      useNativeDriver: true,
    }).start();
    onPress();
  }, [onPress, pop]);

  const tint = active && activeColor ? activeColor : muted ? colors.textSecondary : colors.textPrimary;

  return (
    <Pressable
      onPress={handle}
      hitSlop={10}
      style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
    >
      <Animated.View
        style={[
          styles.circle,
          active && activeColor ? { borderColor: activeColor } : null,
          { transform: [{ scale: pop }] },
        ]}
      >
        <Ionicons name={icon} size={25} color={tint} />
      </Animated.View>
      <Text style={[styles.label, active && activeColor ? { color: activeColor } : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  rail: {
    alignItems: "center",
  },
  btn: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  pressed: {
    opacity: 0.6,
  },
  circle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.13)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  label: {
    ...type.label,
    color: colors.textPrimary,
  },
});
