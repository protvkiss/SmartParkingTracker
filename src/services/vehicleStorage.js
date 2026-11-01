import AsyncStorage from "@react-native-async-storage/async-storage";

const VEHICLES_STORAGE_KEY = "@smart_parking_vehicles_v1";

export const DEFAULT_VEHICLES = [
  {
    id: "veh_default_car",
    name: "Ô tô của tôi",
    type: "car",
    licensePlate: "30A-888.88",
    color: "#2563EB",
    isDefault: true,
  },
  {
    id: "veh_default_bike",
    name: "Xe máy",
    type: "bike",
    licensePlate: "29E1-666.99",
    color: "#10B981",
    isDefault: false,
  },
];

export async function fetchSavedVehicles() {
  try {
    const raw = await AsyncStorage.getItem(VEHICLES_STORAGE_KEY);
    // Nếu chưa từng có dữ liệu trong máy (lần đầu cài app) thì khởi tạo danh sách mẫu
    if (raw === null) {
      await AsyncStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(DEFAULT_VEHICLES));
      return DEFAULT_VEHICLES;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Cho phép trả về mảng rỗng [] nếu người dùng đã xóa hết xe
    return parsed;
  } catch (err) {
    console.warn("Lỗi fetchSavedVehicles:", err);
    return [];
  }
}

export async function commitVehicles(vehicles) {
  try {
    await AsyncStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(vehicles));
    return vehicles;
  } catch (err) {
    console.warn("Lỗi commitVehicles:", err);
    throw err;
  }
}
