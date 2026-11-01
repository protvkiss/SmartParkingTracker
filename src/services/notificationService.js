import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

// Cấu hình hiển thị thông báo khi ứng dụng đang mở (foreground)
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  // Bỏ qua nếu môi trường không hỗ trợ
}

export async function requestNotificationPermission() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("parking-timer", {
        name: "Hẹn giờ đỗ xe",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2563EB",
      });
    }

    return finalStatus === "granted";
  } catch (err) {
    console.warn("Không thể xin quyền thông báo:", err);
    return false;
  }
}

/**
 * Lên lịch thông báo trước khi hết giờ đỗ xe tại các mốc: 30 phút, 15 phút, 5 phút và khi hết giờ
 * @param {string} expiresAtIso - Mốc thời gian hết giờ (ISO string)
 * @param {string} vehicleName - Tên phương tiện
 * @param {string} locationName - Tên điểm đỗ
 * @returns {Promise<string[]>} Danh sách notificationId đã lên lịch
 */
export async function scheduleParkingAlerts(expiresAtIso, vehicleName = "Phương tiện", locationName = "Điểm đỗ") {
  if (!expiresAtIso) return [];

  const expiresTime = new Date(expiresAtIso).getTime();
  const now = Date.now();
  if (expiresTime <= now) return [];

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return [];

  const alertCheckpoints = [
    { minutesBefore: 30, title: "⏰ Sắp hết giờ đỗ xe (Còn 30 phút)", body: `Phiên đỗ của ${vehicleName} tại ${locationName} sắp hết hạn trong 30 phút nữa.` },
    { minutesBefore: 15, title: "⚠️ Chú ý: Còn 15 phút đỗ xe!", body: `Chỉ còn 15 phút nữa là hết giờ đỗ của ${vehicleName}. Hãy chuẩn bị lấy xe.` },
    { minutesBefore: 5, title: "🚨 Cảnh báo khẩn cấp: Còn 5 phút!", body: `Xe ${vehicleName} chỉ còn 5 phút đỗ xe! Hãy di chuyển tới xe để tránh bị phạt.` },
    { minutesBefore: 0, title: "🛑 ĐÃ HẾT GIỜ ĐỖ XE!", body: `Thời gian đỗ xe của ${vehicleName} đã kết thúc. Vui lòng lấy xe ngay!` },
  ];

  const scheduledIds = [];

  for (const checkpoint of alertCheckpoints) {
    const triggerTime = expiresTime - checkpoint.minutesBefore * 60 * 1000;
    // Chỉ lên lịch nếu mốc cảnh báo này vẫn còn ở tương lai ít nhất 10 giây
    if (triggerTime > now + 10000) {
      try {
        const secondsUntilTrigger = Math.max(1, Math.round((triggerTime - now) / 1000));
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: checkpoint.title,
            body: checkpoint.body,
            sound: "default",
            priority: Notifications.AndroidNotificationPriority.HIGH,
            vibrate: [0, 250, 250, 250],
            data: { expiresAt: expiresAtIso, vehicleName },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: secondsUntilTrigger,
            repeats: false,
            channelId: "parking-timer",
          },
        });
        if (id) scheduledIds.push(id);
      } catch (e) {
        console.warn(`Lỗi lên lịch thông báo ${checkpoint.minutesBefore}m:`, e);
      }
    }
  }

  return scheduledIds;
}

/**
 * Hủy toàn bộ thông báo đã lên lịch khi người dùng bấm "Đã lấy xe" hoặc đổi vị trí
 * @param {string[]} notificationIds
 */
export async function cancelParkingAlerts(notificationIds = []) {
  if (!Array.isArray(notificationIds) || notificationIds.length === 0) return;

  for (const id of notificationIds) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch (e) {
      // bỏ qua lỗi nếu id đã tự hoàn thành hoặc không tồn tại
    }
  }
}
