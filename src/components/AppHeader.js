import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Elevation, Metrics, Palette } from "~/core/theme";

export default function AppHeader({
  title,
  subtitle,
  onGoBack,
  actionSlot,
  variant = "light", // 'light' | 'hud' | 'brand'
}) {
  const insets = useSafeAreaInsets();
  const isHud = variant === "hud";
  const isBrand = variant === "brand";

  const getContainerStyle = () => {
    if (isHud) return styles.headerHud;
    if (isBrand) return styles.headerBrand;
    return styles.headerLight;
  };

  const getTitleColor = () => {
    if (isHud || isBrand) return "#FFFFFF";
    return Palette.inkHeading;
  };

  const getSubtitleColor = () => {
    if (isHud) return Palette.hudMuted;
    if (isBrand) return "rgba(255, 255, 255, 0.8)";
    return Palette.inkMuted;
  };

  const getIconColor = () => {
    if (isHud || isBrand) return "#FFFFFF";
    return Palette.inkHeading;
  };

  return (
    <View
      style={[
        styles.headerBox,
        getContainerStyle(),
        { paddingTop: insets.top > 0 ? insets.top + 8 : 16 },
      ]}
    >
      <View style={styles.topRow}>
        {onGoBack ? (
          <Pressable
            onPress={onGoBack}
            style={({ pressed }) => [
              styles.backBtn,
              isHud ? styles.backBtnHud : isBrand ? styles.backBtnBrand : styles.backBtnLight,
              pressed && styles.backBtnPressed,
            ]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
          >
            <Ionicons name="arrow-back" size={20} color={getIconColor()} />
          </Pressable>
        ) : (
          <View style={styles.placeholderBtn} />
        )}

        <View style={styles.titleStack}>
          <Text style={[styles.titleText, { color: getTitleColor() }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitleText, { color: getSubtitleColor() }]} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {actionSlot ? (
          <View style={styles.actionSlotWrap}>{actionSlot}</View>
        ) : (
          <View style={styles.placeholderBtn} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBox: {
    paddingHorizontal: Metrics.gapMd,
    paddingBottom: Metrics.gapSm + 6,
    zIndex: 10,
  },
  headerLight: {
    backgroundColor: Palette.card,
    borderBottomWidth: 1,
    borderBottomColor: Palette.outlineLight,
    ...Elevation.flat,
  },
  headerHud: {
    backgroundColor: Palette.hudBg,
    borderBottomWidth: 1,
    borderBottomColor: Palette.hudBorder,
  },
  headerBrand: {
    backgroundColor: Palette.brand,
    ...Elevation.raised,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: Metrics.radiusSm + 2,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnLight: {
    backgroundColor: Palette.cardSubtle,
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  backBtnHud: {
    backgroundColor: Palette.hudCard,
    borderWidth: 1,
    borderColor: Palette.hudBorder,
  },
  backBtnBrand: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  backBtnPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.95 }],
  },
  placeholderBtn: {
    width: 40,
    height: 40,
  },
  actionSlotWrap: {
    minWidth: 40,
    height: 40,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  titleStack: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  titleText: {
    fontSize: Metrics.fontLg,
    fontWeight: "800",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  subtitleText: {
    fontSize: Metrics.fontXs,
    marginTop: 2,
    fontWeight: "500",
    textAlign: "center",
  },
});
