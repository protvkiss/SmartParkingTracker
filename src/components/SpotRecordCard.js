import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Elevation, Metrics, Palette } from "~/core/theme";
import { composeSpotTag, shortenText } from "~/utils/stringFormat";
import { formatMomentRelative } from "~/utils/timeAgo";
import StatusPill from "./StatusPill";

export default function SpotRecordCard({ session, onSelect, isHighlighted = false }) {
  const spotString = composeSpotTag(session);
  const isOccupied = session.state === "OCCUPIED";

  return (
    <Pressable
      onPress={() => onSelect?.(session)}
      style={({ pressed }) => [
        styles.cardContainer,
        isHighlighted && styles.cardHighlighted,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.topMetaRow}>
        <Text style={styles.timestampText}>
          {formatMomentRelative(session.parkedAt)}
        </Text>
        <StatusPill isOccupied={isOccupied} />
      </View>

      <Text style={styles.addressTitle} numberOfLines={2}>
        {shortenText(session.locationName, 75)}
      </Text>

      {spotString ? (
        <View style={styles.tagLine}>
          <Text style={styles.spotHighlight} numberOfLines={1}>
            🅿️ {spotString}
          </Text>
        </View>
      ) : null}

      {session.memo ? (
        <Text style={styles.memoText} numberOfLines={1}>
          📝 {session.memo}
        </Text>
      ) : null}

      <View style={styles.bottomLinkRow}>
        {session.snapshotUri ? (
          <View style={styles.cameraFlag}>
            <Ionicons name="camera-outline" size={14} color={Palette.inkMuted} />
            <Text style={styles.cameraFlagText}>Có hình ảnh</Text>
          </View>
        ) : (
          <View />
        )}

        <View style={styles.detailsAction}>
          <Text style={styles.actionLabel}>Xem chi tiết</Text>
          <Ionicons name="arrow-forward" size={14} color={Palette.brand} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: Palette.card,
    borderRadius: Metrics.radiusMd,
    padding: Metrics.gapMd,
    marginBottom: Metrics.gapSm + 4,
    borderWidth: 1,
    borderColor: Palette.outline,
    gap: Metrics.gapXs + 2,
    ...Elevation.flat,
  },
  cardHighlighted: {
    borderColor: Palette.brand,
    borderLeftWidth: 5,
    borderLeftColor: Palette.brand,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.995 }],
  },
  topMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timestampText: {
    fontSize: Metrics.fontXs,
    color: Palette.inkMuted,
    fontWeight: "500",
  },
  addressTitle: {
    fontSize: Metrics.fontBase,
    fontWeight: "600",
    color: Palette.inkHeading,
    lineHeight: 22,
  },
  tagLine: {
    flexDirection: "row",
    alignItems: "center",
  },
  spotHighlight: {
    fontSize: Metrics.fontSm,
    color: Palette.brandDark,
    fontWeight: "600",
  },
  memoText: {
    fontSize: Metrics.fontSm,
    color: Palette.inkMuted,
    fontStyle: "italic",
  },
  bottomLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Palette.separator,
  },
  cameraFlag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cameraFlagText: {
    fontSize: Metrics.fontXs,
    color: Palette.inkMuted,
  },
  detailsAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  actionLabel: {
    fontSize: Metrics.fontSm,
    color: Palette.brand,
    fontWeight: "600",
  },
});
