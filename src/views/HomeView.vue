<template>
  <div class="w-screen h-screen overflow-hidden bg-map text-white">
    <MapComponent 
      :center="mapCenter" 
      :zoom="mapZoom" 
      :marker="marker"
      ref="mapRef"
    />
    <GameStartPopup v-if="showStartPopup" @start-game="startGame" />
    <LocationRequiredPopup v-if="showLocationPopup" @retry="retryLocation" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import MapComponent from '../components/MapComponent.vue';
import GameStartPopup from '../components/GameStartPopup.vue';
import LocationRequiredPopup from '../components/LocationRequiredPopup.vue';

const showStartPopup = ref(true);
const showLocationPopup = ref(false);

const mapCenter = ref([20, 0]);
const mapZoom = ref(3);
const mapRef = ref(null);
const marker = ref(null);

const startGame = () => {
  showStartPopup.value = false;
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        mapCenter.value = [latitude, longitude];
        mapZoom.value = 15;
        marker.value = null;
        if (mapRef.value && mapRef.value.flyTo) {
          mapRef.value.flyTo([latitude, longitude], 15);
        }
        setTimeout(() => {
          marker.value = [latitude, longitude];
        }, 1700); // 1.5s de animación + 200ms
      },
      (error) => {
        console.warn('Permiso de ubicación denegado o error:', error);
        showLocationPopup.value = true;
      }
    );
  } else {
    console.warn('Geolocalización no soportada');
    showLocationPopup.value = true;
  }
};

const retryLocation = () => {
  showLocationPopup.value = false;
  showStartPopup.value = true;
};
</script>