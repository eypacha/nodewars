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
   * @param {Function} cancelAttack - Callback para cancelar ataques
   */
  const closePOIDialog = (removeConnectionLine, cancelAttack) => {
    poiStore.closePOIDialog();
    if (removeConnectionLine) removeConnectionLine();
    if (cancelAttack) cancelAttack();
  };

  /**
   * Maneja clics en el mapa para cerrar diálogos
   */
  const handleMapClick = () => {
    if (poiStore.showPOIDialog) {
      poiStore.closePOIDialog();
    }
    // Cerrar todos los diálogos del mapa
    mapStore.closeAllDialogs();
  };

  return {
    closePOIDialog,
    handleMapClick,
  };
};
