import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";

import { commitSessions, fetchSavedSessions, purgeAllSessions } from "~/services/localStorage";
import { cancelParkingAlerts, scheduleParkingAlerts } from "~/services/notificationService";
import { evictSnapshot } from "~/services/photoVault";
import { commitVehicles, DEFAULT_VEHICLES, fetchSavedVehicles } from "~/services/vehicleStorage";
import { generateSessionToken } from "~/utils/uid";

const ParkingStoreContext = createContext(null);

const STORE_ACTIONS = {
  BOOT_STORE: "BOOT_STORE",
  SET_RECORDS: "SET_RECORDS",
  SET_VEHICLES: "SET_VEHICLES",
  SET_PENDING: "SET_PENDING",
};

function storeReducer(state, action) {
  switch (action.type) {
    case STORE_ACTIONS.BOOT_STORE:
      return {
        ...state,
        records: action.payload.records,
        vehicles: action.payload.vehicles,
        loading: false,
      };
    case STORE_ACTIONS.SET_RECORDS:
      return { ...state, records: action.payload };
    case STORE_ACTIONS.SET_VEHICLES:
      return { ...state, vehicles: action.payload };
    case STORE_ACTIONS.SET_PENDING:
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

export function ParkingStoreProvider({ children }) {
  const [state, dispatch] = useReducer(storeReducer, {
    records: [],
    vehicles: DEFAULT_VEHICLES,
    loading: true,
  });

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const [storedRecords, storedVehicles] = await Promise.all([
          fetchSavedSessions(),
          fetchSavedVehicles(),
        ]);

        if (active) {
          dispatch({
            type: STORE_ACTIONS.BOOT_STORE,
            payload: { records: storedRecords, vehicles: storedVehicles },
          });
        }
      } catch (err) {
        console.warn("Lỗi đọc dữ liệu đỗ xe & phương tiện:", err);
        if (active) {
          dispatch({ type: STORE_ACTIONS.SET_PENDING, payload: false });
        }
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, []);

  const activeSpots = useMemo(() => {
    return state.records.filter((rec) => rec.state === "OCCUPIED");
  }, [state.records]);

  const activeSpot = useMemo(() => {
    return activeSpots[0] || null;
  }, [activeSpots]);

  const defaultVehicle = useMemo(() => {
    return state.vehicles.find((v) => v.isDefault) || state.vehicles[0] || null;
  }, [state.vehicles]);

  const updateStoreRecords = useCallback(async (updatedList) => {
    const persisted = await commitSessions(updatedList);
    dispatch({ type: STORE_ACTIONS.SET_RECORDS, payload: persisted });
    return persisted;
  }, []);

  // QUẢN LÝ PHƯƠNG TIỆN
  const updateStoreVehicles = useCallback(async (updatedVehicles) => {
    const persisted = await commitVehicles(updatedVehicles);
    dispatch({ type: STORE_ACTIONS.SET_VEHICLES, payload: persisted });
    return persisted;
  }, []);

  const addVehicle = useCallback(
    async ({ name, type = "car", licensePlate = "", color = "#2563EB", isDefault = false }) => {
      const newVeh = {
        id: `veh_${Date.now()}`,
        name: name.trim() || "Phương tiện mới",
        type,
        licensePlate: licensePlate.trim().toUpperCase(),
        color,
        isDefault: isDefault || state.vehicles.length === 0,
      };

      const updated = isDefault
        ? state.vehicles.map((v) => ({ ...v, isDefault: false })).concat(newVeh)
        : [...state.vehicles, newVeh];

      await updateStoreVehicles(updated);
      return newVeh;
    },
    [state.vehicles, updateStoreVehicles],
  );

  const editVehicle = useCallback(
    async (id, { name, type, licensePlate, color, isDefault }) => {
      const updated = state.vehicles.map((v) => {
        if (v.id === id) {
          return {
            ...v,
            name: name !== undefined ? name.trim() : v.name,
            type: type || v.type,
            licensePlate: licensePlate !== undefined ? licensePlate.trim().toUpperCase() : v.licensePlate,
            color: color || v.color,
            isDefault: isDefault !== undefined ? isDefault : v.isDefault,
          };
        }
        if (isDefault) {
          return { ...v, isDefault: false };
        }
        return v;
      });

      await updateStoreVehicles(updated);
    },
    [state.vehicles, updateStoreVehicles],
  );

  const removeVehicle = useCallback(
    async (id) => {
      const filtered = state.vehicles.filter((v) => v.id !== id);
      // Nếu còn xe và xe vừa xóa là mặc định, gán xe đầu tiên còn lại làm mặc định
      const hasDefault = filtered.some((v) => v.isDefault);
      const finalized = filtered.length > 0
        ? (hasDefault ? filtered : filtered.map((v, i) => (i === 0 ? { ...v, isDefault: true } : v)))
        : [];

      await updateStoreVehicles(finalized);
    },
    [state.vehicles, updateStoreVehicles],
  );

  const setVehicleAsDefault = useCallback(
    async (id) => {
      const updated = state.vehicles.map((v) => ({
        ...v,
        isDefault: v.id === id,
      }));
      await updateStoreVehicles(updated);
    },
    [state.vehicles, updateStoreVehicles],
  );

  // LƯU VỊ TRÍ ĐỖ XE KÈM PHƯƠNG TIỆN & HẸN GIỜ
  const checkInSpot = useCallback(
    async ({
      latitude,
      longitude,
      locationName,
      level,
      sector,
      bayNumber,
      memo,
      snapshotUri,
      vehicle = null,
      timerMinutes = null,
    }) => {
      const now = new Date();
      const nowIso = now.toISOString();

      let expiresAt = null;
      let notificationIds = [];

      // Tính mốc hết giờ đỗ nếu có hẹn giờ
      if (typeof timerMinutes === "number" && timerMinutes > 0) {
        expiresAt = new Date(now.getTime() + timerMinutes * 60 * 1000).toISOString();
        const vehTitle = vehicle?.name || "Phương tiện";
        const locTitle = locationName?.trim() || "Điểm đỗ";

        // Lên lịch thông báo 30m, 15m, 5m và 0m
        notificationIds = await scheduleParkingAlerts(expiresAt, vehTitle, locTitle);
      }

      const selectedVeh = vehicle || defaultVehicle;

      const newEntry = {
        id: generateSessionToken(),
        position: { latitude, longitude },
        locationName: locationName?.trim() || "Vị trí không xác định",
        level: level?.trim() || "",
        sector: sector?.trim() || "",
        bayNumber: bayNumber?.trim() || "",
        memo: memo?.trim() || "",
        snapshotUri: snapshotUri || null,
        state: "OCCUPIED",
        parkedAt: nowIso,
        vacatedAt: null,
        // Thông tin phương tiện
        vehicleId: selectedVeh?.id || null,
        vehicleName: selectedVeh?.name || "Phương tiện",
        vehicleType: selectedVeh?.type || "car",
        vehiclePlate: selectedVeh?.licensePlate || "",
        // Thông tin hẹn giờ đỗ
        timerMinutes: timerMinutes || null,
        expiresAt,
        notificationIds,
      };

      // Chỉ lưu trữ/giải phóng phiên đỗ cũ của CHÍNH XE NÀY nếu xe này đang có điểm đỗ
      // Các xe khác vẫn giữ nguyên trạng thái OCCUPIED để người dùng có thể đỗ song song nhiều xe
      const archivedPrior = state.records.map((r) => {
        const isSameVehicle =
          r.state === "OCCUPIED" &&
          ((selectedVeh?.id && r.vehicleId === selectedVeh.id) ||
            (!selectedVeh?.id && !r.vehicleId && r.vehicleName === (selectedVeh?.name || "Phương tiện")));

        if (isSameVehicle) {
          // Hủy thông báo của phiên đỗ cũ của xe này nếu có
          if (r.notificationIds?.length > 0) {
            cancelParkingAlerts(r.notificationIds);
          }
          return { ...r, state: "VACATED", vacatedAt: nowIso };
        }
        return r;
      });

      const nextRecords = [newEntry, ...archivedPrior];
      await updateStoreRecords(nextRecords);
      return newEntry;
    },
    [defaultVehicle, state.records, updateStoreRecords],
  );

  const vacateCurrentSpot = useCallback(
    async (targetId = activeSpot?.id) => {
      if (!targetId) return;

      const nowIso = new Date().toISOString();
      const nextRecords = state.records.map((r) => {
        if (r.id === targetId) {
          // Hủy toàn bộ thông báo hẹn giờ nếu xe đã được lấy
          if (r.notificationIds?.length > 0) {
            cancelParkingAlerts(r.notificationIds);
          }
          return { ...r, state: "VACATED", vacatedAt: nowIso };
        }
        return r;
      });

      await updateStoreRecords(nextRecords);
    },
    [activeSpot?.id, state.records, updateStoreRecords],
  );

  const reoccupySpot = useCallback(
    async (targetId) => {
      if (!targetId) return;

      const nowIso = new Date().toISOString();
      const nextRecords = state.records.map((r) => {
        if (r.id === targetId) {
          return { ...r, state: "OCCUPIED", vacatedAt: null };
        }
        if (r.state === "OCCUPIED") {
          if (r.notificationIds?.length > 0) {
            cancelParkingAlerts(r.notificationIds);
          }
          return { ...r, state: "VACATED", vacatedAt: nowIso };
        }
        return r;
      });

      await updateStoreRecords(nextRecords);
    },
    [state.records, updateStoreRecords],
  );

  const discardSpotRecord = useCallback(
    async (targetId) => {
      if (!targetId) return;

      const itemToDelete = state.records.find((r) => r.id === targetId);
      if (itemToDelete?.notificationIds?.length > 0) {
        cancelParkingAlerts(itemToDelete.notificationIds);
      }

      const nextRecords = state.records.filter((r) => r.id !== targetId);
      await updateStoreRecords(nextRecords);

      if (itemToDelete?.snapshotUri) {
        evictSnapshot(itemToDelete.snapshotUri);
      }
    },
    [state.records, updateStoreRecords],
  );

  const clearAllSessions = useCallback(async () => {
    state.records.forEach((r) => {
      if (r.notificationIds?.length > 0) {
        cancelParkingAlerts(r.notificationIds);
      }
    });

    await purgeAllSessions(state.records);
    dispatch({ type: STORE_ACTIONS.SET_RECORDS, payload: [] });
  }, [state.records]);

  const contextValue = useMemo(
    () => ({
      activeSpot,
      activeSpots,
      sessionLogs: state.records,
      vehicles: state.vehicles,
      defaultVehicle,
      isLoading: state.loading,
      checkInSpot,
      vacateCurrentSpot,
      reoccupySpot,
      discardSpotRecord,
      clearAllSessions,
      addVehicle,
      editVehicle,
      removeVehicle,
      setVehicleAsDefault,
    }),
    [
      activeSpot,
      activeSpots,
      state.records,
      state.vehicles,
      defaultVehicle,
      state.loading,
      checkInSpot,
      vacateCurrentSpot,
      reoccupySpot,
      discardSpotRecord,
      clearAllSessions,
      addVehicle,
      editVehicle,
      removeVehicle,
      setVehicleAsDefault,
    ],
  );

  return (
    <ParkingStoreContext.Provider value={contextValue}>
      {children}
    </ParkingStoreContext.Provider>
  );
}

export function useParkingStore() {
  const ctx = useContext(ParkingStoreContext);
  if (!ctx) {
    throw new Error("useParkingStore phải được bọc trong ParkingStoreProvider.");
  }
  return ctx;
}
