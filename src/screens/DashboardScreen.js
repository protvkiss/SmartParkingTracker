import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
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
  const { activeSpots = [], vacateCurrentSpot, isLoading } = useParkingStore();
  const { coords, busy: locating, errorMessage: gpsError, refreshLocation } = useLiveLocation();
  const mapElement = useRef(null);
  const carouselRef = useRef(null);

  // Chỉ số thẻ xe đang được chọn hiển thị / căn giữa trên bản đồ
  const [activeSpotIndex, setActiveSpotIndex] = useState(0);

  // Bộ đếm nhịp để cập nhật thời gian đếm ngược thời gian thực
  const [, setTimerTick] = useState(0);

  useEffect(() => {
    const hasExpiry = activeSpots.some((s) => s.expiresAt);
    if (!hasExpiry) return;
    const interval = setInterval(() => {
      setTimerTick((t) => t + 1);
    }, 10000); // cập nhật mỗi 10 giây
    return () => clearInterval(interval);
  }, [activeSpots]);

  // Đảm bảo activeSpotIndex luôn hợp lệ khi danh sách xe thay đổi
  useEffect(() => {
    if (activeSpotIndex >= activeSpots.length && activeSpots.length > 0) {
      setActiveSpotIndex(activeSpots.length - 1);
    }
  }, [activeSpots.length, activeSpotIndex]);

  const currentSpot = activeSpots[activeSpotIndex] || activeSpots[0] || null;

  // Tự động căn giữa bản đồ vào vị trí phương tiện đang được chọn
  useEffect(() => {
    const target = currentSpot?.position || coords;
    if (target && mapElement.current) {
      mapElement.current.animateToRegion(
        buildMapRegion(
          target.latitude,
          target.longitude,
          currentSpot ? 0.004 : 0.008,
        ),
        450,
      );
    }
  }, [
    currentSpot?.id,
    currentSpot?.position?.latitude,
    currentSpot?.position?.longitude,
    coords?.latitude,
    coords?.longitude,
  ]);

  const onOpenDirections = (spot) => {
    const target = spot || currentSpot;
    if (!target?.position) return;
    launchExternalDirections(
      target.position.latitude,
      target.position.longitude,
      target.locationName,
    );
  };

  const onShareLocation = async (spot) => {
    const target = spot || currentSpot;
    if (!target) return;
    try {
      await shareSpotDetails(target);
    } catch (e) {
      Alert.alert("Thông báo", "Không mở được menu chia sẻ.");
    }
  };

  const onTriggerCheckIn = () => {
    navigation.navigate("CheckIn");
  };

  const onInspectDetail = (spotId) => {
    const targetId = spotId || currentSpot?.id;
    if (!targetId) return;
    navigation.navigate("SpotDetail", { recordId: targetId });
  };

  const onOpenRadar = (spotId) => {
    const targetId = spotId || currentSpot?.id;
    if (!targetId) return;
    navigation.navigate("Radar", { recordId: targetId });
  };

  const onConfirmVacateSpot = (spot) => {
    const target = spot || currentSpot;
    if (!target) return;
    Alert.alert(
      `Xác nhận đã lấy ${target.vehicleName || "xe"}?`,
      `Phiên đỗ của ${target.vehicleName || "xe này"} sẽ được chuyển vào mục lịch sử đỗ xe và các cảnh báo hẹn giờ sẽ dừng.`,
      [
        { text: "Để sau", style: "cancel" },
        {
          text: "Đã lấy xe",
          style: "default",
          onPress: async () => {
            try {
              await vacateCurrentSpot(target.id);
            } catch (err) {
              Alert.alert("Lỗi", "Không cập nhật được trạng thái.");
            }
          },
        },
      ],
    );
  };

  const onSelectSpotByIndex = (index) => {
    if (index >= 0 && index < activeSpots.length) {
      setActiveSpotIndex(index);
      carouselRef.current?.scrollToOffset({
        offset: index * SCREEN_WIDTH,
        animated: true,
      });
      const targetSpot = activeSpots[index];
      if (targetSpot?.position && mapElement.current) {
        mapElement.current.animateToRegion(
          buildMapRegion(targetSpot.position.latitude, targetSpot.position.longitude, 0.004),
          400,
        );
      }
    }
  };

  const onCarouselScrollEnd = (e) => {
    const contentOffsetX = e.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / SCREEN_WIDTH);
    if (newIndex >= 0 && newIndex < activeSpots.length && newIndex !== activeSpotIndex) {
      setActiveSpotIndex(newIndex);
      const targetSpot = activeSpots[newIndex];
      if (targetSpot?.position && mapElement.current) {
        mapElement.current.animateToRegion(
          buildMapRegion(targetSpot.position.latitude, targetSpot.position.longitude, 0.004),
          400,
        );
      }
    }
  };

  const onRecenterMap = async () => {
    if (currentSpot?.position) {
      mapElement.current?.animateToRegion(
        buildMapRegion(currentSpot.position.latitude, currentSpot.position.longitude, 0.004),
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

  const renderSpotCard = (spot) => {
    const spotDurationStr = formatParkingDuration(spot.parkedAt);
    const spotTimeRemainingStr = spot.expiresAt ? formatTimeRemaining(spot.expiresAt) : null;
    const spotAlertTier = spot.expiresAt ? getTimerAlertTier(spot.expiresAt) : "NONE";

    return (
      <View key={spot.id} style={styles.cardPageWrapper}>
        <View style={styles.cardFrame}>
          <View style={styles.activeSpotContent}>
            {/* Header của thẻ xe: Trạng thái & Tên Phương Tiện */}
            <View style={styles.cardHeaderRow}>
              <View style={styles.vehicleStatusCluster}>
                <StatusPill isOccupied />

                {/* Huy hiệu phương tiện đỗ */}
                <View style={styles.vehicleBadgePill}>
                  <Ionicons
                    name={getVehicleIcon(spot.vehicleType)}
                    size={12}
                    color={Palette.brandDark}
                  />
                  <Text style={styles.vehicleBadgeText} numberOfLines={1}>
                    {spot.vehicleName || "Xe của bạn"}
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() => onInspectDetail(spot.id)}
                style={({ pressed }) => [styles.infoCircleBtn, pressed && { opacity: 0.7 }]}
                hitSlop={8}
              >
                <Ionicons name="information-circle-outline" size={20} color={Palette.inkMuted} />
              </Pressable>
            </View>

            {/* Dòng Hẹn giờ đỗ xe nếu có */}
            {spotTimeRemainingStr ? (
              <View
                style={[
                  styles.timerBannerPill,
                  spotAlertTier === "EXPIRED" && styles.timerBannerExpired,
                  spotAlertTier === "CRITICAL_5" && styles.timerBannerCritical,
                  (spotAlertTier === "ALERT_15" || spotAlertTier === "ALERT_30") &&
                    styles.timerBannerWarning,
                ]}
              >
                <Ionicons
                  name={
                    spotAlertTier === "EXPIRED"
                      ? "alert-circle"
                      : spotAlertTier === "CRITICAL_5"
                        ? "warning"
                        : "alarm"
                  }
                  size={15}
                  color={
                    spotAlertTier === "EXPIRED" || spotAlertTier === "CRITICAL_5"
                      ? "#FFFFFF"
                      : spotAlertTier === "ALERT_15" || spotAlertTier === "ALERT_30"
                        ? Palette.alert
                        : Palette.brand
                  }
                />
                <Text
                  style={[
                    styles.timerBannerText,
                    (spotAlertTier === "EXPIRED" || spotAlertTier === "CRITICAL_5") &&
                      styles.timerBannerTextDark,
                  ]}
                >
                  {spotAlertTier === "EXPIRED"
                    ? `🛑 ĐÃ HẾT GIỜ ĐỖ XE (${spotTimeRemainingStr})`
                    : `Hạn đỗ: ${spotTimeRemainingStr} (Hết lúc ${formatTimeOnly(spot.expiresAt)})`}
                </Text>
              </View>
            ) : spotDurationStr ? (
              <View style={styles.durationPill}>
                <Ionicons name="hourglass-outline" size={12} color={Palette.inkMuted} />
                <Text style={styles.durationText}>Đã đỗ {spotDurationStr}</Text>
              </View>
            ) : null}

            {/* Tên vị trí & Địa chỉ */}
            <Pressable onPress={() => onInspectDetail(spot.id)}>
              <Text style={styles.locationHeadline} numberOfLines={2}>
                {spot.locationName || "Vị trí đã lưu"}
              </Text>
            </Pressable>

            {/* Slot Tags */}
            {(spot.level || spot.sector || spot.bayNumber || spot.vehiclePlate) ? (
              <View style={styles.slotTagRow}>
                {spot.vehiclePlate ? (
                  <View style={styles.plateTagBadge}>
                    <Ionicons name="card-outline" size={11} color={Palette.inkHeading} />
                    <Text style={styles.plateTagText}>{spot.vehiclePlate}</Text>
                  </View>
                ) : null}
                {spot.level ? (
                  <View style={styles.slotTagBadge}>
                    <Text style={styles.slotTagKey}>TẦNG</Text>
                    <Text style={styles.slotTagVal}>{spot.level}</Text>
                  </View>
                ) : null}
                {spot.sector ? (
                  <View style={styles.slotTagBadge}>
                    <Text style={styles.slotTagKey}>KHU</Text>
                    <Text style={styles.slotTagVal}>{spot.sector}</Text>
                  </View>
                ) : null}
                {spot.bayNumber ? (
                  <View style={[styles.slotTagBadge, styles.slotTagBadgeAccent]}>
                    <Text style={[styles.slotTagKey, styles.slotTagKeyAccent]}>SỐ Ô</Text>
                    <Text style={[styles.slotTagVal, styles.slotTagValAccent]}>
                      {spot.bayNumber}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Quick 4-action Grid */}
            <View style={styles.quickActionRow}>
              {/* 1. Radar (La bàn) */}
              <Pressable
                onPress={() => onOpenRadar(spot.id)}
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
                onPress={() => onOpenDirections(spot)}
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
                onPress={() => onShareLocation(spot)}
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
                onPress={() => onInspectDetail(spot.id)}
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

            {/* Bottom CTAs: Hoàn thành & Đỗ thêm xe */}
            <View style={styles.bottomCtaRow}>
              <ActionButton
                label="✓ Đã lấy xe"
                onPress={() => onConfirmVacateSpot(spot)}
                kind="tinted"
                scale="md"
                style={styles.vacateBtn}
              />
              <ActionButton
                label="+ Đỗ thêm xe"
                onPress={onTriggerCheckIn}
                kind="bordered"
                scale="md"
                style={styles.recheckBtn}
              />
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading || (locating && !coords && activeSpots.length === 0)) {
    return <AppSpinner coversScreen notice="Đang đồng bộ vệ tinh và vị trí xe..." />;
  }

  const mapCenter = currentSpot?.position
    ? buildMapRegion(currentSpot.position.latitude, currentSpot.position.longitude, 0.005)
    : coords
      ? buildMapRegion(coords.latitude, coords.longitude, 0.008)
      : APP_CONFIG.DEFAULT_CENTER;

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
        {activeSpots.map((spot, idx) => {
          const isFocused = idx === activeSpotIndex;
          return (
            <Marker
              key={spot.id}
              coordinate={spot.position}
              title={spot.vehicleName || "Xe của bạn"}
              description={spot.locationName}
              onPress={() => onSelectSpotByIndex(idx)}
              zIndex={isFocused ? 10 : 5}
            >
              <View style={styles.customVehicleMarker}>
                {isFocused ? <View style={styles.markerBeaconHalo} /> : null}
                <View
                  style={[
                    styles.markerIconBox,
                    isFocused ? styles.markerIconBoxFocused : styles.markerIconBoxUnfocused,
                  ]}
                >
                  <Ionicons
                    name={getVehicleIcon(spot.vehicleType)}
                    size={isFocused ? 18 : 15}
                    color="#FFFFFF"
                  />
                </View>
                {/* Tag tên/biển số xe dưới marker để phân biệt */}
                <View style={[styles.markerPlateBadge, isFocused && styles.markerPlateBadgeFocused]}>
                  <Text
                    style={[styles.markerPlateText, isFocused && styles.markerPlateTextFocused]}
                    numberOfLines={1}
                  >
                    {spot.vehiclePlate || spot.vehicleName || "Xe"}
                  </Text>
                </View>
                <View style={[styles.markerPinPointer, isFocused && styles.markerPinPointerFocused]} />
              </View>
            </Marker>
          );
        })}
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
              {activeSpots.length > 1
                ? `Đang đỗ ${activeSpots.length} xe (${currentSpot?.vehicleName || "Xe"})`
                : activeSpots.length === 1
                  ? `Đang ghi nhớ ${currentSpot?.vehicleName || "xe của bạn"}`
                  : "Sẵn sàng ghi nhớ vị trí"}
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
            name={activeSpots.length > 0 ? "car-outline" : "locate"}
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
        {activeSpots.length > 1 ? (
          <View style={styles.carouselHeaderTabs} pointerEvents="auto">
            {activeSpots.map((s, idx) => (
              <Pressable
                key={s.id}
                onPress={() => onSelectSpotByIndex(idx)}
                style={[
                  styles.vehicleSwitcherTab,
                  idx === activeSpotIndex && styles.vehicleSwitcherTabActive,
                ]}
              >
                <Ionicons
                  name={getVehicleIcon(s.vehicleType)}
                  size={13}
                  color={idx === activeSpotIndex ? Palette.brand : Palette.inkMuted}
                />
                <Text
                  style={[
                    styles.vehicleSwitcherTabText,
                    idx === activeSpotIndex && styles.vehicleSwitcherTabTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {s.vehicleName || `Xe ${idx + 1}`}
                </Text>
                {idx === activeSpotIndex ? <View style={styles.tabActiveDot} /> : null}
              </Pressable>
            ))}
            <View style={styles.swipeTipCluster}>
              <Text style={styles.swipeTipText}>← Lướt xem xe khác →</Text>
            </View>
          </View>
        ) : null}

        {activeSpots.length > 0 ? (
          <FlatList
            ref={carouselRef}
            data={activeSpots}
            keyExtractor={(item) => item.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={onCarouselScrollEnd}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            pointerEvents="auto"
            renderItem={({ item: spot }) => renderSpotCard(spot)}
          />
        ) : (
          <View style={styles.cardPageWrapper} pointerEvents="auto">
            <View style={styles.cardFrame}>
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
            </View>
          </View>
        )}
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
  markerIconBoxFocused: {
    backgroundColor: Palette.brand,
    transform: [{ scale: 1.08 }],
  },
  markerIconBoxUnfocused: {
    backgroundColor: "#64748B",
    opacity: 0.88,
  },
  markerPlateBadge: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: Metrics.radiusPill,
    marginTop: 2,
    borderWidth: 1,
    borderColor: Palette.outline,
    maxWidth: 95,
    ...Elevation.flat,
  },
  markerPlateBadgeFocused: {
    backgroundColor: Palette.brandLight,
    borderColor: Palette.brand,
  },
  markerPlateText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: Palette.inkHeading,
  },
  markerPlateTextFocused: {
    color: Palette.brandDark,
    fontWeight: "800",
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
  markerPinPointerFocused: {
    borderTopColor: Palette.brand,
  },
  cardPageWrapper: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 14,
  },
  carouselHeaderTabs: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  vehicleSwitcherTab: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Metrics.radiusPill,
    borderWidth: 1,
    borderColor: Palette.outline,
    gap: 5,
    ...Elevation.flat,
  },
  vehicleSwitcherTabActive: {
    backgroundColor: "#FFFFFF",
    borderColor: Palette.brand,
    borderWidth: 1.5,
    ...Elevation.raised,
  },
  vehicleSwitcherTabText: {
    fontSize: Metrics.fontXs,
    fontWeight: "600",
    color: Palette.inkMuted,
    maxWidth: 95,
  },
  vehicleSwitcherTabTextActive: {
    color: Palette.brandDark,
    fontWeight: "800",
  },
  tabActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.brand,
  },
  swipeTipCluster: {
    marginLeft: "auto",
  },
  swipeTipText: {
    fontSize: 10,
    fontWeight: "600",
    color: Palette.inkSubtle,
    backgroundColor: "rgba(255, 255, 255, 0.88)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Metrics.radiusPill,
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
