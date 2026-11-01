import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Elevation, Metrics, Palette } from "~/core/theme";
import { wrapAngle360 } from "~/utils/geoMath";

export default function CompassDial({ deviationDegrees = 0, isReady = false }) {
  const normDev = wrapAngle360(deviationDegrees);
  // Coi như đã hướng thẳng vào xe khi góc lệch trong khoảng +- 8 độ
  const isAligned = normDev <= 8 || normDev >= 352;

  // Ionicons 'navigate' có góc vẽ gốc nghiêng sẵn 45 độ sang phải (Đông Bắc),
  // nên cần trừ 45 độ để khi góc lệch = 0 độ, mũi tên sẽ chỉ THẲNG ĐỨNG lên đỉnh (12 giờ).
  const correctedAngle = deviationDegrees - 45;

  const needleColor = isAligned ? Palette.positive : Palette.brand;

  return (
    <View style={styles.dialFrame}>
      {/* Vành ngoài đa tầng phong cách ra-đa sáng */}
      <View style={styles.outerBorderRing} />
      <View style={styles.midDashedRing} />
      <View style={styles.innerGuideRing} />

      {/* Trục chữ thập định vị mờ */}
      <View style={styles.crosshairH} />
      <View style={styles.crosshairV} />

      {/* 4 hướng cơ bản (B - Bắc, Đ - Đông, N - Nam, T - Tây) */}
      <View style={[styles.cardinalBadge, styles.north]}>
        <Text style={[styles.cardinalPoint, styles.northText]}>B</Text>
      </View>
      <View style={[styles.cardinalBadge, styles.east]}>
        <Text style={styles.cardinalPoint}>Đ</Text>
      </View>
      <View style={[styles.cardinalBadge, styles.south]}>
        <Text style={styles.cardinalPoint}>N</Text>
      </View>
      <View style={[styles.cardinalBadge, styles.west]}>
        <Text style={styles.cardinalPoint}>T</Text>
      </View>

      {/* Kim la bàn xoay chỉ hướng tới xe */}
      {isReady ? (
        <View
          style={[
            styles.pointerWrap,
            { transform: [{ rotate: `${correctedAngle}deg` }] },
          ]}
        >
          <View style={[styles.pointerGlow, isAligned && styles.pointerGlowAligned]}>
            <Ionicons name="navigate" size={110} color={needleColor} />
          </View>
        </View>
      ) : (
        <View style={styles.waitingBlock}>
          <Ionicons name="compass-outline" size={54} color={Palette.inkSubtle} />
          <Text style={styles.waitingText}>Đang đọc cảm biến...</Text>
        </View>
      )}

      {/* Tâm điểm xe */}
      <View style={[styles.carCore, isAligned && styles.carCoreAligned]}>
        <Ionicons name="car" size={18} color="#FFFFFF" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dialFrame: {
    width: 270,
    height: 270,
    borderRadius: 135,
    backgroundColor: Palette.card,
    borderWidth: 2,
    borderColor: Palette.outline,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...Elevation.raised,
  },
  outerBorderRing: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.12)",
  },
  midDashedRing: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(148, 163, 184, 0.35)",
  },
  innerGuideRing: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.1)",
  },
  crosshairH: {
    position: "absolute",
    width: 220,
    height: 1,
    backgroundColor: "rgba(148, 163, 184, 0.25)",
  },
  crosshairV: {
    position: "absolute",
    height: 220,
    width: 1,
    backgroundColor: "rgba(148, 163, 184, 0.25)",
  },
  cardinalBadge: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardinalPoint: {
    fontSize: Metrics.fontSm,
    fontWeight: "900",
    color: Palette.inkMuted,
    letterSpacing: 0.5,
  },
  north: {
    top: 8,
  },
  northText: {
    color: Palette.danger,
    fontWeight: "900",
  },
  east: {
    right: 8,
  },
  south: {
    bottom: 8,
  },
  west: {
    left: 8,
  },
  pointerWrap: {
    alignItems: "center",
    justifyContent: "center",
    width: 160,
    height: 160,
  },
  pointerGlow: {
    shadowColor: Palette.brand,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  pointerGlowAligned: {
    shadowColor: Palette.positive,
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  waitingBlock: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  waitingText: {
    fontSize: Metrics.fontXs,
    color: Palette.inkSubtle,
    fontWeight: "600",
  },
  carCore: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "#FFFFFF",
    ...Elevation.raised,
  },
  carCoreAligned: {
    backgroundColor: Palette.positive,
  },
});
