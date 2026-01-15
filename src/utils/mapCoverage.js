import { getRadarConfig } from '../services/mapService.js';
import { BARRACKS_RADIUS_RATIO } from '../constants/player.js';

/**
 * Construye la lista de radares activos (base + barracas aliadas)
 * @param {Object} params
 * @param {boolean} params.baseConfirmed
 * @param {{lat:number,lng:number}|null} params.basePosition
 * @param {number} params.radarLevel
 * @param {Array} params.pois
 */
export function buildCoverageRadars({ baseConfirmed, basePosition, radarLevel, pois }) {
  const list = [];

  const baseConfig = getRadarConfig(radarLevel);
  if (baseConfirmed && basePosition) {
    list.push({
      id: 'base',
      center: basePosition,
      radius: baseConfig.radius,
    });
  }

  (pois ?? []).forEach((poi) => {
    if (poi.type !== 'barrack' || !poi.owned) return;
    const barrackRadius = poi.barrackRadarRadius ?? (baseConfig.radius * BARRACKS_RADIUS_RATIO);
    list.push({
      id: `barrack-${poi.id}`,
      center: { lat: poi.lat, lng: poi.lng },
      radius: barrackRadius,
    });
  });

  return list;
}

/**
 * Firma ordenada para detectar cambios en barracas propias
 * @param {Array} pois
 * @returns {string[]}
 */
export function buildOwnedBarracksSignature(pois) {
  if (!Array.isArray(pois)) return [];
  return pois
    .filter((poi) => poi.type === 'barrack' && poi.owned)
    .map((poi) => `${poi.id}:${poi.lat}:${poi.lng}`)
    .sort();
}
