<template>
  <div class="w-screen h-screen overflow-hidden bg-map text-white">
    <MapComponent />
    <GameStartPopup v-if="gameStore.showStartPopup" @start-game="handleStartGame" />
    <LocationRequiredPopup v-if="gameStore.showLocationPopup" @retry="gameStore.retryLocationPermission" />
  </div>
</template>

<script setup>
import MapComponent from '../components/MapComponent.vue';
import GameStartPopup from '../components/GameStartPopup.vue';
import LocationRequiredPopup from '../components/LocationRequiredPopup.vue';
import { useGameStore } from '@/stores/gameStore';
import { useGeolocation } from '@/composables/useGeolocation';

const gameStore = useGameStore();
const { requestLocation } = useGeolocation();

const handleStartGame = async () => {
  gameStore.startGame();
  
  try {
    await requestLocation();
  } catch (error) {
    console.error('Error al obtener ubicación:', error);
  }
};
</script>