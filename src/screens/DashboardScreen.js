import React, { useRef } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import ActionButton from "~/components/ActionButton";
import AppSpinner from "~/components/AppSpinner";
import SpotRecordCard from "~/components/SpotRecordCard";
import { APP_CONFIG } from "~/core/config";
import { Elevation, Metrics, Palette } from "~/core/theme";
import { useLiveLocation } from "~/hooks/useLiveLocation";
import { shareSpotDetails } from "~/services/contentSharer";
import { buildMapRegion, launchExternalDirections } from "~/services/mapLauncher";
import { useParkingStore } from "~/state/ParkingStore";

export default function DashboardScreen({ navigation }) {
  const { activeSpot, vacateCurrentSpot, isLoading } = useParkingStore();
  const { coords, busy: locating, errorMessage: gpsError } = useLiveLocation();
  const mapElement = useRef(null);

  const onOpenDirections = () => {
    if (!activeSpot?.position) return;
    launchExternalDirections(
      activeSpot.position.latitude,
      activeSpot.position.longitude,
      activeSpot.locationName,
    );
  };

  const onShareLocation = async () => {
    if (!activeSpot) return;
    try {
      await shareSpotDetails(activeSpot);
    } catch (e) {
      Alert.alert("Thông báo", "Không mở được menu chia sẻ.");
    }
  };

  const onTriggerCheckIn = () => {
    if (!activeSpot) {
      navigation.navigate("CheckIn");
      return;
    }

    Alert.alert(
      "Đã có xe đang đỗ",
      "Nếu bạn lưu vị trí mới, phiên đỗ hiện tại sẽ được chuyển vào lịch sử.",
      [
        { text: "Bỏ qua", style: "cancel" },
        { text: "Tiếp tục", onPress: () => navigation.navigate("CheckIn") },
      ],
    );
  };

  const onInspectDetail = () => {
    if (!activeSpot) return;
    navigation.navigate("SpotDetail", { recordId: activeSpot.id });
  };

  const onOpenRadar = () => {
    if (!activeSpot) return;
    navigation.navigate("Radar", { recordId: activeSpot.id });
  };

  const onConfirmVacate = () => {
    if (!activeSpot) return;
    Alert.alert(
      "Xác nhận đã lấy xe?",
      "Vị trí này sẽ được chuyển vào mục lịch sử đỗ xe.",
      [
        { text: "Để sau", style: "cancel" },
        {
          text: "Đã lấy xe",
          style: "default",
          onPress: async () => {
            try {
              await vacateCurrentSpot(activeSpot.id);
            } catch (err) {
              Alert.alert("Lỗi", "Không cập nhật được trạng thái.");
            }
          },
        },
      ],
    );
  };

  if (isLoading || locating) {
    return <AppSpinner coversScreen notice="Đang đồng bộ bản đồ vệ tinh..." />;
  }

  const mapCenter = activeSpot?.position
    ? buildMapRegion(activeSpot.position.latitude, activeSpot.position.longitude, 0.005)
    : coords
      ? buildMapRegion(coords.latitude, coords.longitude, 0.008)
      : APP_CONFIG.DEFAULT_CENTER;

  return (
    <SafeAreaView style={styles.safeContainer} edges={["bottom"]}>
      <MapView
        ref={mapElement}
        style={styles.mapCanvas}
        region={mapCenter}
        showsUserLocation
        showsMyLocationButton
      >
        {activeSpot?.position ? (
          <Marker
            coordinate={activeSpot.position}
            title="Xe của tôi"
            description={activeSpot.locationName}
            pinColor={Palette.brand}
          />
        ) : null}
      </MapView>

      <ScrollView
        style={styles.sheetPanel}
        contentContainerStyle={styles.sheetContent}
        showsVerticalScrollIndicator={false}
      >
        {gpsError ? (
          <View style={styles.alertPill}>
            <Ionicons name="warning-outline" size={16} color={Palette.danger} />
            <Text style={styles.alertText}>{gpsError}</Text>
          </View>
        ) : null}

        {activeSpot ? (
          <View style={styles.activeBlock}>
            <Text style={styles.blockTitle}>🚗 Phương tiện đang đỗ</Text>

            <SpotRecordCard
              session={activeSpot}
              onSelect={onInspectDetail}
              isHighlighted
            />

            <View style={styles.twoColumnGrid}>
              <ActionButton
                label="Chỉ đường"
                icon={<Ionicons name="navigate-outline" size={18} color="#FFFFFF" />}
                onPress={onOpenDirections}
                style={styles.gridBtn}
              />
              <ActionButton
                label="Chi tiết"
                icon={<Ionicons name="eye-outline" size={18} color={Palette.brand} />}
                onPress={onInspectDetail}
                kind="bordered"
                style={styles.gridBtn}
              />
            </View>

            <ActionButton
              label="🧭 La bàn tìm xe"
              onPress={onOpenRadar}
              scale="lg"
            />

            <ActionButton
              label="📤 Chia sẻ vị trí"
              onPress={onShareLocation}
              kind="bordered"
              scale="lg"
            />

            <ActionButton
              label="✓ Đã lấy xe"
              onPress={onConfirmVacate}
              kind="tinted"
              scale="lg"
            />
          </View>
        ) : (
          <View style={styles.vacantState}>
            <View style={styles.vacantIconRing}>
              <Ionicons name="car-sport-outline" size={44} color={Palette.brand} />
            </View>
            <Text style={styles.vacantHeading}>Chưa lưu vị trí đỗ xe</Text>
            <Text style={styles.vacantDescription}>
              Hãy đánh dấu ô đỗ xe ngay khi bạn vừa dừng xe để tìm lại xe dễ dàng mọi lúc.
            </Text>
          </View>
        )}

        <ActionButton
          label="+ Lưu vị trí đỗ xe"
          onPress={onTriggerCheckIn}
          scale="lg"
          style={styles.checkInMainBtn}
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
  mapCanvas: {
    flex: 1,
    minHeight: 260,
  },
  sheetPanel: {
    maxHeight: "60%",
    backgroundColor: Palette.card,
    borderTopLeftRadius: Metrics.radiusXl,
    borderTopRightRadius: Metrics.radiusXl,
    marginTop: -Metrics.radiusLg,
    ...Elevation.popover,
  },
  sheetContent: {
    padding: Metrics.gapMd,
    gap: Metrics.gapSm,
    paddingBottom: Metrics.gapXl + 20,
  },
  alertPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.dangerSoft,
    padding: Metrics.gapSm,
    borderRadius: Metrics.radiusSm,
    gap: Metrics.gapXs,
  },
  alertText: {
    flex: 1,
    color: Palette.danger,
    fontSize: Metrics.fontXs,
  },
  activeBlock: {
    gap: Metrics.gapSm,
  },
  blockTitle: {
    fontSize: Metrics.fontLg,
    fontWeight: "700",
    color: Palette.inkHeading,
    marginBottom: 2,
  },
  twoColumnGrid: {
    flexDirection: "row",
    gap: Metrics.gapSm,
  },
  gridBtn: {
    flex: 1,
  },
  vacantState: {
    alignItems: "center",
    paddingVertical: Metrics.gapLg,
    gap: Metrics.gapSm,
  },
  vacantIconRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: Palette.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  vacantHeading: {
    fontSize: Metrics.fontLg,
    fontWeight: "700",
    color: Palette.inkHeading,
  },
  vacantDescription: {
    fontSize: Metrics.fontSm,
    color: Palette.inkMuted,
    textAlign: "center",
    paddingHorizontal: Metrics.gapMd,
    lineHeight: 20,
  },
  checkInMainBtn: {
    marginTop: 4,
  },
});
