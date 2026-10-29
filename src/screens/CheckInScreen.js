import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

import ActionButton from "~/components/ActionButton";
import AppHeader from "~/components/AppHeader";
import AppSpinner from "~/components/AppSpinner";
import { APP_CONFIG } from "~/core/config";
import { Metrics, Palette } from "~/core/theme";
import { useLiveLocation } from "~/hooks/useLiveLocation";
import { resolveStreetAddress } from "~/services/addressResolver";
import { buildMapRegion } from "~/services/mapLauncher";
import { archiveSnapshot, evictSnapshot } from "~/services/photoVault";
import { useParkingStore } from "~/state/ParkingStore";

export default function CheckInScreen({ navigation }) {
  const { checkInSpot } = useParkingStore();
  const { coords, busy: locating, errorMessage: gpsError, refreshLocation } = useLiveLocation();

  const mapInstance = useRef(null);
  const locationInitialized = useRef(false);
  const seqCounter = useRef(0);

  const [pinPosition, setPinPosition] = useState(null);
  const [addressInput, setAddressInput] = useState("");
  const [resolvingAddress, setResolvingAddress] = useState(false);

  const [levelVal, setLevelVal] = useState("");
  const [sectorVal, setSectorVal] = useState("");
  const [bayVal, setBayVal] = useState("");
  const [memoVal, setMemoVal] = useState("");

  const [photoUri, setPhotoUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const syncCoordinates = useCallback(
    async (target, { panMap = false } = {}) => {
      if (!Number.isFinite(target?.latitude) || !Number.isFinite(target?.longitude)) {
        return;
      }

      const point = {
        latitude: target.latitude,
        longitude: target.longitude,
      };

      setPinPosition(point);

      if (panMap) {
        mapInstance.current?.animateToRegion(
          buildMapRegion(point.latitude, point.longitude, 0.003),
          300,
        );
      }

      const currentSeq = seqCounter.current + 1;
      seqCounter.current = currentSeq;
      setResolvingAddress(true);

      try {
        const text = await resolveStreetAddress(point.latitude, point.longitude);
        if (seqCounter.current === currentSeq) {
          setAddressInput(text);
        }
      } finally {
        if (seqCounter.current === currentSeq) {
          setResolvingAddress(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (coords && !locationInitialized.current) {
      locationInitialized.current = true;
      syncCoordinates(coords, { panMap: true });
    }
  }, [coords, syncCoordinates]);

  const onUseGpsInstant = async () => {
    const livePoint = (await refreshLocation()) || coords;
    if (!livePoint) {
      Alert.alert(
        "Chưa lấy được GPS",
        "Hãy chắc chắn rằng dịch vụ định vị đang được bật trên điện thoại.",
      );
      return;
    }

    locationInitialized.current = true;
    await syncCoordinates(livePoint, { panMap: true });
  };

  const onSnapCamera = async () => {
    try {
      const auth = await ImagePicker.requestCameraPermissionsAsync();
      if (!auth.granted) {
        Alert.alert("Yêu cầu quyền máy ảnh", "Vui lòng cấp quyền camera để chụp ảnh ô đỗ xe.");
        return;
      }

      const shot = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.75,
      });

      if (!shot.canceled && shot.assets?.[0]?.uri) {
        setPhotoUri(shot.assets[0].uri);
      }
    } catch (err) {
      console.warn("Lỗi camera:", err);
      Alert.alert("Lỗi", "Không thể kích hoạt máy ảnh.");
    }
  };

  const onSubmitCheckIn = async () => {
    if (!pinPosition) {
      Alert.alert("Thiếu vị trí", "Vui lòng chọn hoặc kéo ghim định vị trên bản đồ.");
      return;
    }

    setSubmitting(true);
    let permanentPhoto = null;

    try {
      permanentPhoto = photoUri ? archiveSnapshot(photoUri) : null;

      await checkInSpot({
        latitude: pinPosition.latitude,
        longitude: pinPosition.longitude,
        locationName: addressInput.trim() || "Vị trí không xác định",
        level: levelVal,
        sector: sectorVal,
        bayNumber: bayVal,
        memo: memoVal,
        snapshotUri: permanentPhoto,
      });

      Alert.alert("Thành công", "Đã lưu vị trí đỗ xe thành công!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      if (permanentPhoto) {
        evictSnapshot(permanentPhoto);
      }
      Alert.alert("Lỗi", "Không thể lưu dữ liệu đỗ xe. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (locating && !pinPosition) {
    return <AppSpinner coversScreen notice="Đang lấy tọa độ GPS của thiết bị..." />;
  }

  const initialLoc = pinPosition || coords || APP_CONFIG.DEFAULT_CENTER;
  const initialMapRegion = buildMapRegion(
    initialLoc.latitude,
    initialLoc.longitude,
    pinPosition || coords ? 0.005 : 0.05,
  );

  return (
    <SafeAreaView style={styles.safeContainer} edges={["bottom"]}>
      <AppHeader title="Lưu vị trí đỗ xe" onGoBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollArea}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Vùng chọn vị trí trên bản đồ */}
          <View style={styles.mapFrame}>
            <MapView
              ref={mapInstance}
              style={styles.mapElement}
              initialRegion={initialMapRegion}
              showsUserLocation
              showsMyLocationButton={false}
              onPress={(ev) => syncCoordinates(ev.nativeEvent.coordinate)}
            >
              {pinPosition ? (
                <Marker
                  coordinate={pinPosition}
                  title="Vị trí đỗ"
                  description="Kéo ghim hoặc bấm bản đồ để di dời"
                  pinColor={Palette.brand}
                  draggable
                  onDragEnd={(ev) => syncCoordinates(ev.nativeEvent.coordinate)}
                />
              ) : null}
            </MapView>

            <View style={styles.helperChip} pointerEvents="none">
              <Text style={styles.helperChipLabel}>Chạm hoặc kéo ghim để chỉnh vị trí</Text>
            </View>
          </View>

          {/* Nút đặt lại theo GPS tức thời */}
          <ActionButton
            label="Dùng vị trí GPS hiện tại"
            icon={<Ionicons name="locate" size={18} color={Palette.brand} />}
            onPress={onUseGpsInstant}
            kind="bordered"
            loading={locating}
          />

          {gpsError ? <Text style={styles.gpsErrorNotice}>{gpsError}</Text> : null}

          {pinPosition ? (
            <View style={styles.coordsStrip}>
              <Text style={styles.coordsStripText}>
                📍 {pinPosition.latitude.toFixed(6)}, {pinPosition.longitude.toFixed(6)}
              </Text>
            </View>
          ) : null}

          {/* Ô nhập địa chỉ */}
          <View style={styles.inputGroup}>
            <Text style={styles.groupLabel}>
              Địa chỉ {resolvingAddress ? "(đang cập nhật...)" : ""}
            </Text>
            <TextInput
              style={styles.multilineAddress}
              value={addressInput}
              onChangeText={setAddressInput}
              placeholder="Nhập hoặc hiệu chỉnh địa chỉ"
              placeholderTextColor={Palette.inkSubtle}
              multiline
            />
          </View>

          {/* Ô thông tin đỗ xe (Tầng, Khu, Ô đỗ) */}
          <View style={styles.inputGroup}>
            <Text style={styles.groupLabel}>Thông tin ô đỗ (Tầng, Khu, Số ô)</Text>
            <View style={styles.tripletRow}>
              <TextInput
                style={[styles.singleLineInput, styles.tripletBox]}
                value={levelVal}
                onChangeText={setLevelVal}
                placeholder="Tầng B2"
                placeholderTextColor={Palette.inkSubtle}
                maxLength={20}
              />
              <TextInput
                style={[styles.singleLineInput, styles.tripletBox]}
                value={sectorVal}
                onChangeText={setSectorVal}
                placeholder="Khu C"
                placeholderTextColor={Palette.inkSubtle}
                maxLength={20}
              />
              <TextInput
                style={[styles.singleLineInput, styles.tripletBox]}
                value={bayVal}
                onChangeText={setBayVal}
                placeholder="Ô C125"
                placeholderTextColor={Palette.inkSubtle}
                maxLength={20}
              />
            </View>
          </View>

          {/* Chụp hình vị trí */}
          <View style={styles.inputGroup}>
            <Text style={styles.groupLabel}>Ảnh nhận diện vị trí (tùy chọn)</Text>

            {photoUri ? (
              <View style={styles.photoPreviewCard}>
                <Image source={{ uri: photoUri }} style={styles.snapshotView} />
                <View style={styles.photoBtnGrid}>
                  <ActionButton
                    label="Chụp lại"
                    icon={<Ionicons name="camera-reverse-outline" size={16} color={Palette.brand} />}
                    onPress={onSnapCamera}
                    kind="bordered"
                    style={styles.halfBtn}
                  />
                  <ActionButton
                    label="Xóa ảnh"
                    icon={<Ionicons name="trash-outline" size={16} color="#FFFFFF" />}
                    onPress={() => setPhotoUri(null)}
                    kind="destructive"
                    style={styles.halfBtn}
                  />
                </View>
              </View>
            ) : (
              <ActionButton
                label="Chụp ảnh vị trí ô đỗ"
                icon={<Ionicons name="camera-outline" size={18} color={Palette.brand} />}
                onPress={onSnapCamera}
                kind="bordered"
              />
            )}
          </View>

          {/* Ghi chú */}
          <View style={styles.inputGroup}>
            <Text style={styles.groupLabel}>Ghi chú (tùy chọn)</Text>
            <TextInput
              style={[styles.multilineAddress, styles.memoInput]}
              value={memoVal}
              onChangeText={setMemoVal}
              placeholder="Ghi chú thêm: gần thang máy số 2, đối diện cột..."
              placeholderTextColor={Palette.inkSubtle}
              multiline
              maxLength={200}
            />
            <Text style={styles.countBadge}>{memoVal.length}/200</Text>
          </View>

          {/* Nút hoàn tất */}
          <ActionButton
            label="Lưu vị trí đỗ xe"
            onPress={onSubmitCheckIn}
            loading={submitting}
            disabled={!pinPosition}
            scale="lg"
            style={styles.submitCta}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  keyboardWrap: {
    flex: 1,
  },
  scrollArea: {
    padding: Metrics.gapMd,
    gap: Metrics.gapMd,
    paddingBottom: Metrics.gapXl + 20,
  },
  mapFrame: {
    height: 250,
    borderRadius: Metrics.radiusMd,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  mapElement: {
    flex: 1,
  },
  helperChip: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Metrics.radiusPill,
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  helperChipLabel: {
    color: Palette.brandDark,
    fontSize: Metrics.fontXs,
    fontWeight: "700",
  },
  coordsStrip: {
    backgroundColor: Palette.card,
    padding: Metrics.gapSm,
    borderRadius: Metrics.radiusSm,
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  coordsStripText: {
    fontSize: Metrics.fontXs,
    color: Palette.inkMuted,
    textAlign: "center",
    fontWeight: "500",
  },
  gpsErrorNotice: {
    color: Palette.danger,
    fontSize: Metrics.fontXs,
    textAlign: "center",
  },
  inputGroup: {
    gap: 6,
  },
  groupLabel: {
    fontSize: Metrics.fontSm,
    fontWeight: "600",
    color: Palette.inkHeading,
  },
  singleLineInput: {
    backgroundColor: Palette.card,
    borderRadius: Metrics.radiusSm,
    borderWidth: 1,
    borderColor: Palette.outline,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: Metrics.fontBase,
    color: Palette.inkHeading,
    minHeight: 46,
  },
  multilineAddress: {
    backgroundColor: Palette.card,
    borderRadius: Metrics.radiusSm,
    borderWidth: 1,
    borderColor: Palette.outline,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: Metrics.fontBase,
    color: Palette.inkHeading,
    minHeight: 52,
  },
  memoInput: {
    minHeight: 88,
    textAlignVertical: "top",
  },
  tripletRow: {
    flexDirection: "row",
    gap: Metrics.gapSm,
  },
  tripletBox: {
    flex: 1,
    textAlign: "center",
  },
  countBadge: {
    fontSize: Metrics.fontXs,
    color: Palette.inkSubtle,
    alignSelf: "flex-end",
  },
  photoPreviewCard: {
    gap: Metrics.gapSm,
  },
  snapshotView: {
    width: "100%",
    height: 220,
    borderRadius: Metrics.radiusMd,
    backgroundColor: Palette.outline,
  },
  photoBtnGrid: {
    flexDirection: "row",
    gap: Metrics.gapSm,
  },
  halfBtn: {
    flex: 1,
  },
  submitCta: {
    marginTop: 4,
  },
});
