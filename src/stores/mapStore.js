import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useMapStore = defineStore('map', () => {
  // Estado del mapa
  const center = ref([20, 0]);
  const zoom = ref(3);
  const marker = ref(null);

  // Acciones
  const setCenter = (newCenter) => {
    center.value = newCenter;
  };

  const setZoom = (newZoom) => {
    zoom.value = newZoom;
  };

  const setMarker = (newMarker) => {
    marker.value = newMarker;
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

    // Actions
    setCenter,
    setZoom,
    setMarker,
    centerOnLocation,
  };
});
