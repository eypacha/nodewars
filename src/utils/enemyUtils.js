import { calculateDistance } from '@/utils/mapHelpers';

const EARTH_RADIUS_METERS = 6371000;
const TWO_PI = Math.PI * 2;
const EPSILON = 1e-6;

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

const normalizeAngle = (angle) => {
  const mod = angle % TWO_PI;
  return mod < 0 ? mod + TWO_PI : mod;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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

const mergeIntervals = (intervals) => {
  if (!intervals.length) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged = [sorted[0]];

  for (let i = 1; i < sorted.length; i += 1) {
    const [start, end] = sorted[i];
    const last = merged[merged.length - 1];
    if (start <= last[1] + EPSILON) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }

  return merged;
};

const computeAvailableArcs = (radar, radars) => {
  const others = radars.filter((r) => r.id !== radar.id);
  if (!others.length) {
    return [{ start: 0, end: TWO_PI, length: TWO_PI * radar.radius, radar }];
  }

  const forbidden = [];

  for (const other of others) {
    const distance = calculateDistance([radar.center.lat, radar.center.lng], [other.center.lat, other.center.lng]);

    if (distance + radar.radius <= other.radius + EPSILON) {
      return [];
    }

    if (distance >= radar.radius + other.radius - EPSILON || distance <= Math.abs(radar.radius - other.radius) - EPSILON) {
      continue;
    }

    const angleToOther = normalizeAngle(computeBearingRadians(radar.center, other.center));
    const cosValue = clamp((radar.radius ** 2 + distance ** 2 - other.radius ** 2) / (2 * radar.radius * distance), -1, 1);
    const overlapAngle = Math.acos(cosValue);

    const start = normalizeAngle(angleToOther - overlapAngle);
    const end = normalizeAngle(angleToOther + overlapAngle);

    if (start <= end) {
      forbidden.push([start, end]);
    } else {
      forbidden.push([start, TWO_PI]);
      forbidden.push([0, end]);
    }
  }

  const mergedForbidden = mergeIntervals(forbidden);

  if (!mergedForbidden.length) {
    return [{ start: 0, end: TWO_PI, length: TWO_PI * radar.radius, radar }];
  }

  const available = [];
  let currentStart = 0;

  mergedForbidden.forEach(([start, end]) => {
    if (start - currentStart > EPSILON) {
      available.push({ start: currentStart, end: start, length: (start - currentStart) * radar.radius, radar });
    }
    currentStart = end;
  });

  if (TWO_PI - currentStart > EPSILON) {
    available.push({ start: currentStart, end: TWO_PI, length: (TWO_PI - currentStart) * radar.radius, radar });
  }

  return available;
};

export const getUniformSpawnOnUnionBoundary = (radars) => {
  const arcs = radars.flatMap((radar) => computeAvailableArcs(radar, radars));
  const totalLength = arcs.reduce((sum, arc) => sum + arc.length, 0);
  if (totalLength <= EPSILON) return null;

  let pick = Math.random() * totalLength;

  for (const arc of arcs) {
    if (pick <= arc.length) {
      const angleOffset = pick / arc.radar.radius;
      const angle = arc.start + angleOffset;
      return { radar: arc.radar, angle };
    }
    pick -= arc.length;
  }

  return null;
};
