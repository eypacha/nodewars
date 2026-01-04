<template>
  <div class="w-full h-[100vh] overflow-hidden relative">
    <div id="map" class="w-full h-[calc(100vh+30px)] z-0"></div>
    <MarkerConfirmDialog 
      v-if="showMarkerDialog && markerScreenPosition" 
      :style="dialogStyle"
      @confirm="handleConfirmMarker" 
    />
  </div>
</template>

<script setup>
import { onMounted, watch, ref, nextTick, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useMapStore } from '@/stores/mapStore';
import { useLeafletMap } from '@/composables/useLeafletMap';
import { useMapMarker } from '@/composables/useMapMarker';
import { useRadar } from '@/composables/useRadar';
import { getScreenPosition, createOverlayStyle } from '@/utils/mapHelpers';
import BaseMarker from './BaseMarker.vue';
import MarkerConfirmDialog from './MarkerConfirmDialog.vue';

const mapStore = useMapStore();
const { center, zoom, marker, showMarkerDialog, baseConfirmed } = storeToRefs(mapStore);

// Inicializar composables
const { mapRef, initMap, flyTo, on } = useLeafletMap('map', center.value, zoom.value);
const { markerRef, createMarker, disableDragging, removeMarker, on: onMarker } = useMapMarker(mapRef);
const { createRadar, updatePosition: updateRadarPosition, removeRadar } = useRadar(mapRef);

const markerScreenPosition = ref(null);

// Calcular posición en pantalla del marcador
const updateMarkerScreenPosition = () => {
  if (!mapRef.value || !markerRef.value) return;
  markerScreenPosition.value = getScreenPosition(mapRef.value, markerRef.value.getLatLng());
};

// Estilo del diálogo de confirmación
const dialogStyle = computed(() => {
  if (!markerScreenPosition.value) return {};
  return createOverlayStyle(markerScreenPosition.value);
});

// Manejar confirmación del marcador
const handleConfirmMarker = () => {
  mapStore.confirmBase();
  disableDragging();
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
watch(baseConfirmed, (confirmed) => {
  if (confirmed && markerRef.value) {
    createRadar(markerRef.value.getLatLng());
  } else {
    removeRadar();
  }
});

// Observar visibilidad del diálogo
watch(showMarkerDialog, (visible) => {
  if (visible) {
    updateMarkerScreenPosition();
  }
});
</script>