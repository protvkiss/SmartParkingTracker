import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from "react";

import { commitSessions, fetchSavedSessions, purgeAllSessions } from "~/services/localStorage";
import { evictSnapshot } from "~/services/photoVault";
import { generateSessionToken } from "~/utils/uid";

const ParkingStoreContext = createContext(null);

const STORE_ACTIONS = {
  BOOT_RECORDS: "BOOT_RECORDS",
  SET_PENDING: "SET_PENDING",
};

function storeReducer(state, action) {
  switch (action.type) {
    case STORE_ACTIONS.BOOT_RECORDS:
      return { ...state, records: action.payload, loading: false };
    case STORE_ACTIONS.SET_PENDING:
      return { ...state, loading: action.payload };
    default:
      return state;
  }
}

export function ParkingStoreProvider({ children }) {
  const [state, dispatch] = useReducer(storeReducer, {
    records: [],
    loading: true,
  });

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        const stored = await fetchSavedSessions();
        if (active) {
          dispatch({ type: STORE_ACTIONS.BOOT_RECORDS, payload: stored });
        }
      } catch (err) {
        console.warn("Lỗi đọc dữ liệu đỗ xe:", err);
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

  const activeSpot = useMemo(() => {
    return state.records.find((rec) => rec.state === "OCCUPIED") || null;
  }, [state.records]);

  const updateStore = useCallback(async (updatedList) => {
    const persisted = await commitSessions(updatedList);
    dispatch({ type: STORE_ACTIONS.BOOT_RECORDS, payload: persisted });
    return persisted;
  }, []);

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
    }) => {
      const nowIso = new Date().toISOString();

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
      };

      const archivedPrior = state.records.map((r) => {
        if (r.state === "OCCUPIED") {
          return { ...r, state: "VACATED", vacatedAt: nowIso };
        }
        return r;
      });

      const nextRecords = [newEntry, ...archivedPrior];
      await updateStore(nextRecords);
      return newEntry;
    },
    [state.records, updateStore],
  );

  const vacateCurrentSpot = useCallback(
    async (targetId = activeSpot?.id) => {
      if (!targetId) return;

      const nowIso = new Date().toISOString();
      const nextRecords = state.records.map((r) => {
        if (r.id === targetId) {
          return { ...r, state: "VACATED", vacatedAt: nowIso };
        }
        return r;
      });

      await updateStore(nextRecords);
    },
    [activeSpot?.id, state.records, updateStore],
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
          return { ...r, state: "VACATED", vacatedAt: nowIso };
        }
        return r;
      });

      await updateStore(nextRecords);
    },
    [state.records, updateStore],
  );

  const discardSpotRecord = useCallback(
    async (targetId) => {
      if (!targetId) return;

      const itemToDelete = state.records.find((r) => r.id === targetId);
      const nextRecords = state.records.filter((r) => r.id !== targetId);

      await updateStore(nextRecords);

      if (itemToDelete?.snapshotUri) {
        evictSnapshot(itemToDelete.snapshotUri);
      }
    },
    [state.records, updateStore],
  );

  const clearAllSessions = useCallback(async () => {
    await purgeAllSessions(state.records);
    dispatch({ type: STORE_ACTIONS.BOOT_RECORDS, payload: [] });
  }, [state.records]);

  const contextValue = useMemo(
    () => ({
      activeSpot,
      sessionLogs: state.records,
      isLoading: state.loading,
      checkInSpot,
      vacateCurrentSpot,
      reoccupySpot,
      discardSpotRecord,
      clearAllSessions,
    }),
    [
      activeSpot,
      state.records,
      state.loading,
      checkInSpot,
      vacateCurrentSpot,
      reoccupySpot,
      discardSpotRecord,
      clearAllSessions,
    ],
  );

  return (
    <ParkingStoreContext.Provider value={contextValue}>
      {children}
    </ParkingStoreContext.Provider>
  );
}

export function useParkingStore() {
  const store = useContext(ParkingStoreContext);
  if (!store) {
    throw new Error("useParkingStore phải được đặt trong ParkingStoreProvider");
  }
  return store;
}
