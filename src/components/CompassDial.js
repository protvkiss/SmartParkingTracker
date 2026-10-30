import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Metrics, Palette } from "~/core/theme";

export default function CompassDial({ deviationDegrees = 0, isReady = false }) {
  return (
    <View style={styles.dialFrame}>
      {/* 4 hướng cơ bản */}
      <Text style={[styles.cardinalPoint, styles.north]}>B</Text>
      <Text style={[styles.cardinalPoint, styles.east]}>Đ</Text>
      <Text style={[styles.cardinalPoint, styles.south]}>N</Text>
      <Text style={[styles.cardinalPoint, styles.west]}>T</Text>

      {/* Vành tròn nội tâm */}
      <View style={styles.subRing} />
      <View style={styles.crosshairH} />
      <View style={styles.crosshairV} />

      {/* Mũi tên chỉ hướng xoay */}
      {isReady ? (
        <View
          style={[
            styles.pointerWrap,
            { transform: [{ rotate: `${deviationDegrees}deg` }] },
          ]}
        >
          <Ionicons name="navigate" size={118} color={Palette.brand} />
        </View>
      ) : (
        <View style={styles.waitingBlock}>
          <Ionicons name="compass-outline" size={60} color={Palette.inkSubtle} />
          <Text style={styles.waitingText}>Đang đọc cảm biến...</Text>
        </View>
      )}

      {/* Tâm điểm xe */}
      <View style={styles.carCore}>
        <Text style={styles.carCoreIcon}>🚗</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dialFrame: {
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: Palette.canvas,
    borderWidth: 3,
    borderColor: Palette.outline,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  subRing: {
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: Palette.separator,
    position: "absolute",
  },
  crosshairH: {
    position: "absolute",
    width: 200,
    height: 1,
    backgroundColor: Palette.separator,
  },
  crosshairV: {
    position: "absolute",
    height: 200,
    width: 1,
    backgroundColor: Palette.separator,
  },
  cardinalPoint: {
    position: "absolute",
    fontSize: Metrics.fontBase,
    fontWeight: "800",
    color: Palette.inkMuted,
  },
  north: {
    top: 8,
    color: Palette.danger,
  },
  east: {
    right: 12,
  },
  south: {
    bottom: 8,
  },
  west: {
    left: 12,
  },
  pointerWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  waitingBlock: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  waitingText: {
    fontSize: Metrics.fontXs,
    color: Palette.inkSubtle,
  },
  carCore: {
    position: "absolute",
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Palette.brand,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  carCoreIcon: {
    fontSize: 16,
  },
});
