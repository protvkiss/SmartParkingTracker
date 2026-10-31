import { Share } from "react-native";
import { composeSpotTag } from "~/utils/stringFormat";

export function generateSharePayload(record) {
  if (!record?.position) {
    throw new Error("Dữ liệu vị trí không đầy đủ");
  }

  const { latitude, longitude } = record.position;
  const spotString = composeSpotTag(record);
  const mapHyperlink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  const rows = [
    "🚗 Vị trí xe đã lưu",
    record.locationName ? `📍 ${record.locationName}` : null,
    spotString ? `🅿️ ${spotString}` : null,
    record.memo ? `📝 ${record.memo}` : null,
    `🗺️ Mở bản đồ: ${mapHyperlink}`,
  ];

  return rows.filter(Boolean).join("\n");
}

export async function shareSpotDetails(record) {
  const messageBody = generateSharePayload(record);

  return Share.share(
    {
      title: "Vị trí đỗ xe",
      message: messageBody,
    },
    {
      dialogTitle: "Chia sẻ vị trí đỗ xe",
      subject: "Vị trí xe của tôi",
    },
  );
}
