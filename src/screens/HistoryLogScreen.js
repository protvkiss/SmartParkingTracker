import React, { useMemo, useState } from "react";
import { FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AppHeader from "~/components/AppHeader";
import AppSpinner from "~/components/AppSpinner";
import SpotRecordCard from "~/components/SpotRecordCard";
import { Elevation, Metrics, Palette } from "~/core/theme";
import { useParkingStore } from "~/state/ParkingStore";

export default function HistoryLogScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { sessionLogs, isLoading } = useParkingStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState("ALL"); // ALL | OCCUPIED | VACATED

  // Sắp xếp: Phiên OCCUPIED (đang đỗ) luôn lên đầu tiên, sau đó đến các phiên VACATED mới nhất
  const sortedSessions = useMemo(() => {
    return [...sessionLogs].sort((a, b) => {
      if (a.state === "OCCUPIED" && b.state !== "OCCUPIED") return -1;
      if (a.state !== "OCCUPIED" && b.state === "OCCUPIED") return 1;
      const timeA = new Date(a.vacatedAt || a.parkedAt || 0).getTime();
      const timeB = new Date(b.vacatedAt || b.parkedAt || 0).getTime();
      return timeB - timeA;
    });
  }, [sessionLogs]);

  const activeCount = useMemo(() => {
    return sessionLogs.filter((r) => r.state === "OCCUPIED").length;
  }, [sessionLogs]);

  const finishedCount = useMemo(() => {
    return sessionLogs.filter((r) => r.state === "VACATED").length;
  }, [sessionLogs]);

  const tabFilteredList = useMemo(() => {
    if (filterMode === "OCCUPIED") {
      return sortedSessions.filter((r) => r.state === "OCCUPIED");
    }
    if (filterMode === "VACATED") {
      return sortedSessions.filter((r) => r.state === "VACATED");
    }
    return sortedSessions;
  }, [sortedSessions, filterMode]);

  const searchFilteredList = useMemo(() => {
    if (!searchQuery.trim()) return tabFilteredList;
    const q = searchQuery.toLowerCase().trim();
    return tabFilteredList.filter(
      (r) =>
        r.locationName?.toLowerCase().includes(q) ||
        r.vehicleName?.toLowerCase().includes(q) ||
        r.vehiclePlate?.toLowerCase().includes(q) ||
        r.level?.toLowerCase().includes(q) ||
        r.sector?.toLowerCase().includes(q) ||
        r.bayNumber?.toLowerCase().includes(q) ||
        r.memo?.toLowerCase().includes(q),
    );
  }, [tabFilteredList, searchQuery]);

  const onOpenDetail = (record) => {
    navigation.navigate("SpotDetail", { recordId: record.id });
  };

  const headerSubtitle = useMemo(() => {
    if (sessionLogs.length === 0) return undefined;
    if (activeCount > 0 && finishedCount > 0) {
      return `${activeCount} xe đang đỗ • ${finishedCount} đã hoàn tất`;
    }
    if (activeCount > 0) {
      return `${activeCount} phương tiện đang đỗ`;
    }
    return `${finishedCount} phiên đã hoàn tất`;
  }, [activeCount, finishedCount, sessionLogs.length]);

  if (isLoading) {
    return <AppSpinner coversScreen notice="Đang tải lịch sử các phiên đỗ..." />;
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={["bottom"]}>
      <AppHeader
        title="Nhật ký đỗ xe"
        subtitle={headerSubtitle}
      />

      {/* Hero Stats & Search Bar */}
      <View style={styles.topControlFrame}>
        <View style={styles.searchBarBox}>
          <Ionicons name="search-outline" size={18} color={Palette.inkSubtle} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo địa điểm, xe, biển số, tầng, ô đỗ..."
            placeholderTextColor={Palette.inkSubtle}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
          />
          {searchQuery ? (
            <Pressable
              onPress={() => {
                setSearchQuery("");
                Keyboard.dismiss();
              }}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={Palette.inkSubtle} />
            </Pressable>
          ) : null}
        </View>

        {/* Tab phân loại: Tất cả / Đang đỗ / Đã hoàn tất */}
        <View style={styles.filterPillsRow}>
          <Pressable
            onPress={() => setFilterMode("ALL")}
            style={[
              styles.filterPill,
              filterMode === "ALL" && styles.filterPillActive,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                filterMode === "ALL" && styles.filterPillTextActive,
              ]}
            >
              Tất cả ({sessionLogs.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilterMode("OCCUPIED")}
            style={[
              styles.filterPill,
              filterMode === "OCCUPIED" && styles.filterPillActive,
            ]}
          >
            {activeCount > 0 ? (
              <View style={styles.activeDotBadge} />
            ) : null}
            <Text
              style={[
                styles.filterPillText,
                filterMode === "OCCUPIED" && styles.filterPillTextActive,
              ]}
            >
              Đang đỗ ({activeCount})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setFilterMode("VACATED")}
            style={[
              styles.filterPill,
              filterMode === "VACATED" && styles.filterPillActive,
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                filterMode === "VACATED" && styles.filterPillTextActive,
              ]}
            >
              Đã hoàn tất ({finishedCount})
            </Text>
          </Pressable>
        </View>
      </View>

      {sessionLogs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconRing}>
            <Ionicons name="receipt-outline" size={44} color={Palette.brand} />
          </View>
          <Text style={styles.emptyTitle}>Chưa có phiên lưu trữ</Text>
          <Text style={styles.emptyDescription}>
            Các phiên đỗ xe của bạn (cả đang đỗ và đã hoàn tất) kèm ảnh chụp, ghi âm và thời gian sẽ được hiển thị tại đây.
          </Text>
        </View>
      ) : searchFilteredList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={38} color={Palette.inkSubtle} />
          <Text style={styles.emptyTitle}>Không tìm thấy kết quả</Text>
          <Text style={styles.emptyDescription}>
            {searchQuery
              ? `Không có phiên đỗ xe nào khớp với từ khóa "${searchQuery}".`
              : filterMode === "OCCUPIED"
                ? "Hiện tại bạn không có phương tiện nào đang đỗ."
                : "Không có phiên đỗ xe nào trong danh mục này."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={searchFilteredList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listPadding,
            { paddingBottom: insets.bottom + 90 },
          ]}
          renderItem={({ item }) => (
            <SpotRecordCard
              session={item}
              onSelect={onOpenDetail}
              isHighlighted={item.state === "OCCUPIED"}
            />
          )}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  topControlFrame: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Palette.card,
    borderBottomWidth: 1,
    borderBottomColor: Palette.outlineLight,
    gap: 10,
  },
  searchBarBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.cardSubtle,
    borderRadius: Metrics.radiusPill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  filterPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Metrics.radiusPill,
    backgroundColor: Palette.cardSubtle,
    borderWidth: 1,
    borderColor: Palette.outline,
    gap: 5,
  },
  filterPillActive: {
    backgroundColor: Palette.brandLight,
    borderColor: Palette.brand,
  },
  filterPillText: {
    fontSize: Metrics.fontXs,
    fontWeight: "600",
    color: Palette.inkMuted,
  },
  filterPillTextActive: {
    color: Palette.brandDark,
    fontWeight: "700",
  },
  activeDotBadge: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Palette.success,
  },
  searchInput: {
    flex: 1,
    fontSize: Metrics.fontSm,
    color: Palette.inkHeading,
    paddingVertical: 0,
  },
  listPadding: {
    padding: 16,
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 32,
  },
  emptyIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Palette.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: Metrics.fontLg,
    fontWeight: "800",
    color: Palette.inkHeading,
  },
  emptyDescription: {
    fontSize: Metrics.fontSm,
    color: Palette.inkMuted,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
});
