/**
 * Composable para gestionar puntos de interés en el mapa
 * Maneja la creación, actualización y visualización de POIs
 */
import { ref, watch } from 'vue';
import L from 'leaflet';
import { storeToRefs } from 'pinia';
import { usePoiStore } from '@/stores/poiStore';
import { getPOIConfig } from '@/services/mapService';

export const usePointsOfInterest = (mapRef) => {
  const poiStore = usePoiStore();
  const { pois } = storeToRefs(poiStore);
  
  const poiMarkers = ref([]);

  /**
   * Crea marcadores visuales para todos los POIs
   */
  const createPOIMarkers = () => {
    // Limpiar marcadores anteriores
    clearPOIMarkers();

    if (!mapRef.value) return;

    const config = getPOIConfig();

    // Crear un marcador circular para cada POI
    pois.value.forEach((poi) => {
      const marker = L.circleMarker([poi.lat, poi.lng], {
        radius: config.radius,
        fillColor: poi.color,
        color: poi.color,
        weight: config.weight,
        opacity: config.opacity,
        fillOpacity: config.fillOpacity,
        className: config.className,
      }).addTo(mapRef.value);

      // Añadir evento de click para mostrar el diálogo
      marker.on('click', (e) => {
        // Prevenir que el evento se propague al mapa
        L.DomEvent.stopPropagation(e);
        poiStore.selectPOI(poi.id);
      });

      // Cambiar cursor al pasar sobre el POI
      marker.on('mouseover', function() {
        this.setStyle({
          radius: config.radius * 1.5,
          weight: config.weight + 1,
        });
      });

      marker.on('mouseout', function() {
        this.setStyle({
          radius: config.radius,
          weight: config.weight,
        });
      });

      poiMarkers.value.push({
        id: poi.id,
        marker,
      });
    });
  };

  /**
   * Elimina todos los marcadores POI del mapa
   */
  const clearPOIMarkers = () => {
    poiMarkers.value.forEach(({ marker }) => {
      marker.remove();
    });
    poiMarkers.value = [];
  };

  /**
   * Actualiza los marcadores cuando cambian los POIs en el store
   */
  watch(pois, () => {
    createPOIMarkers();
  }, { deep: true });

  /**
   * Obtiene un marcador por ID de POI
   * @param {number} poiId - ID del POI
   * @returns {Object} Marcador de Leaflet
   */
  const getMarkerById = (poiId) => {
    const found = poiMarkers.value.find(({ id }) => id === poiId);
    return found?.marker;
  };

  /**
   * Resalta un POI específico
   * @param {number} poiId - ID del POI
   */
  const highlightPOI = (poiId) => {
    const marker = getMarkerById(poiId);
    if (marker) {
      marker.setStyle({
        radius: 10,
        weight: 4,
      });
      marker.openTooltip();
    }
  };

  /**
   * Quita el resaltado de un POI
   * @param {number} poiId - ID del POI
   */
  const unhighlightPOI = (poiId) => {
    const marker = getMarkerById(poiId);
    const config = getPOIConfig();
    if (marker) {
      marker.setStyle({
        radius: config.radius,
        weight: config.weight,
      });
      marker.closeTooltip();
    }
  };

  /**
   * Centra el mapa en un POI específico
   * @param {number} poiId - ID del POI
   * @param {number} zoom - Nivel de zoom (opcional)
   */
  const focusOnPOI = (poiId, zoom) => {
    const marker = getMarkerById(poiId);
    if (marker && mapRef.value) {
      const latLng = marker.getLatLng();
      if (zoom) {
        mapRef.value.setView(latLng, zoom);
      } else {
        mapRef.value.panTo(latLng);
      }
      marker.openTooltip();
    }
  };

  return {
    poiMarkers,
    createPOIMarkers,
    clearPOIMarkers,
    getMarkerById,
    highlightPOI,
    unhighlightPOI,
    focusOnPOI,
  };
};
