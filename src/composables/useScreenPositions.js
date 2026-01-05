/**
 * Composable para gestionar posiciones en pantalla
 * Calcula y actualiza posiciones de elementos sobre el mapa
 */
import { ref, computed } from 'vue';
import { getScreenPosition, createOverlayStyle } from '@/utils/mapHelpers';

export const useScreenPositions = (mapRef, markerRef) => {
  const markerScreenPosition = ref(null);
  const poiScreenPosition = ref(null);

  /**
   * Actualiza la posición en pantalla del marcador
   */
  const updateMarkerScreenPosition = () => {
    if (!mapRef.value || !markerRef.value) return;
    markerScreenPosition.value = getScreenPosition(mapRef.value, markerRef.value.getLatLng());
  };

  /**
   * Actualiza la posición en pantalla de un POI
   * @param {Object} poi - POI con lat y lng
   */
  const updatePOIScreenPosition = (poi) => {
    if (!mapRef.value || !poi) return;
    poiScreenPosition.value = getScreenPosition(mapRef.value, [poi.lat, poi.lng]);
  };

  /**
   * Estilo del diálogo de confirmación del marcador
   */
  const dialogStyle = computed(() => {
    if (!markerScreenPosition.value) return {};
    return createOverlayStyle(markerScreenPosition.value);
  });

  /**
   * Estilo del diálogo de POI
   */
  const poiDialogStyle = computed(() => {
    if (!poiScreenPosition.value) return {};
    return createOverlayStyle(poiScreenPosition.value);
  });

  return {
    markerScreenPosition,
    poiScreenPosition,
    updateMarkerScreenPosition,
    updatePOIScreenPosition,
    dialogStyle,
    poiDialogStyle,
  };
};
