import { useCallback, useEffect, useRef, useState } from "react";
import { queryCurrentLocation, requestGpsPermission } from "~/services/deviceGps";

export function useLiveLocation() {
  const [coords, setCoords] = useState(null);
  const [permissionGranted, setPermissionGranted] = useState(null);
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    async function initGps() {
      const allowed = await requestGpsPermission();
      if (mountedRef.current) {
        setPermissionGranted(allowed);
      }
    }

    initGps();
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshLocation = useCallback(async () => {
    if (mountedRef.current) {
      setBusy(true);
      setErrorMessage(null);
    }

    try {
      const result = await queryCurrentLocation();
      if (!mountedRef.current) return null;

      if (result) {
        setCoords(result);
        return result;
      }

      setErrorMessage("Không thể xác định vị trí. Vui lòng cấp quyền GPS.");
      return null;
    } catch (e) {
      if (mountedRef.current) {
        setErrorMessage("Lỗi khi đọc tín hiệu định vị.");
      }
      return null;
    } finally {
      if (mountedRef.current) {
        setBusy(false);
      }
    }
  }, []);

  useEffect(() => {
    if (permissionGranted) {
      refreshLocation();
    }
  }, [permissionGranted, refreshLocation]);

  return {
    coords,
    permissionGranted,
    busy,
    errorMessage,
    refreshLocation,
  };
}
