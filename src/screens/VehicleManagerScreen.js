import React, { useRef, useState } from "react";
import {
  Alert,
  FlatList,
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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import ActionButton from "~/components/ActionButton";
import AppHeader from "~/components/AppHeader";
import { Elevation, Metrics, Palette } from "~/core/theme";
import { useParkingStore } from "~/state/ParkingStore";

const VEHICLE_TYPES = [
  { type: "car", label: "Ô tô", icon: "car-outline" },
  { type: "bike", label: "Xe máy", icon: "bicycle-outline" },
  { type: "bicycle", label: "Xe đạp / Điện", icon: "flash-outline" },
  { type: "other", label: "Khác", icon: "cube-outline" },
];

export default function VehicleManagerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { vehicles, addVehicle, removeVehicle, setVehicleAsDefault } = useParkingStore();

  const [modalVisible, setModalVisible] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [typeVal, setTypeVal] = useState("car");
  const [plateVal, setPlateVal] = useState("");
  const [isDefaultVal, setIsDefaultVal] = useState(false);
  const [saving, setSaving] = useState(false);
  const plateInputRef = useRef(null);

  const onOpenAddModal = () => {
    setNameVal("");
    setTypeVal("car");
    setPlateVal("");
    setIsDefaultVal(vehicles.length === 0);
    setModalVisible(true);
  };

  const onSaveVehicle = async () => {
    if (!nameVal.trim()) {
      Alert.alert("Thiếu tên xe", "Vui lòng nhập tên phương tiện (ví dụ: Honda SH, Mazda CX-5...)");
      return;
    }

    setSaving(true);
    try {
      await addVehicle({
        name: nameVal,
        type: typeVal,
        licensePlate: plateVal,
        isDefault: isDefaultVal,
      });
      setModalVisible(false);
    } catch (e) {
      Alert.alert("Lỗi", "Không thể thêm phương tiện.");
    } finally {
      setSaving(false);
    }
  };

  const onConfirmDelete = (vehicle) => {
    Alert.alert(
      "Xác nhận xóa xe",
      `Bạn có chắc chắn muốn xóa "${vehicle.name}" (${vehicle.licensePlate || "không biển số"}) khỏi danh sách phương tiện?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              await removeVehicle(vehicle.id);
            } catch (err) {
              Alert.alert("Lỗi", err.message || "Không xóa được phương tiện.");
            }
          },
        },
      ],
    );
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

  return (
    <SafeAreaView style={styles.safeContainer} edges={["bottom"]}>
      <AppHeader
        title="Quản lý phương tiện"
        subtitle={
          vehicles.length > 0
            ? `${vehicles.length} xe đã đăng ký`
            : "Chưa có xe đăng ký"
        }
        onGoBack={() => navigation.goBack()}
        actionSlot={
          <Pressable
            onPress={onOpenAddModal}
            style={({ pressed }) => [styles.addHeaderBtn, pressed && { opacity: 0.7 }]}
            hitSlop={8}
          >
            <Ionicons name="add" size={24} color={Palette.brand} />
          </Pressable>
        }
      />

      {vehicles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="car-sport-outline" size={48} color={Palette.brand} />
          </View>
          <Text style={styles.emptyHeading}>Không có phương tiện nào</Text>
          <Text style={styles.emptyAdvice}>
            Bạn đã xóa hết phương tiện khỏi ứng dụng. Bạn nên thêm phương tiện (Ô tô, Xe máy, Xe điện...) để hệ thống tự động gán xe khi đỗ và quản lý lịch sử theo từng xe dễ dàng hơn.
          </Text>
          <ActionButton
            label="+ Thêm phương tiện mới"
            icon={<Ionicons name="add-circle" size={18} color="#FFFFFF" />}
            onPress={onOpenAddModal}
            kind="filled"
            scale="md"
            style={styles.emptyAddBtn}
          />
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listPadding,
            { paddingBottom: insets.bottom + 90 },
          ]}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const iconName = getVehicleIcon(item.type);

            return (
              <View style={[styles.vehicleCard, item.isDefault && styles.vehicleCardDefault]}>
                <View style={styles.cardMainRow}>
                  <View
                    style={[
                      styles.vehicleIconCircle,
                      item.isDefault ? styles.iconCircleDefault : styles.iconCircleNormal,
                    ]}
                  >
                    <Ionicons
                      name={iconName}
                      size={22}
                      color={item.isDefault ? Palette.brand : Palette.inkBody}
                    />
                  </View>

                  <View style={styles.cardDetails}>
                    <View style={styles.nameAndDefaultRow}>
                      <Text style={styles.vehicleName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.isDefault ? (
                        <View style={styles.defaultPill}>
                          <Text style={styles.defaultPillText}>MẶC ĐỊNH</Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.plateText}>
                      {item.licensePlate ? `Biển số: ${item.licensePlate}` : "Chưa nhập biển số"}
                    </Text>
                  </View>
                </View>

                {/* Hàng nút tác vụ */}
                <View style={styles.cardActionRow}>
                  {!item.isDefault ? (
                    <Pressable
                      onPress={() => setVehicleAsDefault(item.id)}
                      style={({ pressed }) => [
                        styles.actionTagBtn,
                        pressed && { opacity: 0.7 },
                      ]}
                    >
                      <Ionicons name="checkmark-circle-outline" size={15} color={Palette.brand} />
                      <Text style={styles.actionTagLabel}>Đặt làm mặc định</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.activeCheckLabelWrap}>
                      <Ionicons name="checkmark-circle" size={15} color={Palette.positive} />
                      <Text style={styles.activeCheckLabel}>Xe mặc định khi lưu vị trí</Text>
                    </View>
                  )}

                  <Pressable
                    onPress={() => onConfirmDelete(item)}
                    style={({ pressed }) => [
                      styles.deleteIconBtn,
                      pressed && { opacity: 0.7 },
                    ]}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={17} color={Palette.danger} />
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Nút thêm xe cố định ở đáy (khi có xe trong danh sách) */}
      {vehicles.length > 0 ? (
        <View style={[styles.bottomBarFixed, { paddingBottom: Math.max(insets.bottom, 14) }]}>
          <ActionButton
            label="+ Thêm phương tiện mới"
            icon={<Ionicons name="add-circle" size={20} color="#FFFFFF" />}
            onPress={onOpenAddModal}
            kind="filled"
            scale="lg"
          />
        </View>
      ) : null}

      {/* Modal Thêm Phương Tiện Mới */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable
            style={styles.modalBackdropDismiss}
            onPress={() => {
              Keyboard.dismiss();
              setModalVisible(false);
            }}
          />

          <View style={[styles.modalCard, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm phương tiện mới</Text>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setModalVisible(false);
                }}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={24} color={Palette.inkSubtle} />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              bounces={false}
              contentContainerStyle={styles.modalScrollBody}
            >
              {/* Chọn loại xe */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Loại phương tiện</Text>
                <View style={styles.typeSelectorRow}>
                  {VEHICLE_TYPES.map((vt) => (
                    <Pressable
                      key={vt.type}
                      onPress={() => setTypeVal(vt.type)}
                      style={[
                        styles.typeOption,
                        typeVal === vt.type && styles.typeOptionSelected,
                      ]}
                    >
                      <Ionicons
                        name={vt.icon}
                        size={18}
                        color={typeVal === vt.type ? Palette.brand : Palette.inkMuted}
                      />
                      <Text
                        style={[
                          styles.typeLabel,
                          typeVal === vt.type && styles.typeLabelSelected,
                        ]}
                      >
                        {vt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Tên xe */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Tên phương tiện (*)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Vd: Honda SH 150i, Mazda CX-5..."
                  placeholderTextColor={Palette.inkSubtle}
                  value={nameVal}
                  onChangeText={setNameVal}
                  returnKeyType="next"
                  onSubmitEditing={() => plateInputRef.current?.focus()}
                />
              </View>

              {/* Biển số xe */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Biển số xe (tùy chọn)</Text>
                <TextInput
                  ref={plateInputRef}
                  style={[styles.modalInput, styles.plateInput]}
                  placeholder="Vd: 29A-123.45"
                  placeholderTextColor={Palette.inkSubtle}
                  value={plateVal}
                  onChangeText={setPlateVal}
                  autoCapitalize="characters"
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />
              </View>

              {/* Switch đặt làm mặc định */}
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchTitle}>Đặt làm xe mặc định</Text>
                  <Text style={styles.switchSub}>Tự động chọn xe này khi lưu vị trí</Text>
                </View>
                <Switch
                  value={isDefaultVal}
                  onValueChange={setIsDefaultVal}
                  trackColor={{ false: Palette.outline, true: Palette.brand }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Nút lưu */}
              <View style={styles.modalActions}>
                <ActionButton
                  label="Hủy bỏ"
                  onPress={() => {
                    Keyboard.dismiss();
                    setModalVisible(false);
                  }}
                  kind="bordered"
                  scale="md"
                  style={styles.modalCancelBtn}
                />
                <ActionButton
                  label="Lưu phương tiện"
                  onPress={onSaveVehicle}
                  loading={saving}
                  kind="filled"
                  scale="md"
                  style={styles.modalSaveBtn}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  addHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: Metrics.radiusSm,
    backgroundColor: Palette.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  listPadding: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 28,
    gap: 12,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Palette.brandLight,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.2)",
    marginBottom: 4,
  },
  emptyHeading: {
    fontSize: Metrics.fontLg + 1,
    fontWeight: "800",
    color: Palette.inkHeading,
    textAlign: "center",
  },
  emptyAdvice: {
    fontSize: Metrics.fontSm,
    color: Palette.inkMuted,
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 8,
  },
  emptyAddBtn: {
    marginTop: 8,
    minWidth: 220,
  },
  vehicleCard: {
    backgroundColor: Palette.card,
    borderRadius: Metrics.radiusMd,
    padding: 14,
    borderWidth: 1,
    borderColor: Palette.outline,
    gap: 12,
    ...Elevation.flat,
  },
  vehicleCardDefault: {
    borderColor: Palette.brand,
    backgroundColor: "#FDFEFF",
  },
  cardMainRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  vehicleIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  iconCircleNormal: {
    backgroundColor: Palette.cardSubtle,
    borderColor: Palette.outline,
  },
  iconCircleDefault: {
    backgroundColor: Palette.brandLight,
    borderColor: "rgba(37, 99, 235, 0.25)",
  },
  cardDetails: {
    flex: 1,
    gap: 3,
  },
  nameAndDefaultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  vehicleName: {
    fontSize: Metrics.fontBase,
    fontWeight: "700",
    color: Palette.inkHeading,
  },
  defaultPill: {
    backgroundColor: Palette.brandLight,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Metrics.radiusPill,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.2)",
  },
  defaultPillText: {
    fontSize: 9,
    fontWeight: "800",
    color: Palette.brandDark,
    letterSpacing: 0.5,
  },
  plateText: {
    fontSize: Metrics.fontXs,
    color: Palette.inkMuted,
    fontWeight: "500",
  },
  cardActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.separator,
  },
  actionTagBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Metrics.radiusSm,
    backgroundColor: Palette.cardSubtle,
  },
  actionTagLabel: {
    fontSize: Metrics.fontXs,
    color: Palette.brand,
    fontWeight: "700",
  },
  activeCheckLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  activeCheckLabel: {
    fontSize: Metrics.fontXs,
    color: Palette.positive,
    fontWeight: "600",
  },
  deleteIconBtn: {
    padding: 6,
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
    paddingTop: 18,
    paddingHorizontal: 20,
    maxHeight: "85%",
    ...Elevation.floating,
  },
  modalScrollBody: {
    paddingTop: 10,
    paddingBottom: 16,
    gap: 14,
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
  formGroup: {
    gap: 6,
  },
  formLabel: {
    fontSize: Metrics.fontSm,
    fontWeight: "700",
    color: Palette.inkHeading,
  },
  typeSelectorRow: {
    flexDirection: "row",
    gap: 6,
  },
  typeOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Palette.cardSubtle,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: Metrics.radiusSm,
    gap: 4,
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  typeOptionSelected: {
    backgroundColor: Palette.brandLight,
    borderColor: Palette.brand,
  },
  typeLabel: {
    fontSize: Metrics.fontXs,
    fontWeight: "600",
    color: Palette.inkMuted,
  },
  typeLabelSelected: {
    color: Palette.brandDark,
    fontWeight: "700",
  },
  modalInput: {
    backgroundColor: Palette.cardSubtle,
    borderRadius: Metrics.radiusSm,
    borderWidth: 1,
    borderColor: Palette.outline,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: Metrics.fontBase,
    color: Palette.inkHeading,
  },
  plateInput: {
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  switchTitle: {
    fontSize: Metrics.fontSm,
    fontWeight: "700",
    color: Palette.inkHeading,
  },
  switchSub: {
    fontSize: Metrics.fontXs,
    color: Palette.inkMuted,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  modalCancelBtn: {
    flex: 1,
  },
  modalSaveBtn: {
    flex: 1.5,
  },
});
