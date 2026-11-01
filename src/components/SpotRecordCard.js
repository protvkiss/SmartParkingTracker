import React from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Elevation, Metrics, Palette } from "~/core/theme";
import { shortenText } from "~/utils/stringFormat";
import { formatMomentRelative, formatTimeRemaining } from "~/utils/timeAgo";
import StatusPill from "./StatusPill";

export default function SpotRecordCard({ session, onSelect, isHighlighted = false }) {
  const isOccupied = session.state === "OCCUPIED";

  const getVehicleIcon = (type) => {
    switch (type) {
      case "bike":
        return "bicycle-outline";
      case "bicycle":
        return "flash-outline";
      case "other":
        return "cube-outline";
      default:
        return "car-outline";
    }
  };

  const timeRemaining = isOccupied && session.expiresAt ? formatTimeRemaining(session.expiresAt) : null;

  return (
    <Pressable
      onPress={() => onSelect?.(session)}
      style={({ pressed }) => [
        styles.cardContainer,
        isHighlighted && styles.cardHighlighted,
        pressed && styles.cardPressed,
      ]}
    >
      {/* Top row: Time & Status */}
      <View style={styles.topMetaRow}>
        <View style={styles.timeCluster}>
          <Ionicons name="time-outline" size={13} color={Palette.inkMuted} />
          <Text style={styles.timestampText}>
            {formatMomentRelative(session.parkedAt)}
          </Text>
        </View>

        <View style={styles.topRightCluster}>
          {session.vehicleName ? (
            <View style={styles.vehicleTagPill}>
              <Ionicons
                name={getVehicleIcon(session.vehicleType)}
                size={12}
                color={Palette.brandDark}
              />
              <Text style={styles.vehicleTagText} numberOfLines={1}>
                {session.vehicleName}
              </Text>
            </View>
          ) : null}
          <StatusPill isOccupied={isOccupied} />
        </View>
      </View>

      {/* Main Address */}
      <View style={styles.addressRow}>
        <View style={styles.locationPinBox}>
          <Ionicons name="location" size={15} color={Palette.brand} />
        </View>
        <Text style={styles.addressTitle} numberOfLines={2}>
          {shortenText(session.locationName, 80)}
        </Text>
      </View>

      {/* Hẹn giờ đỗ nếu còn hạn */}
      {timeRemaining ? (
        <View style={styles.timerPillRow}>
          <Ionicons name="alarm-outline" size={13} color={Palette.brand} />
          <Text style={styles.timerPillText}>Hạn đỗ: {timeRemaining}</Text>
        </View>
      ) : null}

      {/* Slot badges if any of level/sector/bayNumber exist */}
      {(session.level || session.sector || session.bayNumber || session.vehiclePlate) ? (
        <View style={styles.slotPillCluster}>
          {session.vehiclePlate ? (
            <View style={styles.slotTag}>
              <Ionicons name="card-outline" size={10} color={Palette.inkMuted} />
              <Text style={styles.slotTagValue}>{session.vehiclePlate}</Text>
            </View>
          ) : null}
          {session.level ? (
            <View style={styles.slotTag}>
              <Text style={styles.slotTagLabel}>TẦNG</Text>
              <Text style={styles.slotTagValue}>{session.level}</Text>
            </View>
          ) : null}
          {session.sector ? (
            <View style={styles.slotTag}>
              <Text style={styles.slotTagLabel}>KHU</Text>
              <Text style={styles.slotTagValue}>{session.sector}</Text>
            </View>
          ) : null}
          {session.bayNumber ? (
            <View style={[styles.slotTag, styles.slotTagAccent]}>
              <Text style={[styles.slotTagLabel, styles.slotTagLabelAccent]}>Ô ĐỖ</Text>
              <Text style={[styles.slotTagValue, styles.slotTagValueAccent]}>{session.bayNumber}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Memo text if available */}
      {session.memo ? (
        <View style={styles.memoStrip}>
          <Ionicons name="document-text-outline" size={13} color={Palette.inkSubtle} />
          <Text style={styles.memoText} numberOfLines={1}>
            {session.memo}
          </Text>
        </View>
      ) : null}

      {/* Card footer */}
      <View style={styles.cardFooter}>
        {session.snapshotUri ? (
          <View style={styles.thumbnailWrap}>
            <Image source={{ uri: session.snapshotUri }} style={styles.thumbImage} />
            <Text style={styles.thumbCaption}>Ảnh vị trí</Text>
          </View>
        ) : (
          <View />
        )}

        <View style={styles.detailsAction}>
          <Text style={styles.actionLabel}>Chi tiết</Text>
          <Ionicons name="chevron-forward" size={14} color={Palette.brand} />
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
    gap: 10,
    ...Elevation.flat,
  },
  cardHighlighted: {
    borderColor: Palette.brand,
    borderWidth: 1.5,
    backgroundColor: "#FDFEFF",
    ...Elevation.raised,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  topMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  topRightCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  vehicleTagPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.brandLight,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Metrics.radiusPill,
    gap: 4,
    maxWidth: 120,
  },
  vehicleTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: Palette.brandDark,
  },
  timestampText: {
    fontSize: Metrics.fontXs,
    color: Palette.inkMuted,
    fontWeight: "600",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  locationPinBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Palette.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  addressTitle: {
    flex: 1,
    fontSize: Metrics.fontBase,
    fontWeight: "700",
    color: Palette.inkHeading,
    lineHeight: 22,
  },
  timerPillRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.brandLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Metrics.radiusSm - 4,
    gap: 5,
    alignSelf: "flex-start",
  },
  timerPillText: {
    fontSize: Metrics.fontXs,
    fontWeight: "700",
    color: Palette.brandDark,
  },
  slotPillCluster: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  slotTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Palette.cardSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Metrics.radiusSm - 2,
    gap: 4,
    borderWidth: 1,
    borderColor: Palette.outline,
  },
  slotTagLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: Palette.inkMuted,
    letterSpacing: 0.5,
  },
  slotTagValue: {
    fontSize: Metrics.fontSm,
    fontWeight: "800",
    color: Palette.inkHeading,
  },
  slotTagAccent: {
    backgroundColor: Palette.brandLight,
    borderColor: "rgba(37, 99, 235, 0.2)",
  },
  slotTagLabelAccent: {
    color: Palette.brandDark,
  },
  slotTagValueAccent: {
    color: Palette.brandDark,
  },
  memoStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Palette.cardSubtle,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Metrics.radiusSm - 4,
  },
  memoText: {
    flex: 1,
    fontSize: Metrics.fontSm,
    color: Palette.inkMuted,
    fontStyle: "italic",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Palette.separator,
  },
  thumbnailWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  thumbImage: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: Palette.outline,
  },
  thumbCaption: {
    fontSize: Metrics.fontXs,
    color: Palette.inkMuted,
    fontWeight: "500",
  },
  detailsAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  actionLabel: {
    fontSize: Metrics.fontSm,
    fontWeight: "700",
    color: Palette.brand,
  },
});
