import React, { useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";

import ActionButton from "~/components/ActionButton";
import AppHeader from "~/components/AppHeader";
import SpecRow from "~/components/SpecRow";
import StatusPill from "~/components/StatusPill";
import { Elevation, Metrics, Palette } from "~/core/theme";
import { useLiveLocation } from "~/hooks/useLiveLocation";
import { shareSpotDetails } from "~/services/contentSharer";
import { buildMapRegion, launchExternalDirections } from "~/services/mapLauncher";
import { useParkingStore } from "~/state/ParkingStore";
import { computeSurfaceDistance, formatMetricDistance } from "~/utils/geoMath";
import { formatFullDateTime, formatParkingDuration, formatTimeOnly, formatTimeRemaining } from "~/utils/timeAgo";

function formatDuration(secs) {
  if (!secs || isNaN(secs)) return "00:00";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function SpotDetailScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { recordId } = route.params;
  const { sessionLogs, activeSpot, vacateCurrentSpot, reoccupySpot, discardSpotRecord } =
    useParkingStore();
  const { coords } = useLiveLocation();

  const record = sessionLogs.find((r) => r.id === recordId);
  const isOccupied = record?.state === "OCCUPIED";

  // Trạng thái phát lại ghi âm chỉ dẫn
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSecs, setPlaybackSecs] = useState(0);
  const soundInstanceRef = useRef(null);

  useEffect(() => {
    return () => {
      if (soundInstanceRef.current) {
        soundInstanceRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const onTogglePlaySound = async () => {
    if (!record?.voiceNoteUri) return;

    try {
      if (soundInstanceRef.current) {
        if (isPlaying) {
          await soundInstanceRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          await soundInstanceRef.current.playAsync();
          setIsPlaying(true);
        }
      } else {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });

        const { sound } = await Audio.Sound.createAsync(
          { uri: record.voiceNoteUri },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded) {
              setPlaybackSecs(Math.floor((status.positionMillis || 0) / 1000));
              if (status.didJustFinish) {
                setIsPlaying(false);
                setPlaybackSecs(0);
                sound.setPositionAsync(0);
              }
            }
          },
        );
        soundInstanceRef.current = sound;
        setIsPlaying(true);
      }
    } catch (err) {
      console.warn("Lỗi phát ghi âm:", err);
      Alert.alert("Lỗi", "Không thể phát bản ghi âm.");
    }
  };

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

  const durationStr = formatParkingDuration(record.parkedAt, record.vacatedAt);
  const timeRemainingStr = isOccupied && record.expiresAt ? formatTimeRemaining(record.expiresAt) : null;

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
      <AppHeader
        title="Chi tiết vị trí đỗ"
        onGoBack={() => navigation.goBack()}
        actionSlot={
          <Pressable
            onPress={onShare}
            style={({ pressed }) => [styles.shareHeaderBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Chia sẻ"
          >
            <Ionicons name="share-social-outline" size={20} color={Palette.inkHeading} />
          </Pressable>
        }
      />

      <ScrollView
        contentContainerStyle={[styles.scrollArea, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Bản đồ định vị */}
        <View style={styles.mapCard}>
          <MapView
            style={styles.mapView}
            region={mapFrame}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            <Marker coordinate={record.position}>
              <View style={styles.markerPin}>
                <Ionicons name="car" size={16} color="#FFFFFF" />
              </View>
            </Marker>
          </MapView>

          <View style={styles.mapOverlayHeader}>
            <StatusPill isOccupied={isOccupied} />
            {separationMeters !== null ? (
              <View style={styles.distanceBadge}>
                <Ionicons name="navigate" size={12} color={Palette.brand} />
                <Text style={styles.distanceBadgeText}>
                  Cách bạn {formatMetricDistance(separationMeters)}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Ảnh chụp ô đỗ nếu có */}
        {record.snapshotUri ? (
          <View style={styles.photoCard}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="camera-outline" size={16} color={Palette.brand} />
              <Text style={styles.cardTitle}>Ảnh nhận diện ô đỗ</Text>
            </View>
            <Image
              source={{ uri: record.snapshotUri }}
              style={styles.snapshotImg}
              resizeMode="cover"
            />
          </View>
        ) : null}

        {/* Thông tin Địa chỉ & Tọa độ */}
        <View style={styles.infoCard}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="location-outline" size={16} color={Palette.brand} />
            <Text style={styles.cardTitle}>Địa điểm & Tọa độ</Text>
          </View>

          <Text style={styles.addressHeading}>{record.locationName}</Text>

          <View style={styles.coordsStrip}>
            <Ionicons name="navigate-circle-outline" size={15} color={Palette.inkMuted} />
            <Text style={styles.coordsText}>
              {record.position.latitude.toFixed(6)}, {record.position.longitude.toFixed(6)}
            </Text>
          </View>
        </View>

        {/* Thông tin Phương tiện */}
        <View style={styles.infoCard}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="car-sport-outline" size={16} color={Palette.brand} />
            <Text style={styles.cardTitle}>Phương tiện đỗ</Text>
          </View>

          <SpecRow
            caption="Tên phương tiện"
            val={record.vehicleName || "Phương tiện của tôi"}
          />
          {record.vehiclePlate ? (
            <SpecRow
              caption="Biển số xe"
              val={record.vehiclePlate}
            />
          ) : null}
          <SpecRow
            caption="Loại xe"
            val={
              record.vehicleType === "bike"
                ? "Xe máy"
                : record.vehicleType === "bicycle"
                  ? "Xe đạp / Điện"
                  : record.vehicleType === "other"
                    ? "Khác"
                    : "Ô tô"
            }
            noBorder
          />
        </View>

        {/* Nút Play nghe ghi âm chỉ dẫn vị trí (giữa Phương tiện đỗ và Thời gian đỗ xe) */}
        {record.voiceNoteUri ? (
          <View style={styles.voiceNoteCard}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="mic-outline" size={16} color={Palette.danger} />
              <Text style={styles.cardTitle}>Ghi âm giọng nói chỉ dẫn</Text>
              {record.voiceDurationSecs ? (
                <View style={styles.voiceDurationBadge}>
                  <Text style={styles.voiceDurationBadgeText}>
                    {formatDuration(record.voiceDurationSecs)}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.audioPlayerBox}>
              <Pressable
                onPress={onTogglePlaySound}
                style={({ pressed }) => [
                  styles.audioPlayBtn,
                  isPlaying && styles.audioPlayBtnActive,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={22}
                  color="#FFFFFF"
                />
              </Pressable>

              <View style={styles.audioTrackContent}>
                <View style={styles.audioWaveRow}>
                  <Ionicons
                    name="volume-medium"
                    size={18}
                    color={isPlaying ? Palette.brand : Palette.inkMuted}
                  />
                  <Text style={styles.audioProgressText}>
                    {isPlaying ? `${formatDuration(playbackSecs)} / ` : ""}
                    {formatDuration(record.voiceDurationSecs || 0)}
                  </Text>
                </View>
                <Text style={styles.audioHintText}>
                  {isPlaying ? "Đang phát ghi âm chỉ dẫn..." : "Chạm nút Play để nghe lại chỉ dẫn giọng nói"}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Thông tin Hạn đỗ xe nếu có */}
        {record.expiresAt ? (
          <View style={styles.infoCard}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="timer-outline" size={16} color={Palette.alert} />
              <Text style={styles.cardTitle}>Hạn giờ đỗ xe</Text>
            </View>

            {timeRemainingStr ? (
              <SpecRow
                caption="Thời gian còn lại"
                val={timeRemainingStr}
              />
            ) : null}
            <SpecRow
              caption="Thời điểm hết giờ"
              val={formatFullDateTime(record.expiresAt)}
            />
            {record.timerMinutes ? (
              <SpecRow
                caption="Giới hạn đã đặt"
                val={`${record.timerMinutes} phút`}
                noBorder
              />
            ) : null}
          </View>
        ) : null}

        {/* Thông tin Ô đỗ (Tầng, Khu, Ô) */}
        {(record.level || record.sector || record.bayNumber) ? (
          <View style={styles.infoCard}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="layers-outline" size={16} color={Palette.accent} />
              <Text style={styles.cardTitle}>Chi tiết vị trí ô đỗ</Text>
            </View>

            <View style={styles.specsRow}>
              <View style={styles.specBox}>
                <Text style={styles.specKey}>TẦNG</Text>
                <Text style={styles.specVal}>{record.level || "--"}</Text>
              </View>
              <View style={styles.specBox}>
                <Text style={styles.specKey}>KHU VỰC</Text>
                <Text style={styles.specVal}>{record.sector || "--"}</Text>
              </View>
              <View style={[styles.specBox, styles.specBoxAccent]}>
                <Text style={[styles.specKey, styles.specKeyAccent]}>SỐ Ô ĐỖ</Text>
                <Text style={[styles.specVal, styles.specValAccent]}>{record.bayNumber || "--"}</Text>
              </View>
            </View>
          </View>
        ) : null}

        {/* Thời gian */}
        <View style={styles.infoCard}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="time-outline" size={16} color={Palette.positive} />
            <Text style={styles.cardTitle}>Thời gian đỗ xe</Text>
          </View>

          <SpecRow
            caption="Thời điểm bắt đầu đỗ"
            val={formatFullDateTime(record.parkedAt)}
          />
          {record.vacatedAt ? (
            <SpecRow
              caption="Thời điểm lấy xe"
              val={formatFullDateTime(record.vacatedAt)}
            />
          ) : null}
          {durationStr ? (
            <SpecRow
              caption="Tổng thời gian đỗ"
              val={durationStr}
              noBorder
            />
          ) : null}
        </View>

        {/* Ghi chú */}
        {record.memo ? (
          <View style={styles.infoCard}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="document-text-outline" size={16} color={Palette.inkHeading} />
              <Text style={styles.cardTitle}>Ghi chú đính kèm</Text>
            </View>
            <Text style={styles.memoContent}>{record.memo}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <View style={[styles.fixedBottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {isOccupied ? (
          <View style={styles.occupiedActionCluster}>
            <View style={styles.btnRow}>
              <ActionButton
                label="La bàn tìm xe"
                icon={<Ionicons name="compass" size={18} color="#FFFFFF" />}
                onPress={onOpenRadar}
                kind="filled"
                scale="md"
                style={styles.flexBtn}
              />
              <ActionButton
                label="Chỉ đường"
                icon={<Ionicons name="navigate-outline" size={18} color={Palette.brand} />}
                onPress={onNavigateExternal}
                kind="bordered"
                scale="md"
                style={styles.flexBtn}
              />
            </View>
            <ActionButton
              label="✓ Đã lấy xe (Hoàn tất)"
              onPress={onVacate}
              kind="tinted"
              scale="md"
            />
          </View>
        ) : (
          <View style={styles.btnRow}>
            <ActionButton
              label="Đặt lại làm xe đang đỗ"
              icon={<Ionicons name="refresh" size={16} color={Palette.brand} />}
              onPress={onReoccupy}
              kind="bordered"
              scale="md"
              style={styles.flexBtn}
            />
            <ActionButton
              label="Xóa bản ghi"
              icon={<Ionicons name="trash-outline" size={16} color="#FFFFFF" />}
              onPress={onDiscard}
              kind="destructive"
              scale="md"
              style={styles.deleteBtn}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  missingCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  missingText: {
    fontSize: Metrics.fontBase,
    color: Palette.inkMuted,
  },
  shareHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.cardSubtle,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  scrollArea: {
    padding: 16,
    gap: 14,
  },
  mapCard: {
    height: 190,
    borderRadius: Metrics.radiusLg,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: Palette.outline,
    ...Elevation.flat,
  },
  mapView: {
    flex: 1,
  },
  markerPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    ...Elevation.raised,
  },
  mapOverlayHeader: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Metrics.radiusPill,
    gap: 4,
    borderWidth: 1,
    borderColor: Palette.outline,
    ...Elevation.flat,
  },
  distanceBadgeText: {
    fontSize: Metrics.fontXs,
    fontWeight: "700",
    color: Palette.inkHeading,
  },
  photoCard: {
    backgroundColor: Palette.card,
    borderRadius: Metrics.radiusMd,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.outline,
    gap: 10,
    ...Elevation.flat,
  },
  voiceNoteCard: {
    backgroundColor: Palette.card,
    borderRadius: Metrics.radiusMd,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.outline,
    gap: 12,
    ...Elevation.flat,
  },
  voiceDurationBadge: {
    marginLeft: "auto",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Metrics.radiusPill,
  },
  voiceDurationBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: Palette.danger,
  },
  audioPlayerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.cardSubtle,
    borderRadius: Metrics.radiusSm,
    padding: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  audioPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.brand,
    alignItems: "center",
    justifyContent: "center",
    ...Elevation.flat,
  },
  audioPlayBtnActive: {
    backgroundColor: Palette.danger,
  },
  audioTrackContent: {
    flex: 1,
    gap: 2,
  },
  audioWaveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  audioProgressText: {
    fontSize: Metrics.fontSm,
    fontWeight: "700",
    color: Palette.inkHeading,
  },
  audioHintText: {
    fontSize: Metrics.fontXs,
    color: Palette.inkMuted,
  },
  snapshotImg: {
    width: "100%",
    height: 220,
    borderRadius: Metrics.radiusSm,
    backgroundColor: Palette.outline,
  },
  infoCard: {
    backgroundColor: Palette.card,
    borderRadius: Metrics.radiusMd,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.outline,
    gap: 10,
    ...Elevation.flat,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: {
    fontSize: Metrics.fontSm,
    fontWeight: "700",
    color: Palette.inkHeading,
  },
  addressHeading: {
    fontSize: Metrics.fontLg,
    fontWeight: "800",
    color: Palette.inkHeading,
    lineHeight: 24,
  },
  coordsStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.cardSubtle,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Metrics.radiusSm,
    gap: 6,
  },
  coordsText: {
    fontSize: Metrics.fontXs,
    color: Palette.inkMuted,
    fontWeight: "600",
  },
  specsRow: {
    flexDirection: "row",
    gap: 8,
  },
  specBox: {
    flex: 1,
    backgroundColor: Palette.cardSubtle,
    padding: 10,
    borderRadius: Metrics.radiusSm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Palette.outline,
    gap: 3,
  },
  specBoxAccent: {
    backgroundColor: Palette.brandLight,
    borderColor: "rgba(37, 99, 235, 0.25)",
  },
  specKey: {
    fontSize: 9,
    fontWeight: "800",
    color: Palette.inkMuted,
    letterSpacing: 0.5,
  },
  specKeyAccent: {
    color: Palette.brandDark,
  },
  specVal: {
    fontSize: Metrics.fontBase,
    fontWeight: "800",
    color: Palette.inkHeading,
  },
  specValAccent: {
    color: Palette.brandDark,
  },
  memoContent: {
    fontSize: Metrics.fontBase,
    color: Palette.inkBody,
    lineHeight: 22,
    fontStyle: "italic",
    backgroundColor: Palette.cardSubtle,
    padding: 12,
    borderRadius: Metrics.radiusSm,
  },
  fixedBottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Palette.outline,
    ...Elevation.raised,
  },
  occupiedActionCluster: {
    gap: 8,
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
  },
  flexBtn: {
    flex: 1,
  },
  deleteBtn: {
    flex: 0.8,
  },
});
