<template>
  <div class="w-screen h-screen overflow-hidden bg-map text-white">
    <MapComponent />
    <GameStartPopup v-if="gameStore.showStartPopup" @start-game="handleStartGame" />
    <BaseLocationPopup 
      v-if="gameStore.showBaseLocationPopup" 
      @location-selected="handleLocationSelected" 
      @use-gps="handleUseGPS"
    />
    <LocationRequiredPopup v-if="gameStore.showLocationPopup" @retry="gameStore.retryLocationPermission" />
  </div>
</template>

<script setup>
import MapComponent from '../components/MapComponent.vue';
import GameStartPopup from '../components/GameStartPopup.vue';
import BaseLocationPopup from '../components/BaseLocationPopup.vue';
import LocationRequiredPopup from '../components/LocationRequiredPopup.vue';
import { useGameStore } from '@/stores/gameStore';
import { useMapStore } from '@/stores/mapStore';
import { useGeolocation } from '@/composables/useGeolocation';

const gameStore = useGameStore();
const mapStore = useMapStore();
const { requestLocation } = useGeolocation();

const handleStartGame = () => {
  gameStore.startGame();
};

const handleLocationSelected = (location) => {
  gameStore.confirmBaseLocation();
  
  // Centrar mapa en la ubicación seleccionada
  const coords = [location.lat, location.lng];
  mapStore.centerOnLocation(coords, 16);
  
  // Mostrar marcador después de la animación
  setTimeout(() => {
    mapStore.setMarker(coords);
  }, 1700);
};

const handleUseGPS = async () => {
  gameStore.confirmBaseLocation();
  
  try {
    await requestLocation();
  } catch (error) {
    console.error('Error al obtener ubicación:', error);
  }
};
</script>