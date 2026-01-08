import { calculateDistance } from '@/utils/mapHelpers';

const EARTH_RADIUS_METERS = 6371000;

export const toDegrees = (radians) => radians * (180 / Math.PI);
export const toRadians = (degrees) => degrees * (Math.PI / 180);

export const computePointOnEdge = (center, radius, angle) => {
  const deltaLat = toDegrees((radius * Math.cos(angle)) / EARTH_RADIUS_METERS);
  const deltaLng = toDegrees((radius * Math.sin(angle)) / (EARTH_RADIUS_METERS * Math.cos((center.lat * Math.PI) / 180)));
  return {
    lat: center.lat + deltaLat,
    lng: center.lng + deltaLng,
  };
};

export const findAngleOutsideOtherRadars = (radar, radars, attempts = 24) => {
  const others = radars.filter((r) => r.id !== radar.id);
  for (let i = 0; i < attempts; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const point = computePointOnEdge(radar.center, radar.radius, angle);
    const outside = others.every((other) => {
      const dist = calculateDistance([point.lat, point.lng], [other.center.lat, other.center.lng]);
      return dist >= other.radius;
    });
    if (outside) return angle;
  }
  return null;
};

export const computeBearingRadians = (from, to) => {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const dLon = toRadians(to.lng - from.lng);

  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return Math.atan2(y, x);
};

export const moveTowards = (from, bearingRad, distanceMeters) => {
  const lat1 = toRadians(from.lat);
  const lon1 = toRadians(from.lng);
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
    Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );

  const lon2 = lon1 + Math.atan2(
    Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
  );

  return {
    lat: toDegrees(lat2),
    lng: toDegrees(lon2),
  };
};
