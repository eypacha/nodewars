<template>
  <div class="w-full h-[100vh] overflow-hidden relative">
    <div id="map" class="w-full h-[calc(100vh+30px)] z-0"></div>
    <MarkerConfirmDialog 
      v-if="showMarkerDialog && markerScreenPosition" 
      :style="{ position: 'absolute', left: markerScreenPosition.x + 'px', top: (markerScreenPosition.y - 50) + 'px', transform: 'translate(-50%, -100%)', zIndex: 1000 }"
      @confirm="handleConfirmMarker" 
    />
  </div>
</template>

<script setup>
import { onMounted, watch, ref, createApp, nextTick, computed } from 'vue';
import { storeToRefs } from 'pinia';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapStore } from '@/stores/mapStore';
import BaseMarker from './BaseMarker.vue';
import MarkerConfirmDialog from './MarkerConfirmDialog.vue';

const mapStore = useMapStore();
const { center, zoom, marker, showMarkerDialog, baseConfirmed } = storeToRefs(mapStore);

const mapRef = ref(null);
const markerRef = ref(null);
const markerScreenPosition = ref(null);
const radarRef = ref(null);
const RADAR_RADIUS_METERS = 1000;
const RADAR_COLOR = '#00bcff';

const updateMarkerScreenPosition = () => {
  if (mapRef.value && markerRef.value) {
    const point = mapRef.value.latLngToContainerPoint(markerRef.value.getLatLng());
    markerScreenPosition.value = { x: point.x, y: point.y };
  }
};

const handleConfirmMarker = () => {
  mapStore.confirmBase();
  // Deshabilitar el arrastre del marcador
  if (markerRef.value) {
    markerRef.value.dragging.disable();
  }
};

onMounted(() => {
  mapRef.value = L.map('map').setView(center.value, zoom.value);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(mapRef.value);

  // Actualizar posición del diálogo cuando el mapa se mueve
  mapRef.value.on('move', updateMarkerScreenPosition);
  mapRef.value.on('zoom', updateMarkerScreenPosition);
});

watch([center, zoom], ([newCenter, newZoom]) => {
  if (mapRef.value) {
    mapRef.value.flyTo(newCenter, newZoom, { animate: true, duration: 1.5 });
  }
});

watch(marker, async (newMarker) => {
  if (markerRef.value) {
    markerRef.value.remove();
    markerRef.value = null;
  }
  if (radarRef.value) {
    radarRef.value.remove();
    radarRef.value = null;
  }
  if (mapRef.value && newMarker) {
    // Crear el marcador simple sin el diálogo
    const container = document.createElement('div');
    const app = createApp(BaseMarker, { showDialog: false });
    app.mount(container);
    
    const customIcon = L.divIcon({
      html: container.innerHTML,
      className: 'custom-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
    
    // Hacer el marcador arrastrable
    markerRef.value = L.marker(newMarker, { 
      icon: customIcon,
      draggable: true 
    }).addTo(mapRef.value);
    
    // Actualizar la posición en el store cuando se arrastra
    markerRef.value.on('dragend', () => {
      const newPos = markerRef.value.getLatLng();
      mapStore.updateMarkerPosition([newPos.lat, newPos.lng]);
      updateMarkerScreenPosition();
      // Mover el radar junto con el marcador
      if (radarRef.value) {
        radarRef.value.setLatLng(newPos);
      }
    });
    
    // Actualizar posición del diálogo durante el arrastre
    markerRef.value.on('drag', () => {
      updateMarkerScreenPosition();
      if (radarRef.value) {
        radarRef.value.setLatLng(markerRef.value.getLatLng());
      }
    });
    
    app.unmount();
    
    // Dibujar el radar solo si la base está confirmada
    if (baseConfirmed.value) {
      radarRef.value = L.circle(newMarker, {
        color: RADAR_COLOR,
        fillColor: RADAR_COLOR,
        fillOpacity: 0.9,
        radius: RADAR_RADIUS_METERS,
        weight: 2,
      }).addTo(mapRef.value);
    }
    
    // Actualizar posición del diálogo
    await nextTick();
    updateMarkerScreenPosition();
  }
});

// Si se confirma la base después de que ya hay marcador, dibujar el radar
watch(baseConfirmed, (confirmed) => {
  if (confirmed && mapRef.value && markerRef.value && !radarRef.value) {
    radarRef.value = L.circle(markerRef.value.getLatLng(), {
      color: RADAR_COLOR,
      fillColor: RADAR_COLOR,
      fillOpacity: 0.1,
      radius: RADAR_RADIUS_METERS,
      weight: 2,
    }).addTo(mapRef.value);
  }
  if (!confirmed && radarRef.value) {
    radarRef.value.remove();
    radarRef.value = null;
  }
});

watch(showMarkerDialog, () => {
  if (showMarkerDialog.value) {
    updateMarkerScreenPosition();
  }
});
</script>