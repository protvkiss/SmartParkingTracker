import React from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import ActionButton from "~/components/ActionButton";
import AppHeader from "~/components/AppHeader";
import { APP_CONFIG } from "~/core/config";
import { Elevation, Metrics, Palette } from "~/core/theme";
import { useParkingStore } from "~/state/ParkingStore";

export default function PreferencesScreen() {
  const { sessionLogs, clearAllSessions } = useParkingStore();

  const completedTotal = sessionLogs.filter((r) => r.state === "VACATED").length;

  const onPromptWipeHistory = () => {
    Alert.alert(
      "Xác nhận xóa sạch lịch sử",
      "Toàn bộ dữ liệu vị trí đã lưu và ảnh chụp đính kèm sẽ bị xóa vĩnh viễn khỏi máy. Bạn có chắc chắn muốn xóa?",
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
        contentContainerStyle={styles.scrollArea}
        showsVerticalScrollIndicator={false}
      >
        {/* Nhóm thống kê */}
        <View style={styles.block}>
          <Text style={styles.blockHeading}>Thống kê hoạt động</Text>
          <View style={styles.panelCard}>
            <SettingItem
              iconName="bar-chart-outline"
              label="Phiên đỗ hoàn thành"
              trailing={<Text style={styles.statPill}>{completedTotal}</Text>}
            />
          </View>
        </View>

        {/* Nhóm dữ liệu */}
        <View style={styles.block}>
          <Text style={styles.blockHeading}>Bộ nhớ & Dữ liệu</Text>
          <View style={styles.panelCard}>
            <ActionButton
              label="Xóa toàn bộ lịch sử đỗ xe"
              icon={<Ionicons name="trash-outline" size={18} color="#FFFFFF" />}
              onPress={onPromptWipeHistory}
              kind="destructive"
              disabled={sessionLogs.length === 0}
            />
          </View>
        </View>

        {/* Nhóm thông tin ứng dụng */}
        <View style={styles.block}>
          <Text style={styles.blockHeading}>Thông tin ứng dụng</Text>
          <View style={styles.panelCard}>
            <SettingItem
              iconName="pricetag-outline"
              label="Phiên bản"
              trailing={<Text style={styles.metaVal}>{APP_CONFIG.VERSION_TAG}</Text>}
            />
            <SettingItem
              iconName="hardware-chip-outline"
              label="Nền tảng công nghệ"
              trailing={<Text style={styles.metaVal}>Expo / React Native</Text>}
              noBorder
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingItem({ iconName, label, trailing, noBorder = false }) {
  return (
    <View style={[styles.itemRow, !noBorder && styles.itemRowBorder]}>
      <View style={styles.leftLabelCol}>
        <Ionicons name={iconName} size={18} color={Palette.inkMuted} />
        <Text style={styles.labelText}>{label}</Text>
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  scrollArea: {
    padding: Metrics.gapMd,
    gap: Metrics.gapMd + 6,
    paddingBottom: Metrics.gapXl + 20,
  },
  block: {
    gap: 6,
  },
  blockHeading: {
    fontSize: Metrics.fontXs,
    fontWeight: "700",
    color: Palette.inkMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    paddingHorizontal: 4,
  },
  panelCard: {
    backgroundColor: Palette.card,
    borderRadius: Metrics.radiusMd,
    padding: Metrics.gapMd,
    gap: Metrics.gapSm,
    borderWidth: 1,
    borderColor: Palette.outline,
    ...Elevation.flat,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  itemRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Palette.separator,
    paddingBottom: 10,
  },
  leftLabelCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: Metrics.gapSm,
  },
  labelText: {
    fontSize: Metrics.fontBase - 1,
    fontWeight: "500",
    color: Palette.inkHeading,
  },
  statPill: {
    fontSize: Metrics.fontBase,
    fontWeight: "700",
    color: Palette.brand,
  },
  metaVal: {
    fontSize: Metrics.fontSm,
    fontWeight: "500",
    color: Palette.inkMuted,
  },
});
