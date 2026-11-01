import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";

import ActionButton from "~/components/ActionButton";
import AppHeader from "~/components/AppHeader";
import AppSpinner from "~/components/AppSpinner";
import { APP_CONFIG } from "~/core/config";
import { Elevation, Metrics, Palette } from "~/core/theme";
import { useLiveLocation } from "~/hooks/useLiveLocation";
import { resolveStreetAddress } from "~/services/addressResolver";
import { buildMapRegion } from "~/services/mapLauncher";
import { archiveSnapshot, evictSnapshot } from "~/services/photoVault";
import { useParkingStore } from "~/state/ParkingStore";
import { formatTimeOnly } from "~/utils/timeAgo";

const QUICK_FLOORS = ["B2", "B1", "T1", "T2", "Mặt đất"];
const QUICK_SECTORS = ["A", "B", "C", "D"];
const QUICK_NOTES = ["Gần thang máy", "Cạnh cột lớn", "Lối ra chính", "Cạnh cửa thoát hiểm"];

const TIMER_PRESETS = [
  { label: "30p", mins: 30 },
  { label: "1 giờ", mins: 60 },
  { label: "2 giờ", mins: 120 },
  { label: "3 giờ", mins: 180 },
  { label: "4 giờ", mins: 240 },
];

const CLOCK_PRESETS = ["18:00", "20:00", "21:00", "22:00", "23:00"];

function calculateMinutesFromClockTime(hourStr, minStr) {
  const h = parseInt(hourStr, 10);
  const m = parseInt(minStr || "0", 10);
  if (Number.isNaN(h) || h < 0 || h > 23 || Number.isNaN(m) || m < 0 || m > 59) {
    return 60; // fallback mặc định 60 phút
  }

  const now = new Date();
  const target = new Date();
  target.setHours(h, m, 0, 0);

  // Nếu giờ hẹn nhỏ hơn hoặc bằng giờ hiện tại, coi như là giờ của ngày mai (ca tối/đêm)
  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  const diffMs = target.getTime() - now.getTime();
  return Math.max(1, Math.round(diffMs / 60000));
}

function formatSecs(secs) {
  if (!secs || isNaN(secs)) return "00:00";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
}

export default function CheckInScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { checkInSpot, vehicles, defaultVehicle, activeSpots = [] } = useParkingStore();
  const { coords, busy: locating, errorMessage: gpsError, refreshLocation } = useLiveLocation();

  const mapInstance = useRef(null);
  const locationInitialized = useRef(false);
  const seqCounter = useRef(0);

  const [pinPosition, setPinPosition] = useState(null);
  const [addressInput, setAddressInput] = useState("");
  const [resolvingAddress, setResolvingAddress] = useState(false);

  // Phương tiện được chọn (ưu tiên chọn xe chưa có điểm đỗ nếu có nhiều xe)
  const unparkedVehicle = vehicles.find((v) => !activeSpots.some((s) => s.vehicleId === v.id));
  const [selectedVehicle, setSelectedVehicle] = useState(
    unparkedVehicle || defaultVehicle || vehicles[0] || null,
  );
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);

  // Hẹn giờ giới hạn đỗ xe
  const [isTimerEnabled, setIsTimerEnabled] = useState(false);
  const [timerMode, setTimerMode] = useState("duration"); // 'duration' (theo số phút) | 'clock' (theo giờ hẹn cụ thể vd: 22:00)
  const [timerMinutes, setTimerMinutes] = useState(120); // mặc định 120 phút (2 giờ)
  const [customMinutesInput, setCustomMinutesInput] = useState("120");

  // Giờ hẹn theo mốc thời gian (vd: 22:00)
  const [clockHourInput, setClockHourInput] = useState("22");
  const [clockMinInput, setClockMinInput] = useState("00");

  const [levelVal, setLevelVal] = useState("");
  const [sectorVal, setSectorVal] = useState("");
  const [bayVal, setBayVal] = useState("");
  const [memoVal, setMemoVal] = useState("");

  const [photoUri, setPhotoUri] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Ghi âm chỉ dẫn vị trí
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [voiceUri, setVoiceUri] = useState(null);
  const [voiceDuration, setVoiceDuration] = useState(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const soundRef = useRef(null);
  const recordTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  // Trạng thái hiển thị bàn phím & refs chuyển focus
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);
  const sectorInputRef = useRef(null);
  const bayInputRef = useRef(null);
  const clockMinInputRef = useRef(null);

  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvt, () => setIsKeyboardActive(true));
    const hideSub = Keyboard.addListener(hideEvt, () => setIsKeyboardActive(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Cập nhật selectedVehicle nếu defaultVehicle hoặc danh sách xe thay đổi
  useEffect(() => {
    if (vehicles.length === 0) {
      setSelectedVehicle(null);
    } else if (!selectedVehicle || !vehicles.some((v) => v.id === selectedVehicle.id)) {
      const nextUnparked = vehicles.find((v) => !activeSpots.some((s) => s.vehicleId === v.id));
      setSelectedVehicle(nextUnparked || defaultVehicle || vehicles[0] || null);
    }
  }, [defaultVehicle, selectedVehicle, vehicles, activeSpots]);

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

  const onStartRecordAudio = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Quyền Microphone",
          "Vui lòng cấp quyền micro trong cài đặt điện thoại để sử dụng tính năng ghi âm chỉ dẫn vị trí.",
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordDuration(0);

      recordTimerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn("Lỗi bắt đầu ghi âm:", err);
      Alert.alert("Lỗi", "Không thể bắt đầu ghi âm.");
    }
  };

  const onStopRecordAudio = async () => {
    if (!recording) return;
    try {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setVoiceUri(uri);
      setVoiceDuration(recordDuration);
      setRecording(null);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });
    } catch (err) {
      console.warn("Lỗi dừng ghi âm:", err);
    }
  };

  const onCancelRecordAudio = async () => {
    if (!recording) return;
    try {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      setRecording(null);
      setRecordDuration(0);
    } catch (err) {
      console.warn("Lỗi hủy ghi âm:", err);
    }
  };

  const onDeleteVoiceNote = async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      } catch (e) {}
    }
    setVoiceUri(null);
    setVoiceDuration(null);
    setIsPlayingVoice(false);
  };

  const onTogglePlayVoicePreview = async () => {
    if (!voiceUri) return;
    try {
      if (soundRef.current) {
        if (isPlayingVoice) {
          await soundRef.current.pauseAsync();
          setIsPlayingVoice(false);
        } else {
          await soundRef.current.playAsync();
          setIsPlayingVoice(true);
        }
      } else {
        const { sound } = await Audio.Sound.createAsync(
          { uri: voiceUri },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded && status.didJustFinish) {
              setIsPlayingVoice(false);
              sound.setPositionAsync(0);
            }
          },
        );
        soundRef.current = sound;
        setIsPlayingVoice(true);
      }
    } catch (err) {
      console.warn("Lỗi phát âm thanh:", err);
    }
  };

  const onAppendQuickNote = (noteText) => {
    setMemoVal((prev) => {
      if (!prev) return noteText;
      if (prev.includes(noteText)) return prev;
      return `${prev}, ${noteText}`.slice(0, 200);
    });
  };

  // Cập nhật khi chọn preset số phút
  const onChangePresetMinutes = (mins) => {
    setTimerMinutes(mins);
    setCustomMinutesInput(String(mins));
  };

  // Cập nhật khi tự gõ số phút
  const onChangeCustomMinutes = (text) => {
    const cleanNum = text.replace(/[^0-9]/g, "");
    setCustomMinutesInput(cleanNum);
    const parsed = parseInt(cleanNum, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      setTimerMinutes(parsed);
    }
  };

  // Cập nhật khi tự gõ giờ hẹn (HH:mm)
  const onUpdateClockTime = (hour, min) => {
    setClockHourInput(hour);
    setClockMinInput(min);
    const mins = calculateMinutesFromClockTime(hour, min);
    setTimerMinutes(mins);
  };

  // Chọn preset giờ hẹn (vd: 22:00)
  const onSelectClockPreset = (clockStr) => {
    const [h, m] = clockStr.split(":");
    onUpdateClockTime(h, m);
  };

  // Chuyển chế độ hẹn giờ (theo phút hoặc theo mốc giờ)
  const onSwitchTimerMode = (mode) => {
    setTimerMode(mode);
    if (mode === "clock") {
      const mins = calculateMinutesFromClockTime(clockHourInput, clockMinInput);
      setTimerMinutes(mins);
    } else {
      const parsed = parseInt(customMinutesInput, 10) || 60;
      setTimerMinutes(parsed);
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
        voiceNoteUri: voiceUri,
        voiceDurationSecs: voiceDuration,
        vehicle: selectedVehicle,
        timerMinutes: isTimerEnabled ? timerMinutes : null,
      });

      const timerMsg = isTimerEnabled
        ? `\n⏰ Đã hẹn giờ: ${timerMinutes} phút. Bạn sẽ nhận được thông báo đẩy trước 30p, 15p và 5p.`
        : "";

      Alert.alert("Thành công", `Đã lưu vị trí đỗ xe thành công!${timerMsg}`, [
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
    return <AppSpinner coversScreen notice="Đang lấy tọa độ GPS chính xác..." />;
  }

  const initialLoc = pinPosition || coords || APP_CONFIG.DEFAULT_CENTER;
  const initialMapRegion = buildMapRegion(
    initialLoc.latitude,
    initialLoc.longitude,
    pinPosition || coords ? 0.005 : 0.05,
  );

  // Tính giờ hết hạn dự kiến theo số phút thực tế
  const expectedExpiryTime = new Date(Date.now() + (timerMinutes || 0) * 60 * 1000);

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
    <SafeAreaView style={styles.safeContainer} edges={["bottom"]}>
      <AppHeader title="Lưu vị trí đỗ xe" onGoBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 54 : 0}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollArea, { paddingBottom: isKeyboardActive ? 140 : 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Card 1: Chọn Phương Tiện (Dropdown Selector) */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <Ionicons name="car-sport" size={15} color={Palette.brand} />
              </View>
              <Text style={styles.sectionTitle}>Phương tiện đang đỗ</Text>
            </View>

            {vehicles.length === 0 ? (
              // Trạng thái người dùng đã xóa hết xe
              <View style={styles.noVehicleBox}>
                <View style={styles.noVehicleTexts}>
                  <Text style={styles.noVehicleTitle}>Chưa đăng ký phương tiện</Text>
                  <Text style={styles.noVehicleSub}>Phiên này sẽ được lưu là: "Phương tiện"</Text>
                </View>
                <Pressable
                  onPress={() => navigation.navigate("VehicleManager")}
                  style={({ pressed }) => [
                    styles.quickAddVehicleBtn,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Ionicons name="add-circle" size={16} color={Palette.brand} />
                  <Text style={styles.quickAddVehicleText}>+ Thêm xe</Text>
                </Pressable>
              </View>
            ) : (
              // Đã có xe đăng ký: hiển thị Dropdown selector
              <Pressable
                onPress={() => setVehicleModalVisible(true)}
                style={({ pressed }) => [
                  styles.vehicleDropdownSelector,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={styles.vehicleSelectedCluster}>
                  <View style={styles.vehicleTypePill}>
                    <Ionicons
                      name={getVehicleIcon(selectedVehicle?.type)}
                      size={18}
                      color={Palette.brand}
                    />
                  </View>
                  <View style={styles.vehicleSelectTexts}>
                    <Text style={styles.vehicleSelectName}>
                      {selectedVehicle?.name || "Chọn phương tiện"}
                    </Text>
                    <Text style={styles.vehicleSelectPlate}>
                      {selectedVehicle?.licensePlate
                        ? `Biển số: ${selectedVehicle.licensePlate}`
                        : "Chưa có biển số"}
                    </Text>
                  </View>
                </View>

                <View style={styles.dropdownChevron}>
                  <Ionicons name="chevron-down" size={18} color={Palette.inkMuted} />
                </View>
              </Pressable>
            )}

            {selectedVehicle && activeSpots.some((s) => s.vehicleId === selectedVehicle?.id) ? (
              <View style={styles.vehicleMultiNoticeBox}>
                <Ionicons name="refresh-circle-outline" size={14} color={Palette.alert} />
                <Text style={styles.vehicleMultiNoticeText}>
                  Xe này đang có 1 điểm đỗ. Lưu mới sẽ cập nhật điểm đỗ mới cho xe này.
                </Text>
              </View>
            ) : selectedVehicle && activeSpots.length > 0 ? (
              <View style={styles.vehicleMultiNoticeBox}>
                <Ionicons name="layers-outline" size={14} color={Palette.brand} />
                <Text style={styles.vehicleMultiNoticeText}>
                  Đang có {activeSpots.length} xe khác đang đỗ. Vị trí xe này sẽ được lưu song song!
                </Text>
              </View>
            ) : null}
          </View>

          {/* Card 2: Bản đồ tương tác */}
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
                  title="Vị trí đỗ xe"
                  description="Kéo ghim hoặc chạm để hiệu chỉnh"
                  draggable
                  onDragEnd={(ev) => syncCoordinates(ev.nativeEvent.coordinate)}
                >
                  <View style={styles.pinBubble}>
                    <Ionicons name={getVehicleIcon(selectedVehicle?.type)} size={16} color="#FFFFFF" />
                  </View>
                </Marker>
              ) : null}
            </MapView>

            <Pressable
              onPress={onUseGpsInstant}
              style={({ pressed }) => [
                styles.mapGpsOverlayBtn,
                pressed && styles.mapGpsOverlayPressed,
              ]}
            >
              <Ionicons name="locate" size={16} color={Palette.brand} />
              <Text style={styles.mapGpsOverlayText}>Vị trí GPS của tôi</Text>
            </Pressable>

            <View style={styles.helperChip} pointerEvents="none">
              <Text style={styles.helperChipLabel}>Chạm hoặc kéo ghim để di chuyển</Text>
            </View>

            {pinPosition ? (
              <View style={styles.mapCoordsBadge}>
                <Text style={styles.mapCoordsText}>
                  {pinPosition.latitude.toFixed(5)}, {pinPosition.longitude.toFixed(5)}
                </Text>
              </View>
            ) : null}
          </View>

          {gpsError ? (
            <View style={styles.alertNotice}>
              <Ionicons name="warning-outline" size={14} color={Palette.danger} />
              <Text style={styles.alertNoticeText}>{gpsError}</Text>
            </View>
          ) : null}

          {/* Card 3: Nhập địa chỉ */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <Ionicons name="location" size={15} color={Palette.brand} />
              </View>
              <Text style={styles.sectionTitle}>Địa chỉ vị trí</Text>
              {resolvingAddress ? (
                <Text style={styles.resolvingText}>(Đang tải...)</Text>
              ) : null}
            </View>

            <TextInput
              style={styles.addressInputField}
              value={addressInput}
              onChangeText={setAddressInput}
              placeholder="Nhập hoặc hiệu chỉnh tên địa điểm/đường phố"
              placeholderTextColor={Palette.inkSubtle}
              multiline
            />
          </View>

          {/* Card Ghi âm chỉ dẫn vị trí (nằm dưới Địa chỉ và trên Chi tiết tầng/ô) */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: "rgba(239, 68, 68, 0.12)" }]}>
                <Ionicons name="mic" size={15} color={Palette.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>Ghi âm giọng nói chỉ dẫn</Text>
                <Text style={styles.sectionSubtitle}>Thu âm ghi nhớ cột mốc, cửa ra vào, hướng đi...</Text>
              </View>
            </View>

            {isRecording ? (
              // Trạng thái đang ghi âm
              <View style={styles.recordingActiveBox}>
                <View style={styles.recordingPulseRow}>
                  <View style={styles.recordingRedDot} />
                  <Text style={styles.recordingActiveLabel}>Đang ghi âm giọng nói...</Text>
                  <Text style={styles.recordingTimerText}>{formatSecs(recordDuration)}</Text>
                </View>

                <View style={styles.recordingActionsRow}>
                  <Pressable
                    onPress={onCancelRecordAudio}
                    style={({ pressed }) => [
                      styles.cancelRecordBtn,
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <Ionicons name="close" size={16} color={Palette.inkMuted} />
                    <Text style={styles.cancelRecordText}>Hủy</Text>
                  </Pressable>

                  <Pressable
                    onPress={onStopRecordAudio}
                    style={({ pressed }) => [
                      styles.stopRecordBtn,
                      pressed && { opacity: 0.9 },
                    ]}
                  >
                    <Ionicons name="stop" size={16} color="#FFFFFF" />
                    <Text style={styles.stopRecordText}>Hoàn tất</Text>
                  </Pressable>
                </View>
              </View>
            ) : voiceUri ? (
              // Trạng thái đã có bản ghi âm
              <View style={styles.voiceRecordedBox}>
                <Pressable
                  onPress={onTogglePlayVoicePreview}
                  style={({ pressed }) => [
                    styles.voicePreviewPlayBtn,
                    isPlayingVoice && styles.voicePreviewPlayBtnActive,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Ionicons
                    name={isPlayingVoice ? "pause" : "play"}
                    size={20}
                    color="#FFFFFF"
                  />
                </Pressable>

                <View style={styles.voicePreviewInfo}>
                  <View style={styles.voiceWaveRow}>
                    <Ionicons
                      name="volume-medium"
                      size={17}
                      color={isPlayingVoice ? Palette.brand : Palette.inkMuted}
                    />
                    <Text style={styles.voiceDurationLabel}>
                      Bản ghi: {formatSecs(voiceDuration || 0)}
                    </Text>
                  </View>
                  <Text style={styles.voicePreviewHint}>
                    {isPlayingVoice ? "Đang phát lại..." : "Chạm nút để nghe lại"}
                  </Text>
                </View>

                <Pressable
                  onPress={onDeleteVoiceNote}
                  style={({ pressed }) => [
                    styles.deleteVoiceBtn,
                    pressed && { opacity: 0.7 },
                  ]}
                  hitSlop={8}
                >
                  <Ionicons name="trash-outline" size={18} color={Palette.danger} />
                </Pressable>
              </View>
            ) : (
              // Trạng thái sẵn sàng ghi âm
              <Pressable
                onPress={onStartRecordAudio}
                style={({ pressed }) => [
                  styles.startRecordPrompt,
                  pressed && styles.startRecordPromptPressed,
                ]}
              >
                <View style={styles.micCircleIcon}>
                  <Ionicons name="mic-outline" size={24} color={Palette.danger} />
                </View>
                <View style={styles.startRecordTexts}>
                  <Text style={styles.startRecordTitle}>Nhấn để bắt đầu thu âm</Text>
                  <Text style={styles.startRecordSub}>
                    Ghi lại giọng nói (vd: "Xe đỗ cạnh thang máy số 3...")
                  </Text>
                </View>
              </Pressable>
            )}
          </View>

          {/* Card 4: Thông tin ô đỗ (Tầng, Khu, Số ô) */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <Ionicons name="layers" size={15} color={Palette.accent} />
              </View>
              <Text style={styles.sectionTitle}>Chi tiết tầng & ô đỗ xe</Text>
            </View>

            <View style={styles.chipRow}>
              <Text style={styles.chipRowLabel}>Tầng:</Text>
              {QUICK_FLOORS.map((f) => (
                <Pressable
                  key={f}
                  onPress={() => setLevelVal(f)}
                  style={[
                    styles.quickChip,
                    levelVal === f && styles.quickChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      levelVal === f && styles.quickChipTextActive,
                    ]}
                  >
                    {f}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.chipRow}>
              <Text style={styles.chipRowLabel}>Khu:</Text>
              {QUICK_SECTORS.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setSectorVal(s)}
                  style={[
                    styles.quickChip,
                    sectorVal === s && styles.quickChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      sectorVal === s && styles.quickChipTextActive,
                    ]}
                  >
                    Khu {s}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.tripletInputRow}>
              <View style={styles.tripletInputCol}>
                <Text style={styles.inputMiniLabel}>TẦNG</Text>
                <TextInput
                  style={styles.tripletField}
                  value={levelVal}
                  onChangeText={setLevelVal}
                  placeholder="Vd: B2"
                  placeholderTextColor={Palette.inkSubtle}
                  maxLength={15}
                  returnKeyType="next"
                  onSubmitEditing={() => sectorInputRef.current?.focus()}
                />
              </View>

              <View style={styles.tripletInputCol}>
                <Text style={styles.inputMiniLabel}>KHU VỰC</Text>
                <TextInput
                  ref={sectorInputRef}
                  style={styles.tripletField}
                  value={sectorVal}
                  onChangeText={setSectorVal}
                  placeholder="Vd: C"
                  placeholderTextColor={Palette.inkSubtle}
                  maxLength={15}
                  returnKeyType="next"
                  onSubmitEditing={() => bayInputRef.current?.focus()}
                />
              </View>

              <View style={[styles.tripletInputCol, styles.tripletInputColAccent]}>
                <Text style={[styles.inputMiniLabel, styles.inputMiniLabelAccent]}>SỐ Ô ĐỖ</Text>
                <TextInput
                  ref={bayInputRef}
                  style={[styles.tripletField, styles.tripletFieldAccent]}
                  value={bayVal}
                  onChangeText={setBayVal}
                  placeholder="Vd: 125"
                  placeholderTextColor={Palette.inkSubtle}
                  maxLength={15}
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>
            </View>
          </View>

          {/* Card 5: Chụp hình ô đỗ */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <Ionicons name="camera" size={15} color={Palette.positive} />
              </View>
              <Text style={styles.sectionTitle}>Hình ảnh nhận diện ô đỗ</Text>
            </View>

            {photoUri ? (
              <View style={styles.photoContainer}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                <View style={styles.photoActionsRow}>
                  <ActionButton
                    label="Chụp lại"
                    icon={<Ionicons name="camera-reverse-outline" size={16} color={Palette.brand} />}
                    onPress={onSnapCamera}
                    kind="bordered"
                    scale="sm"
                    style={styles.photoActionBtn}
                  />
                  <ActionButton
                    label="Xóa ảnh"
                    icon={<Ionicons name="trash-outline" size={16} color="#FFFFFF" />}
                    onPress={() => setPhotoUri(null)}
                    kind="destructive"
                    scale="sm"
                    style={styles.photoActionBtn}
                  />
                </View>
              </View>
            ) : (
              <Pressable
                onPress={onSnapCamera}
                style={({ pressed }) => [
                  styles.cameraPromptCard,
                  pressed && styles.cameraPromptPressed,
                ]}
              >
                <View style={styles.cameraIconCircle}>
                  <Ionicons name="camera" size={26} color={Palette.brand} />
                </View>
                <View style={styles.cameraPromptTexts}>
                  <Text style={styles.cameraPromptTitle}>Chụp ảnh vị trí & cột mốc</Text>
                  <Text style={styles.cameraPromptSub}>
                    Ghi lại hình ảnh số cột hoặc đặc điểm xung quanh ô đỗ
                  </Text>
                </View>
              </Pressable>
            )}
          </View>

          {/* Card 6: HẸN GIỜ ĐỖ XE (Nằm giữa Chụp ảnh và Ghi chú) */}
          <View style={styles.cardSection}>
            <View style={styles.timerHeaderRow}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.sectionIconBadge, { backgroundColor: Palette.alertLight }]}>
                  <Ionicons name="timer" size={15} color={Palette.alert} />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Hẹn giờ giới hạn đỗ xe</Text>
                  <Text style={styles.sectionSubtitle}>Cảnh báo trước 30p, 15p, 5p</Text>
                </View>
              </View>

              <Switch
                value={isTimerEnabled}
                onValueChange={setIsTimerEnabled}
                trackColor={{ false: Palette.outline, true: Palette.brand }}
                thumbColor="#FFFFFF"
              />
            </View>

            {isTimerEnabled ? (
              <View style={styles.timerDetailPanel}>
                {/* Nút Switch chuyển chế độ: 'Theo số phút' HOẶC 'Theo giờ hẹn (vd: 22:00)' */}
                <View style={styles.timerModeToggleContainer}>
                  <Pressable
                    onPress={() => onSwitchTimerMode("duration")}
                    style={[
                      styles.timerModeTab,
                      timerMode === "duration" && styles.timerModeTabActive,
                    ]}
                  >
                    <Ionicons
                      name="hourglass-outline"
                      size={14}
                      color={timerMode === "duration" ? Palette.brand : Palette.inkMuted}
                    />
                    <Text
                      style={[
                        styles.timerModeTabText,
                        timerMode === "duration" && styles.timerModeTabTextActive,
                      ]}
                    >
                      Theo số phút
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => onSwitchTimerMode("clock")}
                    style={[
                      styles.timerModeTab,
                      timerMode === "clock" && styles.timerModeTabActive,
                    ]}
                  >
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={timerMode === "clock" ? Palette.brand : Palette.inkMuted}
                    />
                    <Text
                      style={[
                        styles.timerModeTabText,
                        timerMode === "clock" && styles.timerModeTabTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      Theo giờ hẹn
                    </Text>
                  </Pressable>
                </View>

                {timerMode === "duration" ? (
                  // Chế độ 1: Theo số phút
                  <View style={styles.modeDurationSection}>
                    {/* Các nút chọn mốc giờ nhanh */}
                    <View style={styles.presetChipRow}>
                      {TIMER_PRESETS.map((p) => (
                        <Pressable
                          key={p.mins}
                          onPress={() => onChangePresetMinutes(p.mins)}
                          style={[
                            styles.timerChip,
                            timerMinutes === p.mins && styles.timerChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.timerChipText,
                              timerMinutes === p.mins && styles.timerChipTextActive,
                            ]}
                          >
                            {p.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    {/* Ô tự nhập chính xác số phút */}
                    <View style={styles.customMinutesRow}>
                      <Text style={styles.customMinutesLabel}>Hoặc tự nhập số phút:</Text>
                      <View style={styles.customInputCluster}>
                        <TextInput
                          style={styles.customMinutesInput}
                          keyboardType="numeric"
                          value={customMinutesInput}
                          onChangeText={onChangeCustomMinutes}
                          placeholder="90"
                          placeholderTextColor={Palette.inkSubtle}
                          maxLength={4}
                          returnKeyType="done"
                          onSubmitEditing={() => Keyboard.dismiss()}
                        />
                        <Text style={styles.customUnitText}>phút</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  // Chế độ 2: Theo giờ hẹn cụ thể (vd: 22:00)
                  <View style={styles.modeClockSection}>
                    <View style={styles.clockInputCard}>
                      <Text style={styles.clockInputPrompt}>Nhập giờ kết thúc (24h):</Text>
                      <View style={styles.clockFieldsGroup}>
                        <TextInput
                          style={styles.clockDigitInput}
                          keyboardType="numeric"
                          value={clockHourInput}
                          onChangeText={(text) => onUpdateClockTime(text.replace(/[^0-9]/g, "").slice(0, 2), clockMinInput)}
                          placeholder="22"
                          placeholderTextColor={Palette.inkSubtle}
                          maxLength={2}
                          returnKeyType="next"
                          onSubmitEditing={() => clockMinInputRef.current?.focus()}
                        />
                        <Text style={styles.clockColon}>:</Text>
                        <TextInput
                          ref={clockMinInputRef}
                          style={styles.clockDigitInput}
                          keyboardType="numeric"
                          value={clockMinInput}
                          onChangeText={(text) => onUpdateClockTime(clockHourInput, text.replace(/[^0-9]/g, "").slice(0, 2))}
                          placeholder="00"
                          placeholderTextColor={Palette.inkSubtle}
                          maxLength={2}
                          returnKeyType="done"
                          onSubmitEditing={() => Keyboard.dismiss()}
                        />
                      </View>
                    </View>

                    {/* Các mốc giờ gợi ý nhanh */}
                    <View style={styles.clockPresetRow}>
                      <Text style={styles.clockPresetLabel}>Gợi ý:</Text>
                      {CLOCK_PRESETS.map((cp) => (
                        <Pressable
                          key={cp}
                          onPress={() => onSelectClockPreset(cp)}
                          style={[
                            styles.clockPresetChip,
                            `${clockHourInput.padStart(2, "0")}:${clockMinInput.padStart(2, "0")}` === cp &&
                              styles.clockPresetChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.clockPresetChipText,
                              `${clockHourInput.padStart(2, "0")}:${clockMinInput.padStart(2, "0")}` === cp &&
                                styles.clockPresetChipTextActive,
                            ]}
                          >
                            {cp}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                {/* Banner dự kiến giờ hết hạn chung */}
                <View style={styles.expiryPreviewBanner}>
                  <Ionicons name="alarm-outline" size={16} color={Palette.brandDark} />
                  <Text style={styles.expiryPreviewText}>
                    Dự kiến hết giờ lúc: <Text style={styles.boldTime}>{formatTimeOnly(expectedExpiryTime)}</Text> ({timerMinutes} phút nữa)
                  </Text>
                </View>

                <View style={styles.notificationNoticeBox}>
                  <Ionicons name="notifications-outline" size={13} color={Palette.inkMuted} />
                  <Text style={styles.notificationNoticeText}>
                    Thông báo đẩy sẽ gửi đến máy bạn khi còn 30p, 15p, 5p và khi hết giờ.
                  </Text>
                </View>
              </View>
            ) : null}
          </View>

          {/* Card 7: Ghi chú chi tiết */}
          <View style={styles.cardSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconBadge}>
                <Ionicons name="document-text" size={15} color={Palette.inkHeading} />
              </View>
              <Text style={styles.sectionTitle}>Ghi chú chi tiết</Text>
            </View>

            <View style={styles.tagChipsWrap}>
              {QUICK_NOTES.map((qn) => (
                <Pressable
                  key={qn}
                  onPress={() => onAppendQuickNote(qn)}
                  style={({ pressed }) => [
                    styles.tagChip,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.tagChipText}>+ {qn}</Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              style={styles.memoInputField}
              value={memoVal}
              onChangeText={setMemoVal}
              placeholder="Ghi chú thêm: đối diện cửa thang máy số 2, cạnh trụ điện..."
              placeholderTextColor={Palette.inkSubtle}
              multiline
              maxLength={200}
            />
            <Text style={styles.charCountBadge}>{memoVal.length}/200</Text>
          </View>
        </ScrollView>

        {/* Nút lưu vị trí cố định ở đáy hoặc thanh công cụ khi mở bàn phím */}
        {isKeyboardActive ? (
          <View style={styles.keyboardAccessoryBar}>
            <View style={styles.keyboardAccessoryLeft}>
              <Ionicons name="create-outline" size={15} color={Palette.brand} />
              <Text style={styles.keyboardAccessoryHint}>Đang nhập thông tin ô đỗ</Text>
            </View>
            <Pressable
              style={styles.keyboardDoneBtn}
              onPress={() => Keyboard.dismiss()}
              hitSlop={8}
            >
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.keyboardDoneText}>Xong</Text>
            </Pressable>
          </View>
        ) : (
          <View style={[styles.bottomBarFixed, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <ActionButton
              label="XÁC NHẬN LƯU VỊ TRÍ"
              icon={<Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />}
              onPress={onSubmitCheckIn}
              loading={submitting}
              disabled={!pinPosition}
              scale="lg"
              kind="filled"
              style={styles.saveMainBtn}
            />
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Modal Chọn Phương Tiện (Dropdown Sheet) */}
      <Modal
        visible={vehicleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVehicleModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalBackdropDismiss}
            onPress={() => setVehicleModalVisible(false)}
          />
          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn phương tiện đỗ</Text>
              <Pressable onPress={() => setVehicleModalVisible(false)} hitSlop={8}>
                <Ionicons name="close-circle" size={24} color={Palette.inkSubtle} />
              </Pressable>
            </View>

            <ScrollView style={styles.vehicleListScroll}>
              {vehicles.map((v) => {
                const isSelected = selectedVehicle?.id === v.id;
                const isParked = activeSpots.some((s) => s.vehicleId === v.id);
                return (
                  <Pressable
                    key={v.id}
                    onPress={() => {
                      setSelectedVehicle(v);
                      setVehicleModalVisible(false);
                    }}
                    style={[
                      styles.vehicleSelectItem,
                      isSelected && styles.vehicleSelectItemActive,
                    ]}
                  >
                    <View style={styles.itemLeftGroup}>
                      <View
                        style={[
                          styles.itemIconBox,
                          isSelected && styles.itemIconBoxActive,
                        ]}
                      >
                        <Ionicons
                          name={getVehicleIcon(v.type)}
                          size={20}
                          color={isSelected ? Palette.brand : Palette.inkBody}
                        />
                      </View>
                      <View>
                        <View style={styles.nameAndBadgeRow}>
                          <Text style={[styles.itemName, isSelected && styles.itemNameActive]}>
                            {v.name}
                          </Text>
                          {isParked ? (
                            <View style={styles.parkedStatusPill}>
                              <Text style={styles.parkedStatusPillText}>ĐANG ĐỖ</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.itemPlate}>
                          {v.licensePlate ? `Biển: ${v.licensePlate}` : "Không có biển số"}
                        </Text>
                      </View>
                    </View>

                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={22} color={Palette.brand} />
                    ) : (
                      <Ionicons name="ellipse-outline" size={22} color={Palette.outline} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <ActionButton
              label="+ Thêm / Quản lý phương tiện"
              onPress={() => {
                setVehicleModalVisible(false);
                navigation.navigate("VehicleManager");
              }}
              kind="bordered"
              scale="md"
            />
          </View>
        </View>
      </Modal>
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
    padding: 14,
    gap: 12,
    paddingBottom: 110,
  },
  cardSection: {
    backgroundColor: Palette.card,
    borderRadius: Metrics.radiusMd,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.outline,
    gap: 10,
    ...Elevation.flat,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: Palette.cardSubtle,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: Metrics.fontSm + 1,
    fontWeight: "700",
    color: Palette.inkHeading,
  },
  sectionSubtitle: {
    fontSize: 10,
    color: Palette.inkMuted,
  },
  noVehicleBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Palette.cardSubtle,
    borderRadius: Metrics.radiusSm,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.outline,
    gap: 10,
  },
  noVehicleTexts: {
    flex: 1,
    gap: 2,
  },
  noVehicleTitle: {
    fontSize: Metrics.fontSm,
    fontWeight: "700",
    color: Palette.inkHeading,
  },
  noVehicleSub: {
    fontSize: Metrics.fontXs,
    color: Palette.inkMuted,
  },
  quickAddVehicleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Palette.brandLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Metrics.radiusPill,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.2)",
  },
  quickAddVehicleText: {
    fontSize: Metrics.fontXs,
    fontWeight: "700",
    color: Palette.brandDark,
  },
  vehicleDropdownSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Palette.cardSubtle,
    borderRadius: Metrics.radiusSm,
    padding: 10,
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  vehicleSelectedCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  vehicleTypePill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Palette.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleSelectTexts: {
    gap: 2,
  },
  vehicleSelectName: {
    fontSize: Metrics.fontBase,
    fontWeight: "700",
    color: Palette.inkHeading,
  },
  vehicleSelectPlate: {
    fontSize: Metrics.fontXs,
    color: Palette.inkMuted,
    fontWeight: "600",
  },
  dropdownChevron: {
    padding: 4,
  },
  mapFrame: {
    height: 240,
    borderRadius: Metrics.radiusLg,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: Palette.outline,
    ...Elevation.flat,
  },
  mapElement: {
    flex: 1,
  },
  pinBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Palette.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    ...Elevation.raised,
  },
  mapGpsOverlayBtn: {
    position: "absolute",
    bottom: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Metrics.radiusPill,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.9)",
    ...Elevation.raised,
  },
  mapGpsOverlayPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  mapGpsOverlayText: {
    fontSize: Metrics.fontXs,
    fontWeight: "700",
    color: Palette.brandDark,
  },
  helperChip: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Metrics.radiusPill,
  },
  helperChipLabel: {
    color: "#FFFFFF",
    fontSize: Metrics.fontXs,
    fontWeight: "600",
  },
  mapCoordsBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Metrics.radiusSm - 4,
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  mapCoordsText: {
    fontSize: 10,
    fontWeight: "600",
    color: Palette.inkMuted,
  },
  alertNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.dangerLight,
    padding: 10,
    borderRadius: Metrics.radiusSm,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  alertNoticeText: {
    flex: 1,
    color: Palette.danger,
    fontSize: Metrics.fontXs,
    fontWeight: "500",
  },
  resolvingText: {
    fontSize: Metrics.fontXs,
    color: Palette.brand,
    fontStyle: "italic",
  },
  addressInputField: {
    backgroundColor: Palette.cardSubtle,
    borderRadius: Metrics.radiusSm,
    borderWidth: 1,
    borderColor: Palette.outline,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: Metrics.fontBase,
    color: Palette.inkHeading,
    minHeight: 50,
  },
  chipRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  chipRowLabel: {
    fontSize: Metrics.fontXs,
    fontWeight: "700",
    color: Palette.inkMuted,
    minWidth: 38,
  },
  quickChip: {
    backgroundColor: Palette.cardSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Metrics.radiusPill,
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  quickChipActive: {
    backgroundColor: Palette.brandLight,
    borderColor: Palette.brand,
  },
  quickChipText: {
    fontSize: Metrics.fontXs,
    fontWeight: "700",
    color: Palette.inkBody,
  },
  quickChipTextActive: {
    color: Palette.brandDark,
  },
  tripletInputRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  tripletInputCol: {
    flex: 1,
    gap: 4,
  },
  tripletInputColAccent: {
    flex: 1.2,
  },
  inputMiniLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: Palette.inkMuted,
    letterSpacing: 0.5,
  },
  inputMiniLabelAccent: {
    color: Palette.brandDark,
  },
  tripletField: {
    backgroundColor: Palette.cardSubtle,
    borderRadius: Metrics.radiusSm,
    borderWidth: 1,
    borderColor: Palette.outline,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: Metrics.fontBase,
    fontWeight: "700",
    color: Palette.inkHeading,
    textAlign: "center",
    minHeight: 46,
  },
  tripletFieldAccent: {
    backgroundColor: Palette.brandLight,
    borderColor: "rgba(37, 99, 235, 0.3)",
    color: Palette.brandDark,
  },
  cameraPromptCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.cardSubtle,
    borderRadius: Metrics.radiusMd,
    padding: 14,
    borderWidth: 1.5,
    borderColor: "rgba(37, 99, 235, 0.25)",
    borderStyle: "dashed",
    gap: 12,
  },
  cameraPromptPressed: {
    opacity: 0.8,
  },
  cameraIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraPromptTexts: {
    flex: 1,
    gap: 2,
  },
  cameraPromptTitle: {
    fontSize: Metrics.fontBase,
    fontWeight: "700",
    color: Palette.inkHeading,
  },
  cameraPromptSub: {
    fontSize: Metrics.fontXs,
    color: Palette.inkMuted,
  },
  photoContainer: {
    gap: 8,
  },
  photoPreview: {
    width: "100%",
    height: 200,
    borderRadius: Metrics.radiusSm,
    backgroundColor: Palette.outline,
  },
  photoActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  photoActionBtn: {
    flex: 1,
  },
  timerHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timerDetailPanel: {
    gap: 12,
    paddingTop: 4,
  },
  timerModeToggleContainer: {
    flexDirection: "row",
    backgroundColor: Palette.cardSubtle,
    borderRadius: Metrics.radiusPill,
    padding: 3,
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  timerModeTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: Metrics.radiusPill,
    gap: 6,
  },
  timerModeTabActive: {
    backgroundColor: Palette.card,
    ...Elevation.flat,
  },
  timerModeTabText: {
    fontSize: Metrics.fontXs,
    fontWeight: "600",
    color: Palette.inkMuted,
  },
  timerModeTabTextActive: {
    color: Palette.brand,
    fontWeight: "800",
  },
  modeDurationSection: {
    gap: 10,
  },
  presetChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  timerChip: {
    backgroundColor: Palette.cardSubtle,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Metrics.radiusPill,
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  timerChipActive: {
    backgroundColor: Palette.brandLight,
    borderColor: Palette.brand,
  },
  timerChipText: {
    fontSize: Metrics.fontXs,
    fontWeight: "600",
    color: Palette.inkBody,
  },
  timerChipTextActive: {
    color: Palette.brandDark,
    fontWeight: "800",
  },
  customMinutesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Palette.cardSubtle,
    borderRadius: Metrics.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  customMinutesLabel: {
    fontSize: Metrics.fontSm,
    fontWeight: "600",
    color: Palette.inkHeading,
  },
  customInputCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  customMinutesInput: {
    backgroundColor: Palette.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Palette.outline,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: Metrics.fontBase,
    fontWeight: "800",
    color: Palette.brand,
    textAlign: "center",
    minWidth: 54,
  },
  customUnitText: {
    fontSize: Metrics.fontSm,
    fontWeight: "600",
    color: Palette.inkMuted,
  },
  modeClockSection: {
    gap: 10,
  },
  clockInputCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Palette.cardSubtle,
    borderRadius: Metrics.radiusSm,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  clockInputPrompt: {
    fontSize: Metrics.fontSm,
    fontWeight: "600",
    color: Palette.inkHeading,
  },
  clockFieldsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  clockDigitInput: {
    backgroundColor: Palette.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Palette.outline,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: Metrics.fontLg,
    fontWeight: "900",
    color: Palette.brand,
    textAlign: "center",
    minWidth: 44,
  },
  clockColon: {
    fontSize: Metrics.fontLg,
    fontWeight: "900",
    color: Palette.inkHeading,
  },
  clockPresetRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  clockPresetLabel: {
    fontSize: Metrics.fontXs,
    fontWeight: "700",
    color: Palette.inkMuted,
  },
  clockPresetChip: {
    backgroundColor: Palette.cardSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Metrics.radiusPill,
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  clockPresetChipActive: {
    backgroundColor: Palette.brandLight,
    borderColor: Palette.brand,
  },
  clockPresetChipText: {
    fontSize: Metrics.fontXs,
    fontWeight: "600",
    color: Palette.inkBody,
  },
  clockPresetChipTextActive: {
    color: Palette.brandDark,
    fontWeight: "800",
  },
  expiryPreviewBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.brandLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Metrics.radiusSm,
    gap: 8,
  },
  expiryPreviewText: {
    fontSize: Metrics.fontXs,
    color: Palette.brandDark,
    fontWeight: "600",
  },
  boldTime: {
    fontWeight: "900",
    color: Palette.brand,
  },
  notificationNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  notificationNoticeText: {
    flex: 1,
    fontSize: 10,
    color: Palette.inkMuted,
    lineHeight: 14,
  },
  tagChipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagChip: {
    backgroundColor: Palette.cardSubtle,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Metrics.radiusPill,
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  tagChipText: {
    fontSize: Metrics.fontXs,
    fontWeight: "600",
    color: Palette.inkMuted,
  },
  memoInputField: {
    backgroundColor: Palette.cardSubtle,
    borderRadius: Metrics.radiusSm,
    borderWidth: 1,
    borderColor: Palette.outline,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: Metrics.fontBase,
    color: Palette.inkHeading,
    minHeight: 80,
    textAlignVertical: "top",
  },
  charCountBadge: {
    fontSize: 10,
    color: Palette.inkSubtle,
    alignSelf: "flex-end",
    fontWeight: "600",
  },
  bottomBarFixed: {
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
  keyboardAccessoryBar: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.outline,
    ...Elevation.raised,
  },
  keyboardAccessoryLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  keyboardAccessoryHint: {
    fontSize: Metrics.fontXs,
    fontWeight: "600",
    color: Palette.inkMuted,
  },
  keyboardDoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.brand,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Metrics.radiusSm,
    gap: 4,
  },
  keyboardDoneText: {
    fontSize: Metrics.fontXs,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  saveMainBtn: {
    width: "100%",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "flex-end",
  },
  modalBackdropDismiss: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: Palette.card,
    borderTopLeftRadius: Metrics.radiusXl,
    borderTopRightRadius: Metrics.radiusXl,
    padding: 20,
    gap: 16,
    maxHeight: "75%",
    ...Elevation.floating,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: {
    fontSize: Metrics.fontLg,
    fontWeight: "800",
    color: Palette.inkHeading,
  },
  vehicleListScroll: {
    maxHeight: 280,
  },
  vehicleSelectItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Palette.cardSubtle,
    padding: 12,
    borderRadius: Metrics.radiusSm,
    borderWidth: 1,
    borderColor: Palette.outline,
    marginBottom: 8,
  },
  vehicleSelectItemActive: {
    backgroundColor: Palette.brandLight,
    borderColor: Palette.brand,
  },
  itemLeftGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  itemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Palette.card,
    alignItems: "center",
    justifyContent: "center",
  },
  itemIconBoxActive: {
    backgroundColor: "rgba(37, 99, 235, 0.15)",
  },
  itemName: {
    fontSize: Metrics.fontBase,
    fontWeight: "700",
    color: Palette.inkHeading,
  },
  itemNameActive: {
    color: Palette.brandDark,
  },
  itemPlate: {
    fontSize: Metrics.fontXs,
    color: Palette.inkMuted,
  },
  nameAndBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  parkedStatusPill: {
    backgroundColor: "rgba(37, 99, 235, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: Metrics.radiusPill,
    borderWidth: 1,
    borderColor: Palette.brand,
  },
  parkedStatusPillText: {
    fontSize: 9,
    fontWeight: "800",
    color: Palette.brandDark,
  },
  vehicleMultiNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.cardSubtle,
    borderRadius: Metrics.radiusSm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 8,
    gap: 6,
  },
  vehicleMultiNoticeText: {
    fontSize: Metrics.fontXs,
    color: Palette.inkMuted,
    flex: 1,
  },
  // Ghi âm styles
  startRecordPrompt: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.cardSubtle,
    padding: 14,
    borderRadius: Metrics.radiusMd,
    borderWidth: 1.5,
    borderColor: "rgba(239, 68, 68, 0.3)",
    borderStyle: "dashed",
    gap: 12,
  },
  startRecordPromptPressed: {
    backgroundColor: "rgba(239, 68, 68, 0.06)",
  },
  micCircleIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  startRecordTexts: {
    flex: 1,
    gap: 3,
  },
  startRecordTitle: {
    fontSize: Metrics.fontSm,
    fontWeight: "700",
    color: Palette.inkHeading,
  },
  startRecordSub: {
    fontSize: Metrics.fontXs,
    color: Palette.inkMuted,
  },
  recordingActiveBox: {
    backgroundColor: "rgba(239, 68, 68, 0.06)",
    borderRadius: Metrics.radiusMd,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    gap: 12,
  },
  recordingPulseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordingRedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Palette.danger,
  },
  recordingActiveLabel: {
    flex: 1,
    fontSize: Metrics.fontSm,
    fontWeight: "700",
    color: Palette.danger,
  },
  recordingTimerText: {
    fontSize: Metrics.fontBase,
    fontWeight: "800",
    color: Palette.inkHeading,
  },
  recordingActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  cancelRecordBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Palette.card,
    paddingVertical: 9,
    borderRadius: Metrics.radiusSm,
    borderWidth: 1,
    borderColor: Palette.outline,
    gap: 4,
  },
  cancelRecordText: {
    fontSize: Metrics.fontXs,
    fontWeight: "600",
    color: Palette.inkMuted,
  },
  stopRecordBtn: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Palette.danger,
    paddingVertical: 9,
    borderRadius: Metrics.radiusSm,
    gap: 6,
    ...Elevation.flat,
  },
  stopRecordText: {
    fontSize: Metrics.fontXs,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  voiceRecordedBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.cardSubtle,
    borderRadius: Metrics.radiusMd,
    padding: 12,
    borderWidth: 1,
    borderColor: Palette.outline,
    gap: 12,
  },
  voicePreviewPlayBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Palette.brand,
    alignItems: "center",
    justifyContent: "center",
    ...Elevation.flat,
  },
  voicePreviewPlayBtnActive: {
    backgroundColor: Palette.danger,
  },
  voicePreviewInfo: {
    flex: 1,
    gap: 3,
  },
  voiceWaveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  voiceDurationLabel: {
    fontSize: Metrics.fontSm,
    fontWeight: "700",
    color: Palette.inkHeading,
  },
  voicePreviewHint: {
    fontSize: Metrics.fontXs,
    color: Palette.inkMuted,
  },
  deleteVoiceBtn: {
    padding: 8,
    borderRadius: Metrics.radiusSm,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
  },
});
