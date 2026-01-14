/**
 * Composable para gestionar diálogos del mapa
 * Coordina la apertura y cierre de diálogos relacionados con el mapa
 */
import { useMapStore } from '@/stores/mapStore';
import { usePoiStore } from '@/stores/poiStore';

export const useMapDialogs = () => {
  const mapStore = useMapStore();
  const poiStore = usePoiStore();

  /**
   * Cierra el diálogo de POI y limpia recursos relacionados
   * @param {Function} removeConnectionLine - Callback para eliminar líneas
   */
  const closePOIDialog = (removeConnectionLine) => {
    poiStore.closePOIDialog();
    if (removeConnectionLine) removeConnectionLine();
  };

  /**
   * Maneja clics en el mapa para cerrar diálogos
   */
  const handleMapClick = () => {
    if (poiStore.showPOIDialog) {
      poiStore.closePOIDialog();
    }
    if (poiStore.showPoiUpgradesPanel) {
      poiStore.closePoiUpgradesPanel();
    }
    
    if (mapStore.activeDialog !== 'markerConfirm') {
      mapStore.closeAllDialogs();
    }
  };

  return {
    closePOIDialog,
    handleMapClick,
  };
};
