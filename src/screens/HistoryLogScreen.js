import React from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AppHeader from "~/components/AppHeader";
import AppSpinner from "~/components/AppSpinner";
import SpotRecordCard from "~/components/SpotRecordCard";
import { Metrics, Palette } from "~/core/theme";
import { useParkingStore } from "~/state/ParkingStore";

export default function HistoryLogScreen({ navigation }) {
  const { sessionLogs, isLoading } = useParkingStore();

  const finishedList = sessionLogs.filter((r) => r.state === "VACATED");

  const onOpenDetail = (record) => {
    navigation.navigate("SpotDetail", { recordId: record.id });
  };

  if (isLoading) {
    return <AppSpinner coversScreen notice="Đang tải lịch sử các phiên đỗ..." />;
  }

  return (
    <SafeAreaView style={styles.safeContainer} edges={["bottom"]}>
      <AppHeader
        title="Lịch sử đỗ xe"
        subtitle={
          finishedList.length > 0
            ? `${finishedList.length} phiên đã hoàn tất`
            : undefined
        }
      />

      {finishedList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyCircle}>
            <Ionicons name="folder-open-outline" size={46} color={Palette.inkSubtle} />
          </View>
          <Text style={styles.emptyTitle}>Chưa có lịch sử</Text>
          <Text style={styles.emptyDescription}>
            Các phiên sau khi bạn nhấn “Đã lấy xe” sẽ tự động được lưu trữ tại đây.
          </Text>
        </View>
      ) : (
        <FlatList
          data={finishedList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listPadding}
          renderItem={({ item }) => (
            <SpotRecordCard session={item} onSelect={onOpenDetail} />
          )}
          showsVerticalScrollIndicator={false}
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
  listPadding: {
    padding: Metrics.gapMd,
    paddingBottom: Metrics.gapXl + 20,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Metrics.gapSm,
    padding: Metrics.gapXl,
  },
  emptyCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Palette.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Palette.outline,
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: Metrics.fontLg,
    fontWeight: "700",
    color: Palette.inkHeading,
  },
  emptyDescription: {
    fontSize: Metrics.fontSm,
    color: Palette.inkMuted,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: Metrics.gapMd,
  },
});
