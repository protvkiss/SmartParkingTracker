import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import ActionButton from "~/components/ActionButton";
import AppHeader from "~/components/AppHeader";
import AppSpinner from "~/components/AppSpinner";
import CompassDial from "~/components/CompassDial";
import SpecRow from "~/components/SpecRow";
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
} from "~/utils/geoMath";
import { composeSpotTag } from "~/utils/stringFormat";

function evaluateSensorQuality(grade) {
  if (grade === null || grade === undefined) return "Đang đọc tín hiệu";
  if (grade >= 3) return "Rất tốt";
  if (grade === 2) return "Trung bình";
  if (grade === 1) return "Thấp";
  return "Cần xoay hiệu chỉnh";
}

export default function RadarScreen({ route, navigation }) {
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

  // Góc phương vị
  const bearingAngle = deviceCoords
    ? computeAzimuthBearing(deviceCoords, record.position)
    : null;

  // Góc lệch xoay kim la bàn
  const pointerRotation =
    bearingAngle !== null && headingDegrees !== null
      ? computeDeviationAngle(bearingAngle, headingDegrees)
      : 0;

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
    return <AppSpinner coversScreen notice="Đang kích hoạt GPS và cảm biến định hướng..." />;
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={["bottom"]}>
      <AppHeader title="La bàn tìm xe" onGoBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner trạng thái khoảng cách */}
        <View style={[styles.distanceCard, isWithinProximity && styles.distanceCardNearby]}>
          <Text style={styles.bannerEmoji}>{isWithinProximity ? "🎉" : "🚗"}</Text>
          <View style={styles.bannerTextCol}>
            <Text style={styles.bannerTitle}>
              {isWithinProximity ? "Bạn đã ở rất gần xe!" : "Di chuyển theo hướng mũi tên"}
            </Text>
            <Text style={styles.bannerValue}>
              {metersAway !== null
                ? `Còn khoảng ${formatMetricDistance(metersAway)}`
                : "Đang tính toán khoảng cách..."}
            </Text>
          </View>
        </View>

        {/* Khung mặt đồng hồ la bàn */}
        <View style={styles.compassContainer}>
          <CompassDial
            deviationDegrees={pointerRotation}
            isReady={bearingAngle !== null && headingDegrees !== null}
          />
          <Text style={styles.compassTip}>
            Cầm điện thoại nằm ngang và quay người theo hướng mũi tên chỉ thẳng lên phía trước.
          </Text>
        </View>

        {/* Bảng chỉ số định hướng & cảm biến */}
        <View style={styles.readoutCard}>
          <SpecRow
            caption="Hướng tới vị trí xe"
            val={
              bearingAngle !== null
                ? `${resolveCardinalSector(bearingAngle)} • ${Math.round(bearingAngle)}°`
                : "Đang xác định"
            }
          />
          <SpecRow
            caption="Đầu máy đang hướng"
            val={
              headingDegrees !== null
                ? `${resolveCardinalSector(headingDegrees)} • ${Math.round(headingDegrees)}°`
                : "Đang đọc la bàn"
            }
          />
          <SpecRow
            caption="Độ chính xác la bàn"
            val={evaluateSensorQuality(headingCalibration)}
          />
          {deviceCoords?.accuracy ? (
            <SpecRow
              caption="Sai số định vị GPS"
              val={`±${Math.round(deviceCoords.accuracy)} m`}
              noBorder
            />
          ) : null}
        </View>

        {/* Thẻ tóm tắt thông tin xe */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTag}>Vị trí xe đã lưu</Text>
          <Text style={styles.summaryAddress}>{record.locationName}</Text>
          {spotTag ? <Text style={styles.summarySpot}>🅿️ {spotTag}</Text> : null}
        </View>

        {/* Cảnh báo lỗi cảm biến nếu có */}
        {gpsError ? (
          <View style={styles.dangerAlert}>
            <Ionicons name="alert-circle-outline" size={18} color={Palette.danger} />
            <Text style={styles.dangerAlertText}>{gpsError}</Text>
          </View>
        ) : null}

        {compassError ? (
          <View style={styles.warningAlert}>
            <Ionicons name="warning-outline" size={18} color={Palette.alert} />
            <Text style={styles.warningAlertText}>{compassError}</Text>
          </View>
        ) : null}

        {headingCalibration !== null && headingCalibration <= 1 ? (
          <View style={styles.warningAlert}>
            <Ionicons name="sync-outline" size={18} color={Palette.alert} />
            <Text style={styles.warningAlertText}>
              Cảm biến từ trường chưa ổn định. Hãy xoay điện thoại theo hình số 8 vài lần để hiệu chỉnh.
            </Text>
          </View>
        ) : null}

        <Text style={styles.subtextNotice}>
          Lưu ý: Tín hiệu GPS và la bàn có thể bị suy giảm trong hầm để xe hoặc khu vực nhiều vật cản kim loại.
        </Text>

        {/* Cụm nút thao tác */}
        <ActionButton
          label="Cập nhật lại GPS và la bàn"
          icon={<Ionicons name="refresh" size={18} color={Palette.brand} />}
          onPress={reSync}
          kind="bordered"
          scale="lg"
        />

        <ActionButton
          label="Mở bản đồ chỉ đường"
          icon={<Ionicons name="map-outline" size={18} color="#FFFFFF" />}
          onPress={onOpenMap}
          scale="lg"
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
    padding: Metrics.gapMd,
    gap: Metrics.gapMd,
    paddingBottom: Metrics.gapXl + 20,
  },
  distanceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.card,
    borderRadius: Metrics.radiusMd,
    padding: Metrics.gapMd,
    gap: Metrics.gapMd,
    borderWidth: 1,
    borderColor: Palette.outline,
    ...Elevation.flat,
  },
  distanceCardNearby: {
    borderColor: Palette.positive,
    backgroundColor: Palette.positiveSoft,
  },
  bannerEmoji: {
    fontSize: 34,
  },
  bannerTextCol: {
    flex: 1,
    gap: 2,
  },
  bannerTitle: {
    color: Palette.inkHeading,
    fontSize: Metrics.fontBase,
    fontWeight: "700",
  },
  bannerValue: {
    color: Palette.brand,
    fontSize: Metrics.fontSm,
    fontWeight: "600",
  },
  compassContainer: {
    backgroundColor: Palette.card,
    borderRadius: Metrics.radiusLg,
    padding: Metrics.gapLg,
    alignItems: "center",
    gap: Metrics.gapMd,
    borderWidth: 1,
    borderColor: Palette.outline,
    ...Elevation.flat,
  },
  compassTip: {
    fontSize: Metrics.fontXs,
    color: Palette.inkMuted,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  readoutCard: {
    backgroundColor: Palette.card,
    borderRadius: Metrics.radiusMd,
    paddingHorizontal: Metrics.gapMd,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Palette.outline,
    ...Elevation.flat,
  },
  summaryCard: {
    backgroundColor: Palette.card,
    borderRadius: Metrics.radiusMd,
    padding: Metrics.gapMd,
    borderWidth: 1,
    borderColor: Palette.outline,
    gap: 4,
    ...Elevation.flat,
  },
  summaryTag: {
    fontSize: Metrics.fontXs,
    fontWeight: "700",
    color: Palette.inkMuted,
    textTransform: "uppercase",
  },
  summaryAddress: {
    fontSize: Metrics.fontBase,
    fontWeight: "600",
    color: Palette.inkHeading,
  },
  summarySpot: {
    fontSize: Metrics.fontSm,
    color: Palette.brandDark,
    fontWeight: "600",
    marginTop: 2,
  },
  dangerAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.dangerSoft,
    padding: Metrics.gapSm,
    borderRadius: Metrics.radiusSm,
    gap: Metrics.gapXs,
  },
  dangerAlertText: {
    flex: 1,
    color: Palette.danger,
    fontSize: Metrics.fontXs,
  },
  warningAlert: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.alertSoft,
    padding: Metrics.gapSm,
    borderRadius: Metrics.radiusSm,
    gap: Metrics.gapXs,
  },
  warningAlertText: {
    flex: 1,
    color: Palette.alert,
    fontSize: Metrics.fontXs,
  },
  subtextNotice: {
    fontSize: Metrics.fontXs,
    color: Palette.inkSubtle,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: Metrics.gapMd,
  },
  emptyNotice: {
    padding: Metrics.gapLg,
    alignItems: "center",
  },
  emptyNoticeText: {
    fontSize: Metrics.fontBase,
    color: Palette.inkMuted,
  },
});
