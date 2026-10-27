import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Metrics, Palette } from "~/core/theme";

export default function ActionButton({
  label,
  onPress,
  kind = "filled", // filled | tinted | destructive | bordered
  scale = "md", // sm | md | lg
  icon = null,
  loading = false,
  disabled = false,
  style,
  textStyle,
}) {
  const isEnabled = !disabled && !loading;

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
        <ActivityIndicator
          size="small"
          color={kind === "bordered" ? Palette.brand : "#FFFFFF"}
        />
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
    marginRight: 6,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.45,
  },

  // Kinds
  kind_filled: {
    backgroundColor: Palette.brand,
  },
  kind_tinted: {
    backgroundColor: Palette.accent,
  },
  kind_destructive: {
    backgroundColor: Palette.danger,
  },
  kind_bordered: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: Palette.brand,
  },

  // Scales
  scale_sm: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    minHeight: 36,
  },
  scale_md: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    minHeight: 46,
  },
  scale_lg: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    minHeight: 52,
  },

  // Label styles
  label: {
    fontWeight: "700",
    textAlign: "center",
  },
  labelKind_filled: {
    color: "#FFFFFF",
  },
  labelKind_tinted: {
    color: "#FFFFFF",
  },
  labelKind_destructive: {
    color: "#FFFFFF",
  },
  labelKind_bordered: {
    color: Palette.brand,
  },

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
