<template>
  <div class="w-full h-[100vh] overflow-hidden">
    <div id="map" class="w-full h-[calc(100vh+30px)] z-0"></div>
  </div>
</template>

<script setup>
import { onMounted, watch, ref } from 'vue';
import { storeToRefs } from 'pinia';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapStore } from '@/stores/mapStore';

const mapStore = useMapStore();
const { center, zoom, marker } = storeToRefs(mapStore);

const mapRef = ref(null);
const markerRef = ref(null);

onMounted(() => {
  mapRef.value = L.map('map').setView(center.value, zoom.value);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(mapRef.value);
});

watch([center, zoom], ([newCenter, newZoom]) => {
  if (mapRef.value) {
    mapRef.value.flyTo(newCenter, newZoom, { animate: true, duration: 1.5 });
  }
});

watch(marker, (newMarker) => {
  if (markerRef.value) {
    markerRef.value.remove();
    markerRef.value = null;
  }
  if (mapRef.value && newMarker) {
    markerRef.value = L.marker(newMarker).addTo(mapRef.value);
  }
});
</script>