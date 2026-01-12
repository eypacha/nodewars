import { getRadarConfig } from '../services/mapService.js';
import { BARRACKS_RADAR_RADIUS } from '../constants/player.js';

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

  if (baseConfirmed && basePosition) {
    const baseConfig = getRadarConfig(radarLevel);
    list.push({
      id: 'base',
      center: basePosition,
      radius: baseConfig.radius,
    });
  }

  (pois ?? []).forEach((poi) => {
    if (poi.type !== 'barrack' || !poi.owned) return;
    list.push({
      id: `barrack-${poi.id}`,
      center: { lat: poi.lat, lng: poi.lng },
      radius: BARRACKS_RADAR_RADIUS,
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
