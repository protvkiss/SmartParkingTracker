import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Metrics, Palette } from "~/core/theme";

export default function SpecRow({
  caption,
  val,
  icon = null,
  noBorder = false,
  isHud = false,
}) {
  if (!val && val !== 0) return null;

  return (
    <View
      style={[
        styles.container,
        !noBorder && (isHud ? styles.hudDivider : styles.bottomDivider),
      ]}
    >
      <View style={styles.captionRow}>
        {icon ? <View style={styles.iconMargin}>{icon}</View> : null}
        <Text style={[styles.captionText, isHud && styles.hudCaption]}>{caption}</Text>
      </View>

      {typeof val === "string" || typeof val === "number" ? (
        <Text style={[styles.valText, isHud && styles.hudVal]}>{val}</Text>
      ) : (
        val
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    gap: 4,
  },
  captionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconMargin: {
    marginRight: 6,
  },
  bottomDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Palette.separator,
  },
  hudDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Palette.hudBorder,
  },
  captionText: {
    fontSize: Metrics.fontXs,
    color: Palette.inkMuted,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  hudCaption: {
    color: Palette.hudMuted,
  },
  valText: {
    fontSize: Metrics.fontBase,
    color: Palette.inkHeading,
    fontWeight: "600",
  },
  hudVal: {
    color: Palette.hudText,
  },
});
