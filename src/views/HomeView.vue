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
import { useGeolocation } from '@/composables/useGeolocation';
import { useGamePersistence } from '@/composables/useGamePersistence';
import { deleteSavedGame } from '@/services/gameDatabase';

const gameStore = useGameStore();
const mapStore = useMapStore();
const { requestLocation } = useGeolocation();
const { loadGame, setupAutoSave } = useGamePersistence();

// Configurar guardado automático al montar el componente
onMounted(() => {
  setupAutoSave();
});

const handleStartGame = async () => {
  // Resetear el estado del juego y mapa
  gameStore.resetGame();
  mapStore.resetMap();
  
  // Eliminar partida guardada anterior
  await deleteSavedGame();
};

const handleContinueGame = async () => {
  const loaded = await loadGame();
  if (loaded && mapStore.baseConfirmed) {
    // Guardar la posición del marcador y el estado de confirmación
    const savedMarker = mapStore.marker;
    const wasConfirmed = mapStore.baseConfirmed;
    
    // Ocultar marcador y desconfirmar temporalmente (para que no aparezca el radar)
    mapStore.marker = null;
    mapStore.baseConfirmed = false;
    
    // Iniciar el vuelo hacia la base
    if (savedMarker) {
      mapStore.centerOnLocation(savedMarker, 16);
      
      // Mostrar la base después del vuelo (mismo timing que handleLocationSelected)
      setTimeout(() => {
        mapStore.marker = savedMarker;
        // Confirmar la base para que aparezca el radar
        if (wasConfirmed) {
          mapStore.baseConfirmed = true;
        }
      }, 1700);
    }
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