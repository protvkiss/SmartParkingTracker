import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Metrics, Palette } from "~/core/theme";

export default function StatusPill({ isOccupied = false, style }) {
  return (
    <View
      style={[
        styles.pill,
        isOccupied ? styles.occupiedPill : styles.vacatedPill,
        style,
      ]}
    >
      <View style={[styles.glowRing, isOccupied ? styles.glowOccupied : styles.glowVacated]}>
        <View style={[styles.dot, isOccupied ? styles.dotOccupied : styles.dotVacated]} />
      </View>
      <Text style={[styles.text, isOccupied ? styles.textOccupied : styles.textVacated]}>
        {isOccupied ? "ĐANG ĐỖ" : "ĐÃ TRẢ Ô"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Metrics.radiusPill,
    gap: 6,
    borderWidth: 1,
  },
  occupiedPill: {
    backgroundColor: Palette.brandLight,
    borderColor: "rgba(37, 99, 235, 0.2)",
  },
  vacatedPill: {
    backgroundColor: Palette.positiveLight,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  glowRing: {
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  glowOccupied: {
    backgroundColor: "rgba(37, 99, 235, 0.25)",
  },
  glowVacated: {
    backgroundColor: "rgba(16, 185, 129, 0.25)",
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOccupied: {
    backgroundColor: Palette.brand,
  },
  dotVacated: {
    backgroundColor: Palette.positive,
  },
  text: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  textOccupied: {
    color: Palette.brandDark,
  },
  textVacated: {
    color: Palette.positive,
  },
});
