import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useMapStore = defineStore('map', () => {
  // Estado del mapa
  const center = ref([20, 0]);
  const zoom = ref(3);
  const marker = ref(null);
  const baseConfirmed = ref(false);
  const showUpgradesPanel = ref(false);
  const coverageMetrics = ref({ perimeter: 0, area: 0 });
  
  // Sistema centralizado de diálogos - solo uno puede estar activo a la vez
  const activeDialog = ref(null); // 'markerConfirm' | 'baseMarker' | null (POI se maneja en poiStore)

  // Persistencia
  const saveMapState = () => {
    const state = {
      center: center.value,
      zoom: zoom.value,
      marker: marker.value,
      baseConfirmed: baseConfirmed.value,
    };
    localStorage.setItem('nodewars-map-state', JSON.stringify(state));
    console.log('Map state saved:', state);
  };

  const loadMapState = () => {
    const saved = localStorage.getItem('nodewars-map-state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        center.value = state.center;
        zoom.value = state.zoom;
        // No setear baseConfirmed ni marker aquí, se harán después del flyTo
        console.log('Map state loaded:', state);
        return state; // Devolver el state completo
      } catch (error) {
        console.error('Error loading map state:', error);
        return null;
      }
    }
    return null;
  };

  const hasSavedGame = () => {
    return localStorage.getItem('nodewars-map-state') !== null;
  };

  const clearSavedGame = () => {
    localStorage.removeItem('nodewars-map-state');
    console.log('Saved game cleared');
  };

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
    saveMapState();
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
    coverageMetrics.value = { perimeter: 0, area: 0 };
  };

  const setCoverageMetrics = (perimeter = 0, area = 0) => {
    const safePerimeter = Number.isFinite(perimeter) ? perimeter : 0;
    const safeArea = Number.isFinite(area) ? area : 0;
    coverageMetrics.value = { perimeter: safePerimeter, area: safeArea };
  };

  return {
    // State
    center,
    zoom,
    marker,
    activeDialog,
    baseConfirmed,
    showUpgradesPanel,
    coverageMetrics,

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
    saveMapState,
    loadMapState,
    hasSavedGame,
    clearSavedGame,
    setCoverageMetrics,
  };
});
