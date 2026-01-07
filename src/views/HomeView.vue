<template>
  <div class="w-screen h-screen overflow-hidden bg-map text-white">
    <MapComponent />
    <GameStartPopup 
      v-if="gameStore.showStartPopup" 
      @start-game="handleStartGame"
      @continue-game="handleContinueGame"
    />
    <BaseLocationPopup 
      v-if="gameStore.showBaseLocationPopup" 
      @location-selected="handleLocationSelected" 
      @use-gps="handleUseGPS"
    />
    <LocationRequiredPopup v-if="gameStore.showLocationPopup" @back="gameStore.goBackToLocationSelect" />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import MapComponent from '../components/MapComponent.vue';
import GameStartPopup from '../components/GameStartPopup.vue';
import BaseLocationPopup from '../components/BaseLocationPopup.vue';
import LocationRequiredPopup from '../components/LocationRequiredPopup.vue';
import { useGameStore } from '@/stores/gameStore';
import { useMapStore } from '@/stores/mapStore';
import { usePoiStore } from '@/stores/poiStore';
import { useGeolocation } from '@/composables/useGeolocation';

const gameStore = useGameStore();
const mapStore = useMapStore();
const poiStore = usePoiStore();
const { requestLocation } = useGeolocation();

const handleStartGame = async () => {
  // Resetear el estado del juego, mapa y POIs
  gameStore.resetGame();
  mapStore.resetMap();
  poiStore.resetPOIs();
  mapStore.clearSavedGame();
};

const handleContinueGame = async () => {
  // Cargar el estado guardado del mapa
  const savedState = mapStore.loadMapState();
  if (savedState) {
    // Si hay base confirmada, saltar directamente al mapa
    if (savedState.baseConfirmed) {
      gameStore.continueGame();
      poiStore.resetPOIs(); // Resetear POIs pero mantener mapa y base
      // Mostrar el marker y confirmar base después del flyTo
      setTimeout(() => {
        if (savedState.marker) {
          mapStore.setMarker(savedState.marker);
        }
        mapStore.confirmBase(); // Esto setea baseConfirmed y guarda
      }, 1700);
    } else {
      // Si no hay base, mostrar el popup de base location
      gameStore.startGame();
      poiStore.resetPOIs();
    }
  } else {
    // Si no se pudo cargar, hacer lo mismo que start
    handleStartGame();
  }
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