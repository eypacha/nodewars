import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useMapStore = defineStore('map', () => {
  // Estado del mapa
  const center = ref([20, 0]);
  const zoom = ref(3);
  const marker = ref(null);
  const baseConfirmed = ref(false);
  const showUpgradesPanel = ref(false);
  
  // Sistema centralizado de diálogos - solo uno puede estar activo a la vez
  const activeDialog = ref(null); // 'markerConfirm' | 'baseMarker' | null (POI se maneja en poiStore)

  // Acciones
  const setCenter = (newCenter) => {
    center.value = newCenter;
  };

  const setZoom = (newZoom) => {
    zoom.value = newZoom;
  };

  const setMarker = (newMarker) => {
    marker.value = newMarker;
    if (newMarker) {
      activeDialog.value = 'markerConfirm';
    }
  };

  const updateMarkerPosition = (newPosition) => {
    marker.value = newPosition;
  };

  const closeAllDialogs = () => {
    activeDialog.value = null;
  };

  const confirmBase = () => {
    baseConfirmed.value = true;
    closeAllDialogs();
  };

  const openBaseMarkerDialog = () => {
    activeDialog.value = 'baseMarker';
  };

  const closeBaseMarkerDialog = () => {
    if (activeDialog.value === 'baseMarker') {
      activeDialog.value = null;
    }
  };

  const openUpgradesPanel = () => {
    // Cerrar todos los diálogos antes de abrir el panel de upgrades
    activeDialog.value = null;
    showUpgradesPanel.value = true;
  };

  const closeUpgradesPanel = () => {
    showUpgradesPanel.value = false;
  };

  const centerOnLocation = (location, targetZoom = 15) => {
    center.value = location;
    zoom.value = targetZoom;
  };

  const resetMap = () => {
    center.value = [20, 0];
    zoom.value = 3;
    marker.value = null;
    baseConfirmed.value = false;
    showUpgradesPanel.value = false;
    activeDialog.value = null;
  };

  return {
    // State
    center,
    zoom,
    marker,
    activeDialog,
    baseConfirmed,
    showUpgradesPanel,

    // Actions
    setCenter,
    setZoom,
    setMarker,
    updateMarkerPosition,
    closeAllDialogs,
    confirmBase,
    centerOnLocation,
    openBaseMarkerDialog,
    closeBaseMarkerDialog,
    openUpgradesPanel,
    closeUpgradesPanel,
    resetMap,
  };
});
