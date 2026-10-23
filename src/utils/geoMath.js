const RADIANS_FACTOR = Math.PI / 180;
const DEGREES_FACTOR = 180 / Math.PI;
const MEAN_EARTH_RADIUS_M = 6371000;

export function wrapAngle360(deg) {
  if (!Number.isFinite(deg)) return 0;
  return ((deg % 360) + 360) % 360;
}

/**
 * Tính khoảng cách trắc địa giữa hai điểm tọa độ (mét)
 */
export function computeSurfaceDistance(origin, target) {
  if (!origin?.latitude || !origin?.longitude || !target?.latitude || !target?.longitude) {
    return null;
  }

  const lat1Rad = origin.latitude * RADIANS_FACTOR;
  const lat2Rad = target.latitude * RADIANS_FACTOR;
  const deltaLat = (target.latitude - origin.latitude) * RADIANS_FACTOR;
  const deltaLon = (target.longitude - origin.longitude) * RADIANS_FACTOR;

  const sinHalfLat = Math.sin(deltaLat * 0.5);
  const sinHalfLon = Math.sin(deltaLon * 0.5);

  const arc =
    sinHalfLat * sinHalfLat +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * sinHalfLon * sinHalfLon;

  const angularDistance = 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
  return MEAN_EARTH_RADIUS_M * angularDistance;
}

/**
 * Tính góc phương vị từ điểm xuất phát tới xe (0 = Bắc, 90 = Đông, 180 = Nam, 270 = Tây)
 */
export function computeAzimuthBearing(fromCoord, toCoord) {
  if (!fromCoord || !toCoord) return null;

  const phi1 = fromCoord.latitude * RADIANS_FACTOR;
  const phi2 = toCoord.latitude * RADIANS_FACTOR;
  const deltaLambda = (toCoord.longitude - fromCoord.longitude) * RADIANS_FACTOR;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const azimuthRad = Math.atan2(y, x);
  return wrapAngle360(azimuthRad * DEGREES_FACTOR);
}

/**
 * Tính góc lệch tương đối để xoay kim la bàn về hướng xe
 */
export function computeDeviationAngle(bearing, deviceHeading) {
  if (bearing === null || deviceHeading === null) return 0;
  return wrapAngle360(bearing - deviceHeading);
}

/**
 * Diễn giải góc phương vị sang tên hướng tiếng Việt
 */
export function resolveCardinalSector(degrees) {
  if (!Number.isFinite(degrees)) return "Chưa xác định";

  const CARDINAL_POINTS = [
    "Bắc",
    "Đông Bắc",
    "Đông",
    "Đông Nam",
    "Nam",
    "Tây Nam",
    "Tây",
    "Tây Bắc",
  ];

  const sectorIndex = Math.round(wrapAngle360(degrees) / 45) % 8;
  return CARDINAL_POINTS[sectorIndex];
}

/**
 * Định dạng khoảng cách mét sang chuỗi hiển thị
 */
export function formatMetricDistance(meters) {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) {
    return "Đang tính...";
  }
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}
