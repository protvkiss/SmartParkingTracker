import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Metrics, Palette } from "~/core/theme";

export default function AppSpinner({ notice = "Đang tải dữ liệu...", coversScreen = false }) {
  return (
    <View style={[styles.wrapper, coversScreen && styles.fullscreen]}>
      <View style={styles.spinnerCircle}>
        <ActivityIndicator size="large" color={Palette.brand} />
      </View>
      {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    padding: Metrics.gapXl,
    gap: 12,
  },
  fullscreen: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  spinnerCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Palette.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  noticeText: {
    color: Palette.inkMuted,
    fontSize: Metrics.fontSm,
    fontWeight: "600",
  },
});
