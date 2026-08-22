import React, { useCallback, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Share, Alert } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Listing, sendShare } from "./api";
import { colors, spacing, type, formatPrice, formatCount } from "./theme";
import { useI18n } from "./i18n";

type Props = {
  item: Listing;
  liked: boolean;
  saved: boolean;
  onToggleLike: () => void;
  onToggleSave: () => void;
};

/**
 * Die Aktionsleiste rechts, wie bei TikTok: Like, Fragen, Merken, Teilen -
 * jeweils mit der Zahl ueber alle PlrkTok-Nutzer.
 */
export default function ActionRail({
  item,
  liked,
  saved,
  onToggleLike,
  onToggleSave,
}: Props) {
  const { t } = useI18n();
  const [shareBump, setShareBump] = useState(0);

  /*
    Die Server-Zahl enthaelt den eigenen Like schon mit, falls er beim Laden
    bestand. Die Anzeige darf daher nicht stumpf +1 rechnen, sondern nur die
    Differenz zum Ausgangszustand - sonst springt sie falsch, wenn man ein
    bereits geliktes Angebot abwaehlt.
  */
  const initialLiked = useRef(liked);
  const initialSaved = useRef(saved);
  const likeDelta = (liked ? 1 : 0) - (initialLiked.current ? 1 : 0);
  const saveDelta = (saved ? 1 : 0) - (initialSaved.current ? 1 : 0);

  const onShare = useCallback(async () => {
    try {
      // Native Share-API von React Native - braucht kein Extra-Paket. Android
      // ignoriert `url` in Share.share, deshalb steckt der Link in `message`.
      const result = await Share.share({
        message: `${item.title} - ${formatPrice(item.price, item.currency)}\n${item.profile_url}`,
      });
      // Nur zaehlen, wenn wirklich geteilt wurde. Bei Abbruch liefert Android
      // "dismissedAction" - das als Teilen zu buchen waere geschoenigt.
      if (result.action === Share.sharedAction) {
        setShareBump((n) => n + 1);
        sendShare(item.id).catch(() => {});
      }
    } catch {
      // Abbruch ist kein Fehler, den man dem Nutzer zeigen muss.
    }
  }, [item]);

  const onAsk = useCallback(() => {
    Alert.alert(t("ask.title"), t("ask.body"));
  }, [t]);

  return (
    <View style={styles.rail}>
      <RailButton
        icon={liked ? "heart" : "heart-outline"}
        label={t("rail.like")}
        count={item.like_count + likeDelta}
        active={liked}
        activeColor={colors.like}
        onPress={onToggleLike}
      />
      <RailButton icon="chatbubble-outline" label={t("rail.ask")} onPress={onAsk} muted />
      <RailButton
        icon={saved ? "bookmark" : "bookmark-outline"}
        label={saved ? t("rail.saved") : t("rail.save")}
        count={item.save_count + saveDelta}
        active={saved}
        activeColor={colors.accentLight}
        onPress={onToggleSave}
      />
      <RailButton
        icon="arrow-redo-outline"
        label={t("rail.share")}
        count={item.share_count + shareBump}
        onPress={onShare}
      />
    </View>
  );
}

function RailButton({
  icon,
  label,
  count,
  onPress,
  active,
  activeColor,
  muted,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  count?: number;
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

  const tint =
    active && activeColor ? activeColor : muted ? colors.textSecondary : colors.textPrimary;

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
      {count !== undefined && (
        <Text style={[styles.count, active && activeColor ? { color: activeColor } : null]}>
          {formatCount(count)}
        </Text>
      )}
      <Text style={styles.label} numberOfLines={1}>
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
    marginBottom: spacing.md,
    minWidth: 58,
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
    marginBottom: 3,
  },
  count: {
    ...type.label,
    fontSize: 12,
    color: colors.textPrimary,
  },
  label: {
    ...type.label,
    fontSize: 9,
    color: colors.textMuted,
  },
});
