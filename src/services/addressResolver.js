import * as Location from "expo-location";

export async function resolveStreetAddress(latitude, longitude) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return "Vị trí không xác định";
  }

  try {
    const list = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (list && list.length > 0) {
      const place = list[0];
      const components = [
        place.name && place.name !== place.street ? place.name : null,
        place.street,
        place.district || place.subregion,
        place.city || place.region,
      ].filter(Boolean);

      if (components.length > 0) {
        return components.join(", ");
      }
    }
    return "Vị trí không xác định";
  } catch (err) {
    console.warn("Lỗi resolveStreetAddress:", err);
    return "Vị trí không xác định";
  }
}
