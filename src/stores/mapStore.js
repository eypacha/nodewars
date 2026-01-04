import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useMapStore = defineStore('map', () => {
  // Estado del mapa
  const center = ref([20, 0]);
  const zoom = ref(3);
  const marker = ref(null);
  const showMarkerDialog = ref(false);
  const baseConfirmed = ref(false);

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
      showMarkerDialog.value = true;
    }
  };

  const updateMarkerPosition = (newPosition) => {
    marker.value = newPosition;
  };

  const hideMarkerDialog = () => {
    showMarkerDialog.value = false;
  };

  const confirmBase = () => {
    baseConfirmed.value = true;
    hideMarkerDialog();
  };

  const centerOnLocation = (location, targetZoom = 15) => {
    center.value = location;
    zoom.value = targetZoom;
  };

  return {
    // State
    center,
    zoom,
    marker,
    showMarkerDialog,
    baseConfirmed,

    // Actions
    setCenter,
    setZoom,
    setMarker,
    updateMarkerPosition,
    hideMarkerDialog,
    confirmBase,
    centerOnLocation,
  };
});
