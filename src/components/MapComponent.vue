<template>
    <div class="w-full h-[100vh] overflow-hidden">
        <div id="map" class="w-full h-[calc(100vh+30px)] z-0"></div>
    </div>
</template>

<script setup>
import { onMounted } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

onMounted(() => {
  const map = L.map('map').setView([20, 0], 3);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

 
});
</script>