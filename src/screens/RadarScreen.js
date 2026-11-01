import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import ActionButton from "~/components/ActionButton";
import AppHeader from "~/components/AppHeader";
import AppSpinner from "~/components/AppSpinner";
import CompassDial from "~/components/CompassDial";
import { APP_CONFIG } from "~/core/config";
import { Elevation, Metrics, Palette } from "~/core/theme";
import { useRadarSensors } from "~/hooks/useRadarSensors";
import { launchExternalDirections } from "~/services/mapLauncher";
import { useParkingStore } from "~/state/ParkingStore";
import {
  computeAzimuthBearing,
  computeDeviationAngle,
  computeSurfaceDistance,
  formatMetricDistance,
  resolveCardinalSector,
  wrapAngle360,
} from "~/utils/geoMath";
import { composeSpotTag } from "~/utils/stringFormat";

function evaluateSensorQuality(grade) {
  if (grade === null || grade === undefined) return "Đang đọc";
  if (grade >= 3) return "Rất tốt";
  if (grade === 2) return "Trung bình";
  if (grade === 1) return "Thấp";
  return "Cần hiệu chỉnh";
}

export default function RadarScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { recordId } = route.params;
  const { sessionLogs } = useParkingStore();
  const {
    deviceCoords,
    headingDegrees,
    headingCalibration,
    gpsError,
    compassError,
    initializing,
    reSync,
  } = useRadarSensors();

  const record = sessionLogs.find((r) => r.id === recordId);

  if (!record) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <AppHeader title="La bàn tìm xe" onGoBack={() => navigation.goBack()} />
        <View style={styles.emptyNotice}>
          <Text style={styles.emptyNoticeText}>Không tìm thấy thông tin vị trí xe.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Khoảng cách theo mét
  const metersAway = deviceCoords
    ? computeSurfaceDistance(deviceCoords, record.position)
    : null;

  // Góc phương vị tới xe (Bearing)
  const bearingAngle = deviceCoords
    ? computeAzimuthBearing(deviceCoords, record.position)
    : null;

  // Góc lệch xoay kim la bàn (Deviation)
  const pointerRotation =
    bearingAngle !== null && headingDegrees !== null
      ? computeDeviationAngle(bearingAngle, headingDegrees)
      : 0;

  const normDev = wrapAngle360(pointerRotation);
  // Trạng thái đã chĩa đúng hướng xe (sai số +- 8 độ)
  const isAligned = normDev <= 8 || normDev >= 352;

  // Mô tả góc lệch trực quan cho người dùng
  const getDeviationDesc = () => {
    if (bearingAngle === null || headingDegrees === null) return "Đang tính...";
    if (isAligned) return "Chuẩn hướng (0°)";
    if (normDev < 180) {
      return `Lệch phải ${Math.round(normDev)}°`;
    }
    return `Lệch trái ${Math.round(360 - normDev)}°`;
  };

  const isWithinProximity =
    metersAway !== null && metersAway <= APP_CONFIG.PROXIMITY_ALERT_THRESHOLD_METERS;

  const spotTag = composeSpotTag(record);

  const onOpenMap = () => {
    launchExternalDirections(
      record.position.latitude,
      record.position.longitude,
      record.locationName,
    );
  };

  if (initializing && !deviceCoords) {
    return <AppSpinner coversScreen notice="Đang kích hoạt radar & cảm biến định vị..." />;
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={["bottom"]}>
      <AppHeader
        title="Ra-đa & La bàn tìm xe"
        onGoBack={() => navigation.goBack()}
        actionSlot={
          <Pressable
            onPress={reSync}
            style={({ pressed }) => [styles.syncBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Đồng bộ lại cảm biến"
          >
            <Ionicons name="refresh-outline" size={20} color={Palette.brand} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scrollArea, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner hiển thị Khoảng cách lớn phong cách sáng */}
        <View style={[styles.distanceHeroCard, isWithinProximity && styles.distanceHeroNearby]}>
          <View style={styles.proximityStatusRow}>
            <View
              style={[
                styles.pulseIndicator,
                isWithinProximity || isAligned ? styles.pulseNearby : styles.pulseActive,
              ]}
            />
            <Text
              style={[
                styles.proximityStatusText,
                isWithinProximity || isAligned ? styles.statusNearbyText : styles.statusActiveText,
              ]}
            >
              {isWithinProximity
                ? "🎉 BẠN ĐÃ Ở RẤT GẦN XE"
                : isAligned
                  ? "🎯 ĐÃ HƯỚNG ĐÚNG XE • HÃY ĐI THẲNG"
                  : "ĐANG DẪN ĐƯỜNG TỚI XE"}
            </Text>
          </View>

          <View style={styles.hugeDistanceRow}>
            <Text style={[styles.hugeDistanceNumber, isWithinProximity && styles.hugeDistanceNearby]}>
              {metersAway !== null ? formatMetricDistance(metersAway) : "--"}
            </Text>
          </View>

          <Text style={styles.targetVehicleCaption} numberOfLines={2}>
            Mục tiêu: {record.locationName}
          </Text>

          {spotTag ? (
            <View style={styles.targetTagBadge}>
              <Ionicons name="car-outline" size={13} color={Palette.brand} />
              <Text style={styles.targetTagText}>{spotTag}</Text>
            </View>
          ) : null}
        </View>

        {/* Khung mặt đồng hồ la bàn xoay sáng */}
        <View style={styles.compassContainer}>
          <CompassDial
            deviationDegrees={pointerRotation}
            isReady={bearingAngle !== null && headingDegrees !== null}
          />

          <View style={[styles.instructionBox, isAligned && styles.instructionBoxAligned]}>
            <Ionicons
              name={isAligned ? "checkmark-circle" : "compass-outline"}
              size={18}
              color={isAligned ? Palette.positive : Palette.inkMuted}
            />
            <Text style={[styles.compassInstruction, isAligned && styles.compassInstructionAligned]}>
              {isAligned
                ? "Chính xác! Đầu điện thoại đang chĩa thẳng vào xe. Hãy tiến lên phía trước."
                : "Cầm điện thoại nằm ngang và quay người sao cho mũi tên chĩa thẳng lên phía trước."}
            </Text>
          </View>
        </View>

        {/* Lưới 4 thông số cảm biến trực quan, giải thích rõ nghĩa */}
        <View style={styles.telemetrySection}>
          <Text style={styles.sectionHeaderTitle}>CHỈ SỐ ĐỊNH VỊ THỜI GIAN THỰC</Text>
          <View style={styles.telemetryGrid}>
            {/* 1. Hướng xe (Bearing) */}
            <View style={styles.telemetryBox}>
              <View style={styles.telemetryHeader}>
                <View style={[styles.iconCircle, { backgroundColor: Palette.brandLight }]}>
                  <Ionicons name="location" size={15} color={Palette.brand} />
                </View>
                <View style={styles.telemetryHeaderTexts}>
                  <Text style={styles.telemetryKey}>VỊ TRÍ XE</Text>
                  <Text style={styles.telemetrySubKey}>Góc phương vị</Text>
                </View>
              </View>
              <Text style={styles.telemetryVal}>
                {bearingAngle !== null
                  ? `${resolveCardinalSector(bearingAngle)} • ${Math.round(bearingAngle)}°`
                  : "--"}
              </Text>
            </View>

            {/* 2. Hướng đầu máy (Heading) */}
            <View style={styles.telemetryBox}>
              <View style={styles.telemetryHeader}>
                <View style={[styles.iconCircle, { backgroundColor: Palette.accentLight }]}>
                  <Ionicons name="phone-portrait" size={15} color={Palette.accent} />
                </View>
                <View style={styles.telemetryHeaderTexts}>
                  <Text style={styles.telemetryKey}>HƯỚNG ĐIỆN THOẠI</Text>
                  <Text style={styles.telemetrySubKey}>Đỉnh máy đang quay</Text>
                </View>
              </View>
              <Text style={styles.telemetryVal}>
                {headingDegrees !== null
                  ? `${resolveCardinalSector(headingDegrees)} • ${Math.round(headingDegrees)}°`
                  : "--"}
              </Text>
            </View>

            {/* 3. Lệch hướng (Deviation) */}
            <View style={[styles.telemetryBox, isAligned && styles.telemetryBoxAligned]}>
              <View style={styles.telemetryHeader}>
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: isAligned ? Palette.positiveLight : Palette.cardSubtle },
                  ]}
                >
                  <Ionicons
                    name={isAligned ? "checkmark" : "swap-horizontal"}
                    size={15}
                    color={isAligned ? Palette.positive : Palette.inkBody}
                  />
                </View>
                <View style={styles.telemetryHeaderTexts}>
                  <Text style={[styles.telemetryKey, isAligned && { color: Palette.positive }]}>
                    LỆCH HƯỚNG
                  </Text>
                  <Text style={styles.telemetrySubKey}>Chênh lệch góc</Text>
                </View>
              </View>
              <Text style={[styles.telemetryVal, isAligned && { color: Palette.positive }]}>
                {getDeviationDesc()}
              </Text>
            </View>

            {/* 4. Sai số GPS */}
            <View style={styles.telemetryBox}>
              <View style={styles.telemetryHeader}>
                <View style={[styles.iconCircle, { backgroundColor: Palette.alertLight }]}>
                  <Ionicons name="navigate-circle" size={15} color={Palette.alert} />
                </View>
                <View style={styles.telemetryHeaderTexts}>
                  <Text style={styles.telemetryKey}>SAI SỐ GPS</Text>
                  <Text style={styles.telemetrySubKey}>
                    La bàn: {evaluateSensorQuality(headingCalibration)}
                  </Text>
                </View>
              </View>
              <Text style={styles.telemetryVal}>
                {deviceCoords?.accuracy ? `± ${Math.round(deviceCoords.accuracy)}m` : "Đang lấy"}
              </Text>
            </View>
          </View>
        </View>

        {/* Cảnh báo nếu có lỗi GPS / Compass */}
        {gpsError || compassError ? (
          <View style={styles.errorNoticeBox}>
            <Ionicons name="alert-circle-outline" size={16} color={Palette.danger} />
            <Text style={styles.errorNoticeText}>{gpsError || compassError}</Text>
          </View>
        ) : null}

        {/* Nút mở bản đồ chuyển tiếp */}
        <ActionButton
          label="Mở Google Maps chỉ đường"
          icon={<Ionicons name="map-outline" size={18} color="#FFFFFF" />}
          onPress={onOpenMap}
          kind="filled"
          scale="lg"
          style={styles.openMapBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  scrollArea: {
    padding: 16,
    gap: 16,
  },
  syncBtn: {
    width: 38,
    height: 38,
    borderRadius: Metrics.radiusSm,
    backgroundColor: Palette.cardSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  emptyNotice: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyNoticeText: {
    color: Palette.inkMuted,
    fontSize: Metrics.fontBase,
  },
  distanceHeroCard: {
    backgroundColor: Palette.card,
    borderRadius: Metrics.radiusLg,
    padding: 18,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Palette.outline,
    gap: 8,
    ...Elevation.flat,
  },
  distanceHeroNearby: {
    borderColor: "rgba(16, 185, 129, 0.4)",
    backgroundColor: Palette.positiveLight,
  },
  proximityStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pulseIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  pulseActive: {
    backgroundColor: Palette.brand,
  },
  pulseNearby: {
    backgroundColor: Palette.positive,
  },
  proximityStatusText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  statusActiveText: {
    color: Palette.brandDark,
  },
  statusNearbyText: {
    color: Palette.positive,
  },
  hugeDistanceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
  },
  hugeDistanceNumber: {
    fontSize: 40,
    fontWeight: "900",
    color: Palette.inkHeading,
    letterSpacing: -1,
  },
  hugeDistanceNearby: {
    color: Palette.positive,
  },
  targetVehicleCaption: {
    fontSize: Metrics.fontSm,
    color: Palette.inkMuted,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  targetTagBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.brandLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Metrics.radiusPill,
    gap: 5,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.2)",
  },
  targetTagText: {
    fontSize: Metrics.fontXs,
    fontWeight: "700",
    color: Palette.brandDark,
  },
  compassContainer: {
    alignItems: "center",
    paddingVertical: 6,
    gap: 14,
  },
  instructionBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.card,
    borderRadius: Metrics.radiusPill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Palette.outline,
    gap: 8,
    maxWidth: 340,
    ...Elevation.flat,
  },
  instructionBoxAligned: {
    backgroundColor: Palette.positiveLight,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  compassInstruction: {
    flex: 1,
    color: Palette.inkMuted,
    fontSize: Metrics.fontXs,
    lineHeight: 16,
    fontWeight: "600",
  },
  compassInstructionAligned: {
    color: Palette.positive,
    fontWeight: "700",
  },
  telemetrySection: {
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: Metrics.fontXs,
    fontWeight: "800",
    color: Palette.inkMuted,
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  telemetryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  telemetryBox: {
    width: "48.5%",
    backgroundColor: Palette.card,
    padding: 12,
    borderRadius: Metrics.radiusMd,
    borderWidth: 1,
    borderColor: Palette.outline,
    gap: 6,
    ...Elevation.flat,
  },
  telemetryBoxAligned: {
    backgroundColor: Palette.positiveLight,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  telemetryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  telemetryHeaderTexts: {
    flex: 1,
  },
  telemetryKey: {
    fontSize: 9,
    fontWeight: "800",
    color: Palette.inkHeading,
    letterSpacing: 0.5,
  },
  telemetrySubKey: {
    fontSize: 9,
    color: Palette.inkMuted,
    fontWeight: "500",
  },
  telemetryVal: {
    fontSize: Metrics.fontBase,
    fontWeight: "800",
    color: Palette.inkHeading,
    marginTop: 2,
  },
  errorNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.dangerLight,
    padding: 10,
    borderRadius: Metrics.radiusSm,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  errorNoticeText: {
    flex: 1,
    color: Palette.danger,
    fontSize: Metrics.fontXs,
  },
  openMapBtn: {
    marginTop: 4,
  },
});
