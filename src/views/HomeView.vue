<template>
  <div class="w-screen h-screen overflow-hidden bg-map text-white">
    <GameHUD v-if="baseConfirmed" />
    <MapComponent />
    <GameStartPopup 
      v-if="gameStore.showStartPopup" 
      @start-game="handleStartGame"
      @continue-game="handleContinueGame"
    />
    <GameOverPopup
      v-if="gameStore.showGameOverPopup"
      @restart="handleGameOverRestart"
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
import { storeToRefs } from 'pinia';
import MapComponent from '../components/MapComponent.vue';
import GameHUD from '../components/GameHUD.vue';
import GameStartPopup from '../components/GameStartPopup.vue';
import GameOverPopup from '../components/GameOverPopup.vue';
import BaseLocationPopup from '../components/BaseLocationPopup.vue';
import LocationRequiredPopup from '../components/LocationRequiredPopup.vue';
import { useGameStore } from '@/stores/gameStore';
import { useMapStore } from '@/stores/mapStore';
import { usePoiStore } from '@/stores/poiStore';
import { useGeolocation } from '@/composables/useGeolocation';
import { wipeDatabase } from '@/services/dbService';

const gameStore = useGameStore();
const mapStore = useMapStore();
const poiStore = usePoiStore();
const { baseConfirmed } = storeToRefs(mapStore);
const { requestLocation } = useGeolocation();

const handleStartGame = async () => {
  // Resetear el estado del juego, mapa y POIs
  gameStore.resetGame();
  mapStore.resetMap();
  poiStore.resetPOIs();
  mapStore.clearSavedGame();
};

const handleGameOverRestart = async () => {
  mapStore.clearSavedGame();
  await wipeDatabase();
  window.location.reload();
};

const handleContinueGame = async () => {
  // Cargar el estado guardado del mapa
  const savedState = mapStore.loadMapState();
  if (savedState) {
    // Si hay base confirmada, saltar directamente al mapa
    if (savedState.baseConfirmed) {
      gameStore.continueGame();
      // Mostrar el marker, confirmar base y cargar POIs después del flyTo
      setTimeout(async () => {
        if (savedState.marker) {
          mapStore.setMarker(savedState.marker);
        }
        mapStore.confirmBase(); // Esto setea baseConfirmed y guarda
        // Pequeño delay adicional para asegurar que el mapa esté listo
        setTimeout(async () => {
          await poiStore.loadPOIs(); // Cargar POIs desde DB después del flyTo
        }, 100);
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
