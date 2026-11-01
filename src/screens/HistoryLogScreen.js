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

  const finishedList = useMemo(() => {
    return sessionLogs.filter((r) => r.state === "VACATED");
  }, [sessionLogs]);

  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return finishedList;
    const q = searchQuery.toLowerCase().trim();
    return finishedList.filter(
      (r) =>
        r.locationName?.toLowerCase().includes(q) ||
        r.level?.toLowerCase().includes(q) ||
        r.sector?.toLowerCase().includes(q) ||
        r.bayNumber?.toLowerCase().includes(q) ||
        r.memo?.toLowerCase().includes(q),
    );
  }, [finishedList, searchQuery]);

  const onOpenDetail = (record) => {
    navigation.navigate("SpotDetail", { recordId: record.id });
  };

  if (isLoading) {
    return <AppSpinner coversScreen notice="Đang tải lịch sử các phiên đỗ..." />;
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={["bottom"]}>
      <AppHeader
        title="Nhật ký đỗ xe"
        subtitle={
          finishedList.length > 0
            ? `${finishedList.length} phiên đã hoàn tất`
            : undefined
        }
      />

      {/* Hero Stats & Search Bar */}
      <View style={styles.topControlFrame}>
        <View style={styles.searchBarBox}>
          <Ionicons name="search-outline" size={18} color={Palette.inkSubtle} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm theo địa điểm, tầng, ô đỗ, ghi chú..."
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
      </View>

      {finishedList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconRing}>
            <Ionicons name="receipt-outline" size={44} color={Palette.brand} />
          </View>
          <Text style={styles.emptyTitle}>Chưa có phiên lưu trữ</Text>
          <Text style={styles.emptyDescription}>
            Khi bạn nhấn "Đã lấy xe", thông tin phiên đỗ kèm ảnh chụp và thời gian sẽ được ghi lại tại đây.
          </Text>
        </View>
      ) : filteredList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={38} color={Palette.inkSubtle} />
          <Text style={styles.emptyTitle}>Không tìm thấy kết quả</Text>
          <Text style={styles.emptyDescription}>
            Không có phiên đỗ xe nào khớp với từ khóa "{searchQuery}".
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listPadding,
            { paddingBottom: insets.bottom + 90 },
          ]}
          renderItem={({ item }) => (
            <SpotRecordCard session={item} onSelect={onOpenDetail} />
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
