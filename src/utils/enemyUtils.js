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
