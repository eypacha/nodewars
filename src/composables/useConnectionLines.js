/**
 * Composable para gestionar líneas de conexión en el mapa
 * Maneja la creación y actualización de líneas entre marcadores y POIs
 */
import { ref } from 'vue';
import L from 'leaflet';

export const useConnectionLines = (mapRef, markerRef) => {
  const connectionLineRef = ref(null);
  const ownedConnectionLines = ref([]);

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

  /**
   * Crea líneas permanentes para todos los POIs owned
   * @param {Array} pois - Array de todos los POIs
   */
  const createOwnedConnectionLines = (pois) => {
    if (!mapRef.value || !markerRef.value) return;
    
    // Eliminar líneas anteriores
    removeOwnedConnectionLines();
    
    const markerPosition = markerRef.value.getLatLng();
    
    // Crear línea para cada POI owned
    pois.filter(poi => poi.owned).forEach(poi => {
      const poiPosition = [poi.lat, poi.lng];
      
      const line = L.polyline(
        [[markerPosition.lat, markerPosition.lng], poiPosition],
        {
          color: poi.color,
          weight: 2,
          opacity: 0.8,
          // Línea sólida (sin dashArray)
          className: 'poi-owned-connection-line'
        }
      ).addTo(mapRef.value);
      
      ownedConnectionLines.value.push({
        id: poi.id,
        line
      });
    });
  };

  /**
   * Actualiza todas las líneas de POIs owned
   * @param {Array} pois - Array de todos los POIs
   */
  const updateOwnedConnectionLines = (pois) => {
    if (!markerRef.value) return;
    
    const markerPosition = markerRef.value.getLatLng();
    
    ownedConnectionLines.value.forEach(({ id, line }) => {
      const poi = pois.find(p => p.id === id);
      if (poi) {
        const poiPosition = [poi.lat, poi.lng];
        line.setLatLngs([[markerPosition.lat, markerPosition.lng], poiPosition]);
      }
    });
  };

  /**
   * Elimina todas las líneas de POIs owned
   */
  const removeOwnedConnectionLines = () => {
    ownedConnectionLines.value.forEach(({ line }) => {
      line.remove();
    });
    ownedConnectionLines.value = [];
  };

  return {
    connectionLineRef,
    ownedConnectionLines,
    createConnectionLine,
    removeConnectionLine,
    updateConnectionLine,
    createOwnedConnectionLines,
    updateOwnedConnectionLines,
    removeOwnedConnectionLines,
  };
};
