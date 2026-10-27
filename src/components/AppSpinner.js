import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Metrics, Palette } from "~/core/theme";

export default function AppSpinner({ notice = "Đang tải dữ liệu...", coversScreen = false }) {
  return (
    <View style={[styles.wrapper, coversScreen && styles.fullscreen]}>
      <ActivityIndicator size="large" color={Palette.brand} />
      {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    padding: Metrics.gapXl,
    gap: Metrics.gapSm,
  },
  fullscreen: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  noticeText: {
    color: Palette.inkMuted,
    fontSize: Metrics.fontSm,
    fontWeight: "500",
  },
});
