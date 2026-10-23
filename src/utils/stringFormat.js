export function shortenText(text, limit = 50) {
  if (!text) return "Không có thông tin địa chỉ";
  const clean = text.trim();
  if (clean.length <= limit) return clean;
  return clean.slice(0, limit - 3) + "...";
}

export function composeSpotTag(item) {
  if (!item) return "";
  const parts = [item.level, item.sector, item.bayNumber].map((s) => s?.trim()).filter(Boolean);
  return parts.join(" • ");
}
