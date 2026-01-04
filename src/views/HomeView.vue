<template>
  <div class="w-screen h-screen overflow-hidden bg-map text-white">
    <MapComponent />
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

const startGame = () => {
  showStartPopup.value = false;
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Ubicación obtenida:', position.coords);
        // Aquí puedes guardar la ubicación o iniciar el juego con ella
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