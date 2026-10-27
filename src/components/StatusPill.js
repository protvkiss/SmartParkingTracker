import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Metrics, Palette } from "~/core/theme";

export default function StatusPill({ isOccupied = false }) {
  return (
    <View style={[styles.pill, isOccupied ? styles.occupiedPill : styles.vacatedPill]}>
      <View style={[styles.dot, isOccupied ? styles.dotOccupied : styles.dotVacated]} />
      <Text style={[styles.text, isOccupied ? styles.textOccupied : styles.textVacated]}>
        {isOccupied ? "Đang đỗ" : "Đã trả ô"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Metrics.radiusPill,
    gap: 5,
  },
  occupiedPill: {
    backgroundColor: Palette.brandLight,
  },
  vacatedPill: {
    backgroundColor: Palette.positiveSoft,
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
    fontSize: Metrics.fontXs,
    fontWeight: "700",
  },
  textOccupied: {
    color: Palette.brandDark,
  },
  textVacated: {
    color: Palette.positive,
  },
});
