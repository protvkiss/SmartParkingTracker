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

export function formatMomentRelative(timestamp) {
  if (!timestamp) return "";
  const timeMs = new Date(timestamp).getTime();
  if (Number.isNaN(timeMs)) return "";

  const secondsDiff = Math.floor((Date.now() - timeMs) / 1000);

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
