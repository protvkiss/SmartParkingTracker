import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

export function useRadarSensors() {
  const [deviceCoords, setDeviceCoords] = useState(null);
  const [headingDegrees, setHeadingDegrees] = useState(null);
  const [headingCalibration, setHeadingCalibration] = useState(null);
  const [gpsError, setGpsError] = useState(null);
  const [compassError, setCompassError] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [cycle, setCycle] = useState(0);

  const aliveRef = useRef(true);

  const reSync = useCallback(() => {
    setCycle((c) => c + 1);
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    let locationUnsub = null;
    let headingUnsub = null;

    async function activateSensors() {
      if (aliveRef.current) {
        setInitializing(true);
        setGpsError(null);
        setCompassError(null);
      }

      try {
        const auth = await Location.requestForegroundPermissionsAsync();
        if (auth.status !== "granted") {
          if (aliveRef.current) {
            setGpsError("Cần quyền truy cập vị trí để điều hướng la bàn.");
            setInitializing(false);
          }
          return;
        }

        const initialPoint = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (aliveRef.current && initialPoint?.coords) {
          setDeviceCoords({
            latitude: initialPoint.coords.latitude,
            longitude: initialPoint.coords.longitude,
            accuracy: initialPoint.coords.accuracy ?? null,
          });
        }

        locationUnsub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 1000,
            distanceInterval: 1,
          },
          (loc) => {
            if (aliveRef.current && loc?.coords) {
              setDeviceCoords({
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                accuracy: loc.coords.accuracy ?? null,
              });
              setGpsError(null);
            }
          },
          (err) => {
            if (aliveRef.current) {
              setGpsError(err || "Mất tín hiệu GPS thời gian thực.");
            }
          },
        );

        if (Platform.OS === "web") {
          if (aliveRef.current) {
            setCompassError("Cảm biến la bàn chỉ khả dụng trên thiết bị điện thoại.");
          }
          return;
        }

        headingUnsub = await Location.watchHeadingAsync(
          (hData) => {
            if (!aliveRef.current) return;
            const chosenHeading =
              hData.trueHeading >= 0 ? hData.trueHeading : hData.magHeading;

            setHeadingDegrees(chosenHeading);
            setHeadingCalibration(hData.accuracy);
            setCompassError(null);
          },
          (err) => {
            if (aliveRef.current) {
              setCompassError(err || "Không kết nối được cảm biến la bàn.");
            }
          },
        );
      } catch (err) {
        console.warn("useRadarSensors error:", err);
        if (aliveRef.current) {
          setGpsError("Lỗi khởi tạo cảm biến vị trí.");
        }
      } finally {
        if (aliveRef.current) {
          setInitializing(false);
        }
      }
    }

    activateSensors();

    return () => {
      aliveRef.current = false;
      locationUnsub?.remove();
      headingUnsub?.remove();
    };
  }, [cycle]);

  return {
    deviceCoords,
    headingDegrees,
    headingCalibration,
    gpsError,
    compassError,
    initializing,
    reSync,
  };
}
