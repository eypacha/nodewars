/**
 * Composable para gestionar radares de cuarteles
 * Maneja la creación y visualización de radares múltiples para cuarteles
 */
import { ref } from 'vue';
import L from 'leaflet';
import { getRadarConfig } from '@/services/mapService';

export const useBarracksRadar = (mapRef) => {
  const barracksRadars = ref(new Map());
  const BASE_RADAR_COLOR = getRadarConfig().color;

  // Radio del radar de cuartel (más pequeño que el principal)
  const BARRACKS_RADAR_RADIUS = 500; // metros

  /**
   * Crea o actualiza radares para todos los cuarteles conquistados
   * @param {Array} pois - Array de POIs
   */
  const updateBarracksRadars = (pois) => {
    if (!mapRef.value) return;

    // Obtener cuarteles conquistados
    const activeBarracks = pois.filter(poi => 
      poi.type === 'barrack' && 
      poi.owned
    );

    // Eliminar radares de cuarteles que ya no existen
    const activeIds = new Set(activeBarracks.map(b => b.id));
    for (const [id, radar] of barracksRadars.value.entries()) {
      if (!activeIds.has(id)) {
        radar.remove();
        barracksRadars.value.delete(id);
      }
    }

    // Crear o actualizar radares para cuarteles activos
    activeBarracks.forEach(barrack => {
      if (barracksRadars.value.has(barrack.id)) {
        // Actualizar posición si existe
        const radar = barracksRadars.value.get(barrack.id);
        radar.setLatLng([barrack.lat, barrack.lng]);
      } else {
        // Crear nuevo radar con el color del radar principal
        const radar = L.circle([barrack.lat, barrack.lng], {
          color: BASE_RADAR_COLOR, // Color del radar principal
          fillColor: BASE_RADAR_COLOR,
          fillOpacity: 0.08,
          radius: BARRACKS_RADAR_RADIUS,
          weight: 2,
        }).addTo(mapRef.value);

        barracksRadars.value.set(barrack.id, radar);
      }
    });
  };

  /**
   * Elimina todos los radares de cuarteles
   */
  const clearBarracksRadars = () => {
    barracksRadars.value.forEach(radar => radar.remove());
    barracksRadars.value.clear();
  };

  /**
   * Elimina el radar de un cuartel específico
   * @param {string} barracksId - ID del cuartel
   */
  const removeBarracksRadar = (barracksId) => {
    const radar = barracksRadars.value.get(barracksId);
    if (radar) {
      radar.remove();
      barracksRadars.value.delete(barracksId);
    }
  };

  return {
    barracksRadars,
    updateBarracksRadars,
    clearBarracksRadars,
    removeBarracksRadar,
  };
};
