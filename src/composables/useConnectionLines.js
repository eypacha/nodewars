/**
 * Composable para gestionar líneas de conexión en el mapa
 * Maneja la creación y actualización de líneas entre marcadores y POIs
 */
import { ref } from 'vue';
import L from 'leaflet';
import { getPOIColor } from '@/constants/poiTypes';

export const useConnectionLines = (mapRef, markerRef) => {
  const connectionLineRef = ref(null);
  const ownedConnectionLines = ref([]);
  const BARRACK_LINE_COLOR = getPOIColor('barrack');

  /**
   * Crea línea de conexión entre el marcador base y un POI
   * @param {Object} poi - POI con lat, lng y color
   * @param {Object} originPoint - Punto de origen alternativo (cuartel) - opcional
   */
  const createConnectionLine = (poi, originPoint = null) => {
    if (!mapRef.value || !markerRef.value || !poi) return;
    
    // Eliminar línea anterior si existe
    removeConnectionLine();
    
    // Usar el punto de origen alternativo si se proporciona, sino usar el marcador base
    const markerPosition = originPoint 
      ? L.latLng([originPoint.lat, originPoint.lng])
      : markerRef.value.getLatLng();
    const poiPosition = [poi.lat, poi.lng];
    
    // Determinar color: azul cian para cuarteles, color del POI para normales
    const lineColor = poi.type === 'barrack' ? BARRACK_LINE_COLOR : poi.color;
    
    // Crear línea punteada con el color de la categoría del POI
    connectionLineRef.value = L.polyline(
      [[markerPosition.lat, markerPosition.lng], poiPosition],
      {
        color: lineColor,
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
   * @param {Object} originPoint - Punto de origen alternativo (cuartel) - opcional
   */
  const updateConnectionLine = (poi, originPoint = null) => {
    if (connectionLineRef.value && markerRef.value && poi) {
      const markerPosition = originPoint 
        ? L.latLng([originPoint.lat, originPoint.lng])
        : markerRef.value.getLatLng();
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
    
    const baseMarkerPosition = markerRef.value.getLatLng();
    
    // Crear línea para cada POI owned
    pois.filter(poi => poi.owned).forEach(poi => {
      const poiPosition = [poi.lat, poi.lng];
      
      // Determinar el punto de origen: si fue conquistado desde un cuartel, encontrarlo
      let originPosition = baseMarkerPosition;
      if (poi.conqueredFrom) {
        // Buscar el cuartel desde el cual fue conquistado
        const barracks = pois.find(p => p.id === poi.conqueredFrom && p.type === 'barrack');
        if (barracks) {
          originPosition = L.latLng([barracks.lat, barracks.lng]);
        }
      }
      
      // Determinar color: azul cian para cuarteles, color del POI para normales
      const lineColor = poi.type === 'barrack' ? BARRACK_LINE_COLOR : poi.color;
      
      const line = L.polyline(
        [[originPosition.lat, originPosition.lng], poiPosition],
        {
          color: lineColor,
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
    
    const baseMarkerPosition = markerRef.value.getLatLng();
    
    ownedConnectionLines.value.forEach(({ id, line }) => {
      const poi = pois.find(p => p.id === id);
      if (poi) {
        const poiPosition = [poi.lat, poi.lng];
        
        // Determinar el punto de origen: si fue conquistado desde un cuartel, encontrarlo
        let originPosition = baseMarkerPosition;
        if (poi.conqueredFrom) {
          const barracks = pois.find(p => p.id === poi.conqueredFrom && p.type === 'barrack');
          if (barracks) {
            originPosition = L.latLng([barracks.lat, barracks.lng]);
          }
        }
        
        line.setLatLngs([[originPosition.lat, originPosition.lng], poiPosition]);
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
