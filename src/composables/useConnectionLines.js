/**
 * Composable para gestionar líneas de conexión en el mapa
 * Maneja la creación y actualización de líneas entre marcadores y POIs
 */
import { ref } from 'vue';
import L from 'leaflet';

export const useConnectionLines = (mapRef, markerRef) => {
  const connectionLineRef = ref(null);

  /**
   * Crea línea de conexión entre el marcador base y un POI
   * @param {Object} poi - POI con lat, lng y color
   */
  const createConnectionLine = (poi) => {
    if (!mapRef.value || !markerRef.value || !poi) return;
    
    // Eliminar línea anterior si existe
    removeConnectionLine();
    
    const markerPosition = markerRef.value.getLatLng();
    const poiPosition = [poi.lat, poi.lng];
    
    // Crear línea punteada con el color de la categoría del POI
    connectionLineRef.value = L.polyline(
      [[markerPosition.lat, markerPosition.lng], poiPosition],
      {
        color: poi.color,
        weight: 2,
        opacity: 0.6,
        dashArray: '10, 5',
        className: 'poi-connection-line'
      }
    ).addTo(mapRef.value);
  };

  /**
   * Elimina la línea de conexión
   */
  const removeConnectionLine = () => {
    if (connectionLineRef.value) {
      connectionLineRef.value.remove();
      connectionLineRef.value = null;
    }
  };

  /**
   * Actualiza la línea de conexión cuando el mapa se mueve
   * @param {Object} poi - POI actual
   */
  const updateConnectionLine = (poi) => {
    if (connectionLineRef.value && markerRef.value && poi) {
      const markerPosition = markerRef.value.getLatLng();
      const poiPosition = [poi.lat, poi.lng];
      connectionLineRef.value.setLatLngs([[markerPosition.lat, markerPosition.lng], poiPosition]);
    }
  };

  return {
    connectionLineRef,
    createConnectionLine,
    removeConnectionLine,
    updateConnectionLine,
  };
};
