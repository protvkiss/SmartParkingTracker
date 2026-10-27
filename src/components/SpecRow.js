import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Metrics, Palette } from "~/core/theme";

export default function SpecRow({ caption, val, noBorder = false }) {
  if (!val && val !== 0) return null;

  return (
    <View style={[styles.container, !noBorder && styles.bottomDivider]}>
      <Text style={styles.captionText}>{caption}</Text>
      {typeof val === "string" || typeof val === "number" ? (
        <Text style={styles.valText}>{val}</Text>
      ) : (
        val
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    gap: 3,
  },
  bottomDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Palette.separator,
  },
  captionText: {
    fontSize: Metrics.fontXs,
    color: Palette.inkMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  valText: {
    fontSize: Metrics.fontBase,
    color: Palette.inkHeading,
    fontWeight: "500",
  },
});
