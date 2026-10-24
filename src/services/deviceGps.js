import * as Location from "expo-location";

export async function requestGpsPermission() {
  try {
    const response = await Location.requestForegroundPermissionsAsync();
    return response.status === "granted";
  } catch (err) {
    console.warn("Lỗi kiểm tra quyền GPS:", err);
    return false;
  }
}

export async function queryCurrentLocation() {
  const isAuthorized = await requestGpsPermission();
  if (!isAuthorized) return null;

  try {
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? null,
    };
  } catch (err) {
    console.warn("Lỗi đọc vị trí hiện tại:", err);
    return null;
  }
}
