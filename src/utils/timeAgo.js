const pad = (n) => String(n).padStart(2, "0");

export function formatFullDateTime(timestamp) {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return "";

  const day = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year = d.getFullYear();
  const hrs = pad(d.getHours());
  const mins = pad(d.getMinutes());

  return `${day}/${month}/${year} ${hrs}:${mins}`;
}

export function formatTimeOnly(timestamp) {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return "";

  const hrs = pad(d.getHours());
  const mins = pad(d.getMinutes());

  return `${hrs}:${mins}`;
}

export function formatMomentRelative(timestamp) {
  if (!timestamp) return "";
  const timeMs = new Date(timestamp).getTime();
  if (Number.isNaN(timeMs)) return "";

  const secondsDiff = Math.max(0, Math.floor((Date.now() - timeMs) / 1000));

  if (secondsDiff < 60) return "Vừa xong";
  const mins = Math.floor(secondsDiff / 60);
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Hôm qua";
  if (days < 7) return `${days} ngày trước`;

  return formatFullDateTime(timestamp);
}

export function formatParkingDuration(startTimestamp, endTimestamp = null) {
  if (!startTimestamp) return "";
  const startMs = new Date(startTimestamp).getTime();
  const endMs = endTimestamp ? new Date(endTimestamp).getTime() : Date.now();
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) return "";

  const totalSecs = Math.max(0, Math.floor((endMs - startMs) / 1000));
  const totalMins = Math.floor(totalSecs / 60);
  const hours = Math.floor(totalMins / 60);
  const mins = totalMins % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins} phút`;
}

/**
 * Tính thời gian còn lại trước khi hết giờ đỗ xe
 */
export function formatTimeRemaining(expiresAt) {
  if (!expiresAt) return null;
  const expireMs = new Date(expiresAt).getTime();
  const nowMs = Date.now();
  if (Number.isNaN(expireMs)) return null;

  const diffSecs = Math.floor((expireMs - nowMs) / 1000);

  if (diffSecs <= 0) {
    const overdueMins = Math.floor(Math.abs(diffSecs) / 60);
    return overdueMins > 0 ? `Quá hạn ${overdueMins}m` : "Hết giờ!";
  }

  const mins = Math.floor(diffSecs / 60);
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;

  if (hours > 0) {
    return `Còn ${hours}h ${remainingMins}m`;
  }
  return `Còn ${mins} phút`;
}

/**
 * Xác định mức độ cảnh báo của thời gian còn lại
 * @returns {'SAFE' | 'ALERT_30' | 'ALERT_15' | 'CRITICAL_5' | 'EXPIRED'}
 */
export function getTimerAlertTier(expiresAt) {
  if (!expiresAt) return "NONE";
  const expireMs = new Date(expiresAt).getTime();
  const diffMins = Math.floor((expireMs - Date.now()) / 60000);

  if (diffMins <= 0) return "EXPIRED";
  if (diffMins <= 5) return "CRITICAL_5";
  if (diffMins <= 15) return "ALERT_15";
  if (diffMins <= 30) return "ALERT_30";
  return "SAFE";
}
