import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Elevation, Metrics, Palette } from "~/core/theme";

export default function ActionButton({
  label,
  onPress,
  kind = "filled", // filled | tinted | accent | success | destructive | bordered | hud
  scale = "md", // sm | md | lg
  icon = null,
  loading = false,
  disabled = false,
  style,
  textStyle,
}) {
  const isEnabled = !disabled && !loading;

  const getSpinnerColor = () => {
    if (kind === "bordered") return Palette.brand;
    if (kind === "tinted") return Palette.brandDark;
    if (kind === "hud") return Palette.hudGlow;
    return "#FFFFFF";
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={!isEnabled}
      style={({ pressed }) => [
        styles.base,
        styles[`kind_${kind}`],
        styles[`scale_${scale}`],
        !isEnabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={getSpinnerColor()} />
      ) : (
        <View style={styles.innerFlex}>
          {icon ? <View style={styles.iconMargin}>{icon}</View> : null}
          <Text
            numberOfLines={1}
            style={[
              styles.label,
              styles[`labelKind_${kind}`],
              styles[`labelScale_${scale}`],
              textStyle,
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Metrics.radiusMd,
    alignItems: "center",
    justifyContent: "center",
  },
  innerFlex: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  iconMargin: {
    marginRight: 8,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.45,
  },

  // Button Kinds
  kind_filled: {
    backgroundColor: Palette.brand,
    ...Elevation.flat,
  },
  kind_tinted: {
    backgroundColor: Palette.brandLight,
  },
  kind_accent: {
    backgroundColor: Palette.accent,
    ...Elevation.flat,
  },
  kind_success: {
    backgroundColor: Palette.positive,
    ...Elevation.flat,
  },
  kind_destructive: {
    backgroundColor: Palette.danger,
    ...Elevation.flat,
  },
  kind_bordered: {
    backgroundColor: Palette.card,
    borderWidth: 1.5,
    borderColor: Palette.outline,
  },
  kind_hud: {
    backgroundColor: Palette.hudCard,
    borderWidth: 1.5,
    borderColor: Palette.hudBorder,
  },

  // Button Scales
  scale_sm: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 38,
    borderRadius: Metrics.radiusSm,
  },
  scale_md: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 46,
    borderRadius: Metrics.radiusMd,
  },
  scale_lg: {
    paddingVertical: 15,
    paddingHorizontal: 22,
    minHeight: 52,
    borderRadius: Metrics.radiusMd,
  },

  // Labels
  label: {
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  labelKind_filled: {
    color: "#FFFFFF",
  },
  labelKind_tinted: {
    color: Palette.brandDark,
  },
  labelKind_accent: {
    color: "#FFFFFF",
  },
  labelKind_success: {
    color: "#FFFFFF",
  },
  labelKind_destructive: {
    color: "#FFFFFF",
  },
  labelKind_bordered: {
    color: Palette.inkHeading,
  },
  labelKind_hud: {
    color: Palette.hudText,
  },

  // Label Scales
  labelScale_sm: {
    fontSize: Metrics.fontSm,
  },
  labelScale_md: {
    fontSize: Metrics.fontBase,
  },
  labelScale_lg: {
    fontSize: Metrics.fontLg,
  },
});
