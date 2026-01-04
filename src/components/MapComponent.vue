<template>
    <div class="w-full h-[100vh] overflow-hidden">
        <div id="map" class="w-full h-[calc(100vh+30px)] z-0"></div>
    </div>
</template>

<script setup>
import { onMounted, defineProps, watch, ref, defineExpose, nextTick } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const props = defineProps({
  center: {
    type: Array,
    default: () => [20, 0]
  },
  zoom: {
    type: Number,
    default: 3
  },
  marker: {
    type: Array,
    default: null
  }
});

const mapRef = ref(null);
const markerRef = ref(null);

onMounted(() => {
  mapRef.value = L.map('map').setView(props.center, props.zoom);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(mapRef.value);
});

watch(() => [props.center, props.zoom], async ([newCenter, newZoom]) => {
  if (mapRef.value) {
    mapRef.value.flyTo(newCenter, newZoom, { animate: true, duration: 1.5 });
  }
});

watch(() => props.marker, async (newMarker) => {
  if (markerRef.value) {
    markerRef.value.remove();
    markerRef.value = null;
  }
  if (mapRef.value && newMarker) {
    await nextTick();
    markerRef.value = L.marker(newMarker).addTo(mapRef.value);
  }
});

defineExpose({
  flyTo: (latlng, zoom = 15) => {
    if (mapRef.value) {
      mapRef.value.flyTo(latlng, zoom, { animate: true, duration: 1.5 });
    }
  },
  setMarker: (latlng) => {
    if (markerRef.value) {
      markerRef.value.remove();
      markerRef.value = null;
    }
    if (mapRef.value && latlng) {
      markerRef.value = L.marker(latlng).addTo(mapRef.value);
    }
  }
});
</script>