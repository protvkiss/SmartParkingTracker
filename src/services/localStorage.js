import AsyncStorage from "@react-native-async-storage/async-storage";
import { APP_CONFIG } from "~/core/config";
import { evictSnapshot } from "./photoVault";

export function sanitizeSessions(rawItems) {
  if (!Array.isArray(rawItems)) return [];

  return rawItems.map((item, idx) => {
    const isTargetOccupied = item.state === "OCCUPIED" || (!item.state && idx === 0);
    const resolvedState = isTargetOccupied ? "OCCUPIED" : "VACATED";

    return {
      id: item.id || `rec_${Date.now()}_${idx}`,
      position: {
        latitude: item.position?.latitude ?? item.latitude ?? 0,
        longitude: item.position?.longitude ?? item.longitude ?? 0,
      },
      locationName: item.locationName || item.address || "Vị trí không xác định",
      level: item.level ? String(item.level).trim() : (item.floor ? String(item.floor).trim() : ""),
      sector: item.sector ? String(item.sector).trim() : (item.zone ? String(item.zone).trim() : ""),
      bayNumber: item.bayNumber ? String(item.bayNumber).trim() : (item.slotNumber ? String(item.slotNumber).trim() : ""),
      memo: item.memo ? String(item.memo).trim() : (item.note ? String(item.note).trim() : ""),
      snapshotUri: item.snapshotUri || item.imageUri || null,
      voiceNoteUri: item.voiceNoteUri || item.audioUri || null,
      voiceDurationSecs: typeof item.voiceDurationSecs === "number" ? item.voiceDurationSecs : null,
      state: resolvedState,
      parkedAt: item.parkedAt || item.savedAt || new Date().toISOString(),
      vacatedAt: resolvedState === "OCCUPIED" ? null : (item.vacatedAt || item.retrievedAt || null),
      // Trường mới cho phương tiện
      vehicleId: item.vehicleId || null,
      vehicleName: item.vehicleName || "Phương tiện",
      vehicleType: item.vehicleType || "car",
      vehiclePlate: item.vehiclePlate || "",
      // Trường mới cho hẹn giờ
      timerMinutes: typeof item.timerMinutes === "number" ? item.timerMinutes : null,
      expiresAt: item.expiresAt || null,
      notificationIds: Array.isArray(item.notificationIds) ? item.notificationIds : [],
    };
  });
}

export async function fetchSavedSessions() {
  try {
    const raw = await AsyncStorage.getItem(APP_CONFIG.STORAGE_VAULT_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    const sanitized = sanitizeSessions(parsed);

    if (JSON.stringify(parsed) !== JSON.stringify(sanitized)) {
      await AsyncStorage.setItem(APP_CONFIG.STORAGE_VAULT_KEY, JSON.stringify(sanitized));
    }

    return sanitized;
  } catch (err) {
    console.warn("Lỗi fetchSavedSessions:", err);
    return [];
  }
}

export async function commitSessions(sessions) {
  const bounded = sessions.slice(0, APP_CONFIG.HISTORY_CAPACITY);
  const pruned = sessions.slice(APP_CONFIG.HISTORY_CAPACITY);

  try {
    await AsyncStorage.setItem(APP_CONFIG.STORAGE_VAULT_KEY, JSON.stringify(bounded));

    pruned.forEach((item) => {
      if (item.snapshotUri) {
        evictSnapshot(item.snapshotUri);
      }
    });

    return bounded;
  } catch (err) {
    console.warn("Lỗi commitSessions:", err);
    throw err;
  }
}

export async function purgeAllSessions(currentList = []) {
  try {
    await AsyncStorage.removeItem(APP_CONFIG.STORAGE_VAULT_KEY);

    currentList.forEach((item) => {
      if (item.snapshotUri) {
        evictSnapshot(item.snapshotUri);
      }
    });
  } catch (err) {
    console.warn("Lỗi purgeAllSessions:", err);
    throw err;
  }
}
