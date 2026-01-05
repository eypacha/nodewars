<template>
  <div class="w-full h-[100vh] overflow-hidden relative">
    <div id="map" class="w-full h-[calc(100vh+30px)] z-0"></div>
    <MarkerConfirmDialog 
      v-if="showMarkerDialog && markerScreenPosition" 
      :style="dialogStyle"
      @confirm="handleConfirmMarker" 
    />
    <POIDialog
      v-if="showPOIDialog && selectedPOI && poiScreenPosition"
      :style="poiDialogStyle"
      :poi="selectedPOI"
      @close="handleClosePOIDialog"
    />
  </div>
</template>

<script setup>
import { onMounted, watch, ref, nextTick, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useMapStore } from '@/stores/mapStore';
import { usePoiStore } from '@/stores/poiStore';
import { useLeafletMap } from '@/composables/useLeafletMap';
import { useMapMarker } from '@/composables/useMapMarker';
import { useRadar } from '@/composables/useRadar';
import { usePointsOfInterest } from '@/composables/usePointsOfInterest';
import { getScreenPosition, createOverlayStyle } from '@/utils/mapHelpers';
import { getRadarConfig } from '@/services/mapService';
import BaseMarker from './BaseMarker.vue';
import MarkerConfirmDialog from './MarkerConfirmDialog.vue';
import POIDialog from './POIDialog.vue';

const mapStore = useMapStore();
const poiStore = usePoiStore();
const { center, zoom, marker, showMarkerDialog, baseConfirmed } = storeToRefs(mapStore);
const { selectedPOI, showPOIDialog } = storeToRefs(poiStore);

// Inicializar composables
const { mapRef, initMap, flyTo, on } = useLeafletMap('map', center.value, zoom.value);
const { markerRef, createMarker, disableDragging, removeMarker, on: onMarker } = useMapMarker(mapRef);
const { radarRef, createRadar, updatePosition: updateRadarPosition, removeRadar } = useRadar(mapRef);
const { clearPOIMarkers } = usePointsOfInterest(mapRef);

const markerScreenPosition = ref(null);
const poiScreenPosition = ref(null);

// Calcular posición en pantalla del marcador
const updateMarkerScreenPosition = () => {
  if (!mapRef.value || !markerRef.value) return;
  markerScreenPosition.value = getScreenPosition(mapRef.value, markerRef.value.getLatLng());
};

// Calcular posición en pantalla del POI seleccionado
const updatePOIScreenPosition = () => {
  if (!mapRef.value || !selectedPOI.value) return;
  poiScreenPosition.value = getScreenPosition(mapRef.value, [selectedPOI.value.lat, selectedPOI.value.lng]);
};

// Estilo del diálogo de confirmación
const dialogStyle = computed(() => {
  if (!markerScreenPosition.value) return {};
  return createOverlayStyle(markerScreenPosition.value);
});

// Estilo del diálogo de POI
const poiDialogStyle = computed(() => {
  if (!poiScreenPosition.value) return {};
  return createOverlayStyle(poiScreenPosition.value);
});

// Manejar confirmación del marcador
const handleConfirmMarker = () => {
  mapStore.confirmBase();
  disableDragging();
};

// Manejar cierre del diálogo de POI
const handleClosePOIDialog = () => {
  poiStore.closePOIDialog();
};

// Manejar arrastre del marcador
const handleMarkerDragEnd = () => {
  const position = markerRef.value.getLatLng();
  mapStore.updateMarkerPosition([position.lat, position.lng]);
  updateMarkerScreenPosition();
  updateRadarPosition([position.lat, position.lng]);
};

const handleMarkerDrag = () => {
  updateMarkerScreenPosition();
  if (markerRef.value) {
    updateRadarPosition(markerRef.value.getLatLng());
  }
};

// Inicializar mapa
onMounted(() => {
  initMap();
  on('move', updateMarkerScreenPosition);
  on('zoom', updateMarkerScreenPosition);
  on('move', updatePOIScreenPosition);
  on('zoom', updatePOIScreenPosition);
});

// Observar cambios de centro y zoom
watch([center, zoom], ([newCenter, newZoom]) => {
  flyTo(newCenter, newZoom);
});

// Observar cambios del marcador
watch(marker, async (newMarker) => {
  removeMarker();
  removeRadar();
  
  if (mapRef.value && newMarker) {
    // Crear el marcador
    createMarker(newMarker, BaseMarker, {
      draggable: true,
      componentProps: { showDialog: false },
    });
    
    // Añadir eventos al marcador
    onMarker('dragend', handleMarkerDragEnd);
    onMarker('drag', handleMarkerDrag);
    
    // Crear el radar si la base está confirmada
    if (baseConfirmed.value) {
      createRadar(newMarker);
    }
    
    // Actualizar posición del diálogo
    await nextTick();
    updateMarkerScreenPosition();
  }
});

// Observar confirmación de la base
watch(baseConfirmed, async (confirmed) => {
  if (confirmed && markerRef.value) {
    const position = markerRef.value.getLatLng();
    createRadar(position);
    
    // Obtener el radio del radar de la configuración
    const radarConfig = getRadarConfig();
    
    // Cargar puntos de interés dentro del radio del radar
    await poiStore.fetchPOIs(
      { lat: position.lat, lng: position.lng },
      radarConfig.radius
    );
  } else {
    removeRadar();
    // Limpiar POIs cuando se oculta el radar
    poiStore.clearPOIs();
    clearPOIMarkers();
  }
});

// Observar visibilidad del diálogo
watch(showMarkerDialog, (visible) => {
  if (visible) {
   

// Observar cambios en el POI seleccionado
watch(selectedPOI, (poi) => {
  if (poi) {
    updatePOIScreenPosition();
  }
});

// Actualizar posición del diálogo de POI cuando el mapa se mueve
watch(showPOIDialog, (visible) => {
  if (visible) {
    updatePOIScreenPosition();
  }
}); updateMarkerScreenPosition();
  }
});
</script>

<style scoped>
/* Estilos para los marcadores POI */
:deep(.poi-marker) {
  cursor: pointer;
  transition: all 0.2s ease;
}

:deep(.poi-marker:hover) {
  filter: brightness(1.2);
}
</style>