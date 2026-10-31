import { Linking, Platform } from "react-native";

/**
 * Mở Google Maps để chỉ đường đến vị trí xe
 * Hỗ trợ mở qua app Google Maps (nếu đã cài) hoặc trực tiếp trên Google Maps web
 */
export async function launchExternalDirections(latitude, longitude, title = "Xe của tôi") {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    console.warn("Tọa độ không hợp lệ để chỉ đường");
    return;
  }

  // Đường link Google Maps chỉ đường chuẩn (travelmode=walking cho tìm xe)
  const googleMapsWebUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=walking`;

  // App scheme cho ứng dụng Google Maps
  const googleMapsAppScheme = Platform.select({
    ios: `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=walking`,
    android: `google.navigation:q=${latitude},${longitude}&mode=w`,
    default: googleMapsWebUrl,
  });

  try {
    // Nếu thiết bị đã cài đặt ứng dụng Google Maps thì ưu tiên mở app
    if (googleMapsAppScheme && (await Linking.canOpenURL(googleMapsAppScheme))) {
      await Linking.openURL(googleMapsAppScheme);
      return;
    }
  } catch (err) {
    // Bỏ qua lỗi scheme nếu app chưa cài hoặc canOpenURL không cho phép
  }

  // Mở Google Maps qua đường dẫn chính thức (mở web hoặc tự động gợi ý app Google Maps)
  try {
    await Linking.openURL(googleMapsWebUrl);
  } catch (fallbackError) {
    console.warn("Lỗi khi mở Google Maps:", fallbackError);
  }
}

export function buildMapRegion(latitude, longitude, span = 0.005) {
  return {
    latitude: Number(latitude) || 0,
    longitude: Number(longitude) || 0,
    latitudeDelta: Math.max(span, 0.001),
    longitudeDelta: Math.max(span, 0.001),
  };
}
