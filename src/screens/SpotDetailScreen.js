import React from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import ActionButton from "~/components/ActionButton";
import AppHeader from "~/components/AppHeader";
import SpecRow from "~/components/SpecRow";
import { Elevation, Metrics, Palette } from "~/core/theme";
import { useLiveLocation } from "~/hooks/useLiveLocation";
import { shareSpotDetails } from "~/services/contentSharer";
import { buildMapRegion, launchExternalDirections } from "~/services/mapLauncher";
import { useParkingStore } from "~/state/ParkingStore";
import { computeSurfaceDistance, formatMetricDistance } from "~/utils/geoMath";
import { formatFullDateTime } from "~/utils/timeAgo";

export default function SpotDetailScreen({ route, navigation }) {
  const { recordId } = route.params;
  const { sessionLogs, activeSpot, vacateCurrentSpot, reoccupySpot, discardSpotRecord } =
    useParkingStore();
  const { coords } = useLiveLocation();

  const record = sessionLogs.find((r) => r.id === recordId);
  const isOccupied = activeSpot?.id === record?.id;

  if (!record) {
    return (
      <SafeAreaView style={styles.safeContainer}>
        <AppHeader title="Chi tiết" onGoBack={() => navigation.goBack()} />
        <View style={styles.missingCard}>
          <Text style={styles.missingText}>Bản ghi không tồn tại hoặc đã bị xóa.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const mapFrame = buildMapRegion(
    record.position.latitude,
    record.position.longitude,
    0.003,
  );

  const separationMeters = coords
    ? computeSurfaceDistance(coords, record.position)
    : null;

  const onNavigateExternal = () => {
    launchExternalDirections(
      record.position.latitude,
      record.position.longitude,
      record.locationName,
    );
  };

  const onOpenRadar = () => {
    navigation.navigate("Radar", { recordId: record.id });
  };

  const onShare = async () => {
    try {
      await shareSpotDetails(record);
    } catch (e) {
      Alert.alert("Thông báo", "Không mở được menu chia sẻ.");
    }
  };

  const onReoccupy = async () => {
    try {
      await reoccupySpot(record.id);
      Alert.alert("Thành công", "Đã đặt phiên này làm vị trí xe đang đỗ hiện tại.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert("Lỗi", "Không thể cập nhật trạng thái.");
    }
  };

  const onVacate = () => {
    Alert.alert("Xác nhận đã lấy xe?", "Phiên này sẽ được đánh dấu đã hoàn tất.", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Đã lấy xe",
        onPress: async () => {
          try {
            await vacateCurrentSpot(record.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert("Lỗi", "Không thể hoàn thành phiên đỗ.");
          }
        },
      },
    ]);
  };

  const onDiscard = () => {
    Alert.alert("Xác nhận xóa?", "Bản ghi đỗ xe này sẽ bị xóa hoàn toàn khỏi thiết bị.", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa vĩnh viễn",
        style: "destructive",
        onPress: async () => {
          try {
            await discardSpotRecord(record.id);
            navigation.goBack();
          } catch (e) {
            Alert.alert("Lỗi", "Không xóa được bản ghi.");
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={["bottom"]}>
      <AppHeader title="Chi tiết vị trí đỗ" onGoBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        {/* Bản đồ định vị thu nhỏ */}
        <View style={styles.mapWrap}>
          <MapView
            style={styles.mapElem}
            region={mapFrame}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            <Marker
              coordinate={record.position}
              title="Xe của bạn"
              description={record.locationName}
              pinColor={Palette.brand}
            />
          </MapView>

          {isOccupied ? (
            <View style={styles.occupiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
              <Text style={styles.occupiedBadgeText}>Xe đang đỗ</Text>
            </View>
          ) : null}
        </View>

        {/* Ảnh chụp nếu có */}
        {record.snapshotUri ? (
          <View style={styles.imageWrap}>
            <Image
              source={{ uri: record.snapshotUri }}
              style={styles.imageElem}
              resizeMode="cover"
            />
          </View>
        ) : null}

        {/* Bảng chi tiết thông tin */}
        <View style={styles.specsCard}>
          <SpecRow caption="📍 Địa chỉ" val={record.locationName} />
          <SpecRow caption="🕐 Thời gian lưu" val={formatFullDateTime(record.parkedAt)} />

          {!isOccupied && record.vacatedAt ? (
            <SpecRow caption="✅ Đã lấy xe lúc" val={formatFullDateTime(record.vacatedAt)} />
          ) : null}

          {record.level ? <SpecRow caption="🏢 Tầng" val={record.level} /> : null}
          {record.sector ? <SpecRow caption="🅿️ Khu" val={record.sector} /> : null}
          {record.bayNumber ? <SpecRow caption="🔢 Số ô" val={record.bayNumber} /> : null}

          {separationMeters !== null && isOccupied ? (
            <SpecRow caption="📏 Khoảng cách hiện tại" val={formatMetricDistance(separationMeters)} />
          ) : null}

          <SpecRow
            caption="🗺 Tọa độ GPS"
            val={`${record.position.latitude.toFixed(6)}, ${record.position.longitude.toFixed(6)}`}
          />

          {record.memo ? <SpecRow caption="📝 Ghi chú" val={record.memo} noBorder /> : null}
        </View>

        {/* Cụm nút thao tác */}
        <View style={styles.actionCluster}>
          {isOccupied ? (
            <ActionButton
              label="🧭 La bàn tìm xe"
              onPress={onOpenRadar}
              scale="lg"
            />
          ) : null}

          <ActionButton
            label="🗺 Chỉ đường bằng bản đồ"
            onPress={onNavigateExternal}
            kind={isOccupied ? "bordered" : "filled"}
            scale="lg"
          />

          <ActionButton
            label="📤 Chia sẻ vị trí"
            onPress={onShare}
            kind="bordered"
            scale="lg"
          />

          {isOccupied ? (
            <ActionButton
              label="✓ Đã lấy xe"
              onPress={onVacate}
              kind="tinted"
              scale="lg"
            />
          ) : (
            <ActionButton
              label="Đặt làm vị trí hiện tại"
              onPress={onReoccupy}
              kind="bordered"
              scale="lg"
            />
          )}

          <ActionButton
            label="Xóa bản ghi này"
            onPress={onDiscard}
            kind="destructive"
            scale="lg"
          />
        </View>
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
  mapWrap: {
    height: 220,
    borderRadius: Metrics.radiusMd,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  mapElem: {
    flex: 1,
  },
  occupiedBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: Palette.brand,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: Metrics.radiusPill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  occupiedBadgeText: {
    color: "#FFFFFF",
    fontSize: Metrics.fontXs,
    fontWeight: "700",
  },
  imageWrap: {
    borderRadius: Metrics.radiusMd,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  imageElem: {
    width: "100%",
    height: 230,
    backgroundColor: Palette.outline,
  },
  specsCard: {
    backgroundColor: Palette.card,
    borderRadius: Metrics.radiusMd,
    paddingHorizontal: Metrics.gapMd,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Palette.outline,
    ...Elevation.flat,
  },
  actionCluster: {
    gap: Metrics.gapSm,
  },
  missingCard: {
    padding: Metrics.gapLg,
    alignItems: "center",
  },
  missingText: {
    color: Palette.inkMuted,
    fontSize: Metrics.fontBase,
  },
});
