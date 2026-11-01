import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import ActionButton from "~/components/ActionButton";
import AppSpinner from "~/components/AppSpinner";
import StatusPill from "~/components/StatusPill";
import { APP_CONFIG } from "~/core/config";
import { Elevation, Metrics, Palette } from "~/core/theme";
import { useLiveLocation } from "~/hooks/useLiveLocation";
import { shareSpotDetails } from "~/services/contentSharer";
import { buildMapRegion, launchExternalDirections } from "~/services/mapLauncher";
import { useParkingStore } from "~/state/ParkingStore";
import {
  formatParkingDuration,
  formatTimeOnly,
  formatTimeRemaining,
  getTimerAlertTier,
} from "~/utils/timeAgo";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { activeSpot, vacateCurrentSpot, isLoading } = useParkingStore();
  const { coords, busy: locating, errorMessage: gpsError, refreshLocation } = useLiveLocation();
  const mapElement = useRef(null);

  // Bộ đếm nhịp để cập nhật thời gian đếm ngược thời gian thực
  const [, setTimerTick] = useState(0);

  useEffect(() => {
    if (!activeSpot?.expiresAt) return;
    const interval = setInterval(() => {
      setTimerTick((t) => t + 1);
    }, 10000); // cập nhật mỗi 10 giây
    return () => clearInterval(interval);
  }, [activeSpot?.expiresAt]);

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
      "Nếu bạn lưu vị trí mới, phiên đỗ hiện tại sẽ được lưu vào lịch sử.",
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
      "Vị trí này sẽ được chuyển vào mục lịch sử đỗ xe và các cảnh báo hẹn giờ sẽ tự động dừng.",
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

  const onRecenterMap = async () => {
    if (activeSpot?.position) {
      mapElement.current?.animateToRegion(
        buildMapRegion(activeSpot.position.latitude, activeSpot.position.longitude, 0.004),
        350,
      );
    } else {
      const loc = (await refreshLocation()) || coords;
      if (loc) {
        mapElement.current?.animateToRegion(
          buildMapRegion(loc.latitude, loc.longitude, 0.006),
          350,
        );
      }
    }
  };

  useEffect(() => {
    const target = activeSpot?.position || coords;
    if (target && mapElement.current) {
      mapElement.current.animateToRegion(
        buildMapRegion(
          target.latitude,
          target.longitude,
          activeSpot ? 0.004 : 0.008,
        ),
        500,
      );
    }
  }, [
    activeSpot?.position?.latitude,
    activeSpot?.position?.longitude,
    coords?.latitude,
    coords?.longitude,
  ]);

  if (isLoading || (locating && !coords && !activeSpot)) {
    return <AppSpinner coversScreen notice="Đang đồng bộ vệ tinh và vị trí xe..." />;
  }

  const mapCenter = activeSpot?.position
    ? buildMapRegion(activeSpot.position.latitude, activeSpot.position.longitude, 0.005)
    : coords
      ? buildMapRegion(coords.latitude, coords.longitude, 0.008)
      : APP_CONFIG.DEFAULT_CENTER;

  const durationStr = activeSpot ? formatParkingDuration(activeSpot.parkedAt) : "";

  // Thông tin hẹn giờ đếm ngược
  const timeRemainingStr = activeSpot?.expiresAt
    ? formatTimeRemaining(activeSpot.expiresAt)
    : null;
  const alertTier = activeSpot?.expiresAt
    ? getTimerAlertTier(activeSpot.expiresAt)
    : "NONE";

  const getVehicleIcon = (type) => {
    switch (type) {
      case "bike":
        return "bicycle";
      case "bicycle":
        return "flash";
      case "other":
        return "cube";
      default:
        return "car";
    }
  };

  return (
    <View style={styles.fullScreenContainer}>
      {/* Bản đồ nền toàn màn hình */}
      <MapView
        ref={mapElement}
        style={styles.mapCanvas}
        initialRegion={mapCenter}
        region={mapCenter}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {activeSpot?.position ? (
          <Marker
            coordinate={activeSpot.position}
            title={activeSpot.vehicleName || "Xe của bạn"}
            description={activeSpot.locationName}
          >
            <View style={styles.customVehicleMarker}>
              <View style={styles.markerBeaconHalo} />
              <View style={styles.markerIconBox}>
                <Ionicons
                  name={getVehicleIcon(activeSpot.vehicleType)}
                  size={18}
                  color="#FFFFFF"
                />
              </View>
              <View style={styles.markerPinPointer} />
            </View>
          </Marker>
        ) : null}
      </MapView>

      {/* Thanh Header nổi trên cùng */}
      <View
        style={[styles.topFloatingBar, { top: insets.top + 10 }]}
        pointerEvents="box-none"
      >
        <View style={styles.appBrandPill}>
          <View style={styles.appLogoCircle}>
            <Ionicons name="navigate" size={14} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.appName}>SmartParking</Text>
            <Text style={styles.appSubline}>
              {activeSpot ? "Đang ghi nhớ xe của bạn" : "Sẵn sàng ghi nhớ vị trí"}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={onRecenterMap}
          style={({ pressed }) => [
            styles.recenterPill,
            pressed && styles.recenterPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Định vị lại bản đồ"
        >
          <Ionicons
            name={activeSpot ? "car-outline" : "locate"}
            size={20}
            color={Palette.brand}
          />
        </Pressable>
      </View>

      {gpsError ? (
        <View style={[styles.floatingWarning, { top: insets.top + 70 }]}>
          <Ionicons name="warning-outline" size={15} color={Palette.danger} />
          <Text style={styles.warningText}>{gpsError}</Text>
        </View>
      ) : null}

      {/* Floating Smart Vehicle Hub Card phía dưới */}
      <View
        style={[styles.bottomCardContainer, { paddingBottom: insets.bottom + 74 }]}
        pointerEvents="box-none"
      >
        <View style={styles.cardFrame} pointerEvents="auto">
          {activeSpot ? (
            <View style={styles.activeSpotContent}>
              {/* Header của thẻ xe: Trạng thái & Tên Phương Tiện */}
              <View style={styles.cardHeaderRow}>
                <View style={styles.vehicleStatusCluster}>
                  <StatusPill isOccupied />

                  {/* Huy hiệu phương tiện đỗ */}
                  <View style={styles.vehicleBadgePill}>
                    <Ionicons
                      name={getVehicleIcon(activeSpot.vehicleType)}
                      size={12}
                      color={Palette.brandDark}
                    />
                    <Text style={styles.vehicleBadgeText} numberOfLines={1}>
                      {activeSpot.vehicleName || "Xe của bạn"}
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={onInspectDetail}
                  style={({ pressed }) => [styles.infoCircleBtn, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="information-circle-outline" size={20} color={Palette.inkMuted} />
                </Pressable>
              </View>

              {/* Dòng Hẹn giờ đỗ xe nếu có */}
              {timeRemainingStr ? (
                <View
                  style={[
                    styles.timerBannerPill,
                    alertTier === "EXPIRED" && styles.timerBannerExpired,
                    alertTier === "CRITICAL_5" && styles.timerBannerCritical,
                    (alertTier === "ALERT_15" || alertTier === "ALERT_30") &&
                      styles.timerBannerWarning,
                  ]}
                >
                  <Ionicons
                    name={
                      alertTier === "EXPIRED"
                        ? "alert-circle"
                        : alertTier === "CRITICAL_5"
                          ? "warning"
                          : "alarm"
                    }
                    size={15}
                    color={
                      alertTier === "EXPIRED" || alertTier === "CRITICAL_5"
                        ? "#FFFFFF"
                        : alertTier === "ALERT_15" || alertTier === "ALERT_30"
                          ? Palette.alert
                          : Palette.brand
                    }
                  />
                  <Text
                    style={[
                      styles.timerBannerText,
                      (alertTier === "EXPIRED" || alertTier === "CRITICAL_5") &&
                        styles.timerBannerTextDark,
                    ]}
                  >
                    {alertTier === "EXPIRED"
                      ? `🛑 ĐÃ HẾT GIỜ ĐỖ XE (${timeRemainingStr})`
                      : `Hạn đỗ: ${timeRemainingStr} (Hết lúc ${formatTimeOnly(activeSpot.expiresAt)})`}
                  </Text>
                </View>
              ) : durationStr ? (
                <View style={styles.durationPill}>
                  <Ionicons name="hourglass-outline" size={12} color={Palette.inkMuted} />
                  <Text style={styles.durationText}>Đã đỗ {durationStr}</Text>
                </View>
              ) : null}

              {/* Tên vị trí & Địa chỉ */}
              <Pressable onPress={onInspectDetail}>
                <Text style={styles.locationHeadline} numberOfLines={2}>
                  {activeSpot.locationName || "Vị trí đã lưu"}
                </Text>
              </Pressable>

              {/* Slot Tags */}
              {(activeSpot.level || activeSpot.sector || activeSpot.bayNumber || activeSpot.vehiclePlate) ? (
                <View style={styles.slotTagRow}>
                  {activeSpot.vehiclePlate ? (
                    <View style={styles.plateTagBadge}>
                      <Ionicons name="card-outline" size={11} color={Palette.inkHeading} />
                      <Text style={styles.plateTagText}>{activeSpot.vehiclePlate}</Text>
                    </View>
                  ) : null}
                  {activeSpot.level ? (
                    <View style={styles.slotTagBadge}>
                      <Text style={styles.slotTagKey}>TẦNG</Text>
                      <Text style={styles.slotTagVal}>{activeSpot.level}</Text>
                    </View>
                  ) : null}
                  {activeSpot.sector ? (
                    <View style={styles.slotTagBadge}>
                      <Text style={styles.slotTagKey}>KHU</Text>
                      <Text style={styles.slotTagVal}>{activeSpot.sector}</Text>
                    </View>
                  ) : null}
                  {activeSpot.bayNumber ? (
                    <View style={[styles.slotTagBadge, styles.slotTagBadgeAccent]}>
                      <Text style={[styles.slotTagKey, styles.slotTagKeyAccent]}>SỐ Ô</Text>
                      <Text style={[styles.slotTagVal, styles.slotTagValAccent]}>
                        {activeSpot.bayNumber}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* Quick 4-action Grid */}
              <View style={styles.quickActionRow}>
                {/* 1. Radar (La bàn) */}
                <Pressable
                  onPress={onOpenRadar}
                  style={({ pressed }) => [
                    styles.actionTile,
                    styles.actionTileHero,
                    pressed && styles.actionTilePressed,
                  ]}
                >
                  <View style={styles.heroTileGlow}>
                    <Ionicons name="compass" size={22} color="#FFFFFF" />
                  </View>
                  <Text style={styles.heroTileLabel}>La bàn</Text>
                </Pressable>

                {/* 2. Chỉ đường */}
                <Pressable
                  onPress={onOpenDirections}
                  style={({ pressed }) => [
                    styles.actionTile,
                    pressed && styles.actionTilePressed,
                  ]}
                >
                  <View style={styles.tileIconCircle}>
                    <Ionicons name="navigate-outline" size={20} color={Palette.brand} />
                  </View>
                  <Text style={styles.tileLabel}>Chỉ đường</Text>
                </Pressable>

                {/* 3. Chia sẻ */}
                <Pressable
                  onPress={onShareLocation}
                  style={({ pressed }) => [
                    styles.actionTile,
                    pressed && styles.actionTilePressed,
                  ]}
                >
                  <View style={styles.tileIconCircle}>
                    <Ionicons name="share-social-outline" size={20} color={Palette.inkHeading} />
                  </View>
                  <Text style={styles.tileLabel}>Chia sẻ</Text>
                </Pressable>

                {/* 4. Chi tiết */}
                <Pressable
                  onPress={onInspectDetail}
                  style={({ pressed }) => [
                    styles.actionTile,
                    pressed && styles.actionTilePressed,
                  ]}
                >
                  <View style={styles.tileIconCircle}>
                    <Ionicons name="list-outline" size={20} color={Palette.inkHeading} />
                  </View>
                  <Text style={styles.tileLabel}>Chi tiết</Text>
                </Pressable>
              </View>

              {/* Bottom CTAs: Hoàn thành & Đổi vị trí */}
              <View style={styles.bottomCtaRow}>
                <ActionButton
                  label="✓ Đã lấy xe"
                  onPress={onConfirmVacate}
                  kind="tinted"
                  scale="md"
                  style={styles.vacateBtn}
                />
                <ActionButton
                  label="+ Đổi vị trí"
                  onPress={onTriggerCheckIn}
                  kind="bordered"
                  scale="md"
                  style={styles.recheckBtn}
                />
              </View>
            </View>
          ) : (
            <View style={styles.vacantSpotContent}>
              <View style={styles.vacantIllustration}>
                <View style={styles.vacantOuterHalo} />
                <View style={styles.vacantInnerHalo} />
                <View style={styles.vacantIconBox}>
                  <Ionicons name="car-sport" size={28} color={Palette.brand} />
                </View>
              </View>

              <View style={styles.vacantTextCluster}>
                <Text style={styles.vacantHeading}>Chưa lưu vị trí xe</Text>
                <Text style={styles.vacantSubtext}>
                  Đánh dấu ô đỗ xe ngay khi dừng để tìm lại xe dễ dàng bằng La bàn & Bản đồ.
                </Text>
              </View>

              <ActionButton
                label="Lưu vị trí đỗ xe ngay"
                icon={<Ionicons name="add-circle" size={20} color="#FFFFFF" />}
                onPress={onTriggerCheckIn}
                scale="lg"
                kind="filled"
                style={styles.vacantCtaBtn}
              />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "#E2E8F0",
    position: "relative",
  },
  mapCanvas: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  customVehicleMarker: {
    alignItems: "center",
    justifyContent: "center",
  },
  markerBeaconHalo: {
    position: "absolute",
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(37, 99, 235, 0.25)",
  },
  markerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    ...Elevation.raised,
  },
  markerPinPointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 6,
    borderStyle: "solid",
    backgroundColor: "transparent",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: Palette.brand,
    marginTop: -1,
  },
  topFloatingBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  appBrandPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Metrics.radiusPill,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    ...Elevation.floating,
  },
  appLogoCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Palette.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: Metrics.fontBase,
    fontWeight: "800",
    color: Palette.inkHeading,
    letterSpacing: -0.3,
    lineHeight: 18,
  },
  appSubline: {
    fontSize: 10,
    color: Palette.inkMuted,
    fontWeight: "500",
  },
  recenterPill: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    ...Elevation.floating,
  },
  recenterPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  floatingWarning: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.dangerLight,
    padding: 10,
    borderRadius: Metrics.radiusSm,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    ...Elevation.raised,
    zIndex: 10,
  },
  warningText: {
    flex: 1,
    color: Palette.danger,
    fontSize: Metrics.fontXs,
    fontWeight: "500",
  },
  bottomCardContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    zIndex: 10,
  },
  cardFrame: {
    backgroundColor: "rgba(255, 255, 255, 0.98)",
    borderRadius: Metrics.radiusXl - 4,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    ...Elevation.floating,
  },
  activeSpotContent: {
    gap: 10,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  vehicleStatusCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    flex: 1,
  },
  vehicleBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.cardSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Metrics.radiusPill,
    gap: 4,
    borderWidth: 1,
    borderColor: Palette.outline,
    maxWidth: 160,
  },
  vehicleBadgeText: {
    fontSize: Metrics.fontXs,
    fontWeight: "700",
    color: Palette.inkHeading,
  },
  durationPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.cardSubtle,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Metrics.radiusPill,
    gap: 4,
    alignSelf: "flex-start",
  },
  durationText: {
    fontSize: Metrics.fontXs,
    fontWeight: "600",
    color: Palette.inkMuted,
  },
  timerBannerPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.brandLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Metrics.radiusSm,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.2)",
  },
  timerBannerWarning: {
    backgroundColor: Palette.alertLight,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  timerBannerCritical: {
    backgroundColor: Palette.danger,
    borderColor: Palette.dangerDark,
  },
  timerBannerExpired: {
    backgroundColor: "#991B1B",
    borderColor: "#7F1D1D",
  },
  timerBannerText: {
    fontSize: Metrics.fontXs,
    fontWeight: "700",
    color: Palette.brandDark,
    flex: 1,
  },
  timerBannerTextDark: {
    color: "#FFFFFF",
  },
  infoCircleBtn: {
    padding: 4,
  },
  locationHeadline: {
    fontSize: Metrics.fontLg,
    fontWeight: "800",
    color: Palette.inkHeading,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  slotTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  plateTagBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.cardSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Metrics.radiusSm - 2,
    gap: 4,
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  plateTagText: {
    fontSize: Metrics.fontXs,
    fontWeight: "800",
    color: Palette.inkHeading,
    letterSpacing: 0.5,
  },
  slotTagBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.cardSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Metrics.radiusSm - 2,
    gap: 4,
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  slotTagKey: {
    fontSize: 9,
    fontWeight: "700",
    color: Palette.inkMuted,
  },
  slotTagVal: {
    fontSize: Metrics.fontSm,
    fontWeight: "800",
    color: Palette.inkHeading,
  },
  slotTagBadgeAccent: {
    backgroundColor: Palette.brandLight,
    borderColor: "rgba(37, 99, 235, 0.2)",
  },
  slotTagKeyAccent: {
    color: Palette.brandDark,
  },
  slotTagValAccent: {
    color: Palette.brandDark,
  },
  quickActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 4,
  },
  actionTile: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Palette.cardSubtle,
    paddingVertical: 10,
    borderRadius: Metrics.radiusMd - 2,
    gap: 6,
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  actionTileHero: {
    backgroundColor: Palette.brand,
    borderColor: Palette.brandDark,
    ...Elevation.flat,
  },
  actionTilePressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  tileIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.card,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTileGlow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  tileLabel: {
    fontSize: Metrics.fontXs,
    fontWeight: "700",
    color: Palette.inkBody,
  },
  heroTileLabel: {
    fontSize: Metrics.fontXs,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  bottomCtaRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  vacateBtn: {
    flex: 2,
  },
  recheckBtn: {
    flex: 1.2,
  },
  vacantSpotContent: {
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
  },
  vacantIllustration: {
    width: 72,
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  vacantOuterHalo: {
    position: "absolute",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(37, 99, 235, 0.08)",
  },
  vacantInnerHalo: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(37, 99, 235, 0.14)",
  },
  vacantIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.brandLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.2)",
  },
  vacantTextCluster: {
    alignItems: "center",
    gap: 4,
  },
  vacantHeading: {
    fontSize: Metrics.fontXl,
    fontWeight: "800",
    color: Palette.inkHeading,
    letterSpacing: -0.3,
  },
  vacantSubtext: {
    fontSize: Metrics.fontSm,
    color: Palette.inkMuted,
    textAlign: "center",
    paddingHorizontal: 16,
    lineHeight: 18,
  },
  vacantCtaBtn: {
    width: "100%",
    marginTop: 4,
  },
});
