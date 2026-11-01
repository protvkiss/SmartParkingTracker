import React from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import ActionButton from "~/components/ActionButton";
import AppHeader from "~/components/AppHeader";
import { APP_CONFIG } from "~/core/config";
import { Elevation, Metrics, Palette } from "~/core/theme";
import { useParkingStore } from "~/state/ParkingStore";

export default function PreferencesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { sessionLogs, activeSpot, clearAllSessions, vehicles, defaultVehicle } = useParkingStore();

  const completedTotal = sessionLogs.filter((r) => r.state === "VACATED").length;
  const isCurrentlyParked = !!activeSpot;

  const onPromptWipeHistory = () => {
    Alert.alert(
      "Xác nhận xóa sạch dữ liệu",
      "Toàn bộ lịch sử các phiên đỗ xe và hình ảnh lưu trữ nội bộ sẽ bị xóa vĩnh viễn. Bạn có chắc chắn muốn xóa?",
      [
        { text: "Hủy bỏ", style: "cancel" },
        {
          text: "Xóa tất cả",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllSessions();
            } catch (e) {
              Alert.alert("Lỗi", "Không thể xóa lịch sử dữ liệu.");
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={["bottom"]}>
      <AppHeader title="Cài đặt hệ thống" />

      <ScrollView
        contentContainerStyle={[styles.scrollArea, { paddingBottom: insets.bottom + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero App Badge Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroLogoCircle}>
            <Ionicons name="navigate" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.heroTexts}>
            <Text style={styles.heroTitle}>SmartParking Tracker</Text>
            <Text style={styles.heroSubtitle}>Hệ thống định vị & ghi nhớ vị trí đỗ xe thông minh</Text>
          </View>
        </View>

        {/* 3-card Metrics Grid */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <Text style={styles.metricNum}>{sessionLogs.length}</Text>
            <Text style={styles.metricLabel}>TỔNG SỐ LƯỢT</Text>
          </View>
          <View style={[styles.metricCard, isCurrentlyParked && styles.metricCardActive]}>
            <Text style={[styles.metricNum, isCurrentlyParked && styles.metricNumActive]}>
              {isCurrentlyParked ? "1" : "0"}
            </Text>
            <Text style={[styles.metricLabel, isCurrentlyParked && styles.metricLabelActive]}>
              ĐANG ĐỖ
            </Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricNum}>{completedTotal}</Text>
            <Text style={styles.metricLabel}>HOÀN TẤT</Text>
          </View>
        </View>

        {/* Nhóm Quản lý Phương tiện */}
        <View style={styles.settingsGroup}>
          <Text style={styles.groupHeader}>PHƯƠNG TIỆN CỦA TÔI</Text>
          <View style={styles.groupCard}>
            <SettingRow
              icon="car-sport-outline"
              iconBg="#EFF6FF"
              iconColor={Palette.brand}
              label="Quản lý phương tiện"
              val={`${vehicles.length} xe • Mặc định: ${defaultVehicle?.name || "Chưa có"}`}
              hasArrow
              onPress={() => navigation.navigate("VehicleManager")}
              noBorder
            />
          </View>
        </View>

        {/* Nhóm Thiết lập Dữ liệu */}
        <View style={styles.settingsGroup}>
          <Text style={styles.groupHeader}>DỮ LIỆU & BỘ NHỚ</Text>
          <View style={styles.groupCard}>
            <SettingRow
              icon="timer-outline"
              iconBg="#FFFBEB"
              iconColor={Palette.alert}
              label="Hẹn giờ & Cảnh báo"
              val="30p, 15p, 5p trước hết giờ"
            />
            <SettingRow
              icon="images-outline"
              iconBg="#EFF6FF"
              iconColor={Palette.brand}
              label="Ảnh chụp đính kèm"
              val="Lưu cục bộ thiết bị"
            />
            <SettingRow
              icon="locate-outline"
              iconBg="#ECFDF5"
              iconColor={Palette.positive}
              label="Dịch vụ định vị GPS"
              val="Độ chính xác cao"
              noBorder
            />
          </View>

          <ActionButton
            label="Xóa sạch toàn bộ lịch sử đỗ xe"
            icon={<Ionicons name="trash-outline" size={18} color="#FFFFFF" />}
            onPress={onPromptWipeHistory}
            kind="destructive"
            scale="md"
            disabled={sessionLogs.length === 0}
            style={styles.wipeBtn}
          />
        </View>

        {/* Nhóm Thông tin kỹ thuật */}
        <View style={styles.settingsGroup}>
          <Text style={styles.groupHeader}>THÔNG TIN HỆ THỐNG</Text>
          <View style={styles.groupCard}>
            <SettingRow
              icon="pricetag-outline"
              iconBg="#EEF2FF"
              iconColor={Palette.accent}
              label="Phiên bản phát hành"
              val={APP_CONFIG.VERSION_TAG}
            />
            <SettingRow
              icon="hardware-chip-outline"
              iconBg="#FEF3C7"
              iconColor={Palette.alert}
              label="Nền tảng công nghệ"
              val="Expo SDK 58 / React Native"
            />
            <SettingRow
              icon="compass-outline"
              iconBg="#F1F5F9"
              iconColor={Palette.inkHeading}
              label="Cảm biến la bàn từ trường"
              val="Haversine & Azimuth"
              noBorder
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  icon,
  iconBg = Palette.cardSubtle,
  iconColor = Palette.inkHeading,
  label,
  val,
  hasArrow = false,
  onPress,
  noBorder = false,
}) {
  const content = (
    <View style={[styles.settingRow, !noBorder && styles.settingRowBorder]}>
      <View style={styles.settingLeft}>
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <View style={styles.settingRightCol}>
        <Text style={styles.settingVal} numberOfLines={1}>{val}</Text>
        {hasArrow ? (
          <Ionicons name="chevron-forward" size={16} color={Palette.inkMuted} />
        ) : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.7 }}>
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  scrollArea: {
    padding: 16,
    gap: 18,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.card,
    borderRadius: Metrics.radiusLg,
    padding: 16,
    borderWidth: 1,
    borderColor: Palette.outline,
    gap: 14,
    ...Elevation.flat,
  },
  heroLogoCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Palette.brand,
    alignItems: "center",
    justifyContent: "center",
    ...Elevation.raised,
  },
  heroTexts: {
    flex: 1,
    gap: 3,
  },
  heroTitle: {
    fontSize: Metrics.fontLg,
    fontWeight: "800",
    color: Palette.inkHeading,
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    fontSize: Metrics.fontXs,
    color: Palette.inkMuted,
    lineHeight: 16,
  },
  metricsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: Palette.card,
    borderRadius: Metrics.radiusMd,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Palette.outline,
    gap: 4,
    ...Elevation.flat,
  },
  metricCardActive: {
    backgroundColor: Palette.brandLight,
    borderColor: "rgba(37, 99, 235, 0.3)",
  },
  metricNum: {
    fontSize: Metrics.font2Xl,
    fontWeight: "900",
    color: Palette.inkHeading,
  },
  metricNumActive: {
    color: Palette.brandDark,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: Palette.inkMuted,
    letterSpacing: 0.5,
    textAlign: "center",
  },
  metricLabelActive: {
    color: Palette.brandDark,
  },
  settingsGroup: {
    gap: 8,
  },
  groupHeader: {
    fontSize: Metrics.fontXs,
    fontWeight: "800",
    color: Palette.inkMuted,
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  groupCard: {
    backgroundColor: Palette.card,
    borderRadius: Metrics.radiusMd,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Palette.outline,
    ...Elevation.flat,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Palette.separator,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  settingRightCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "50%",
    justifyContent: "flex-end",
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  settingLabel: {
    fontSize: Metrics.fontSm + 0.5,
    fontWeight: "600",
    color: Palette.inkHeading,
  },
  settingVal: {
    fontSize: Metrics.fontSm,
    color: Palette.inkMuted,
    fontWeight: "500",
  },
  wipeBtn: {
    marginTop: 4,
  },
});
