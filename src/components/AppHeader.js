import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Metrics, Palette } from "~/core/theme";

export default function AppHeader({ title, subtitle, onGoBack, actionSlot }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.headerBox, { paddingTop: insets.top > 0 ? insets.top + 6 : 14 }]}>
      <View style={styles.topRow}>
        {onGoBack ? (
          <Pressable
            onPress={onGoBack}
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={26} color="#FFFFFF" />
          </Pressable>
        ) : (
          <View style={styles.backBtn} />
        )}

        <View style={styles.titleStack}>
          <Text style={styles.titleText} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitleText} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        {actionSlot ? (
          <View style={styles.backBtn}>{actionSlot}</View>
        ) : (
          <View style={styles.backBtn} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBox: {
    backgroundColor: Palette.brand,
    paddingHorizontal: Metrics.gapMd,
    paddingBottom: Metrics.gapSm + 4,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 44,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnPressed: {
    opacity: 0.7,
  },
  titleStack: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  titleText: {
    color: "#FFFFFF",
    fontSize: Metrics.fontLg,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitleText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: Metrics.fontXs,
    marginTop: 2,
    textAlign: "center",
  },
});
