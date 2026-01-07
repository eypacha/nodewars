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
import { useGamePersistence } from '@/composables/useGamePersistence';
import { deleteSavedGame } from '@/services/gameDatabase';

const gameStore = useGameStore();
const mapStore = useMapStore();
const poiStore = usePoiStore();
const { requestLocation } = useGeolocation();
const { loadGame, setupAutoSave } = useGamePersistence();

// Configurar guardado automático al montar el componente
onMounted(() => {
  setupAutoSave();
});

const handleStartGame = async () => {
  // Resetear el estado del juego, mapa y POIs
  gameStore.resetGame();
  mapStore.resetMap();
  poiStore.resetPOIs();
  
  // Eliminar partida guardada anterior
  await deleteSavedGame();
};

const handleContinueGame = async () => {
  console.log('🎮 Continue game clicked');
  const result = await loadGame();
  console.log('📥 Game loaded:', result);
  
  if (result?.success) {
    // Guardar los POIs temporalmente antes de limpiarlos
    const savedPois = [...poiStore.pois];
    console.log('💾 Saved POIs temporarily:', savedPois.length);
    
    // Limpiar POIs del store para que no se vean durante el vuelo
    poiStore.pois = [];
    
    // Usar un pequeño delay para asegurar que los stores están completamente actualizados
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (result.baseConfirmed) {
      // Guardar la posición del marcador
      const savedMarker = mapStore.marker;
      
      // Ocultar marcador temporalmente (para que no aparezca el radar)
      mapStore.marker = null;
      
      // Iniciar el vuelo hacia la base
      if (savedMarker) {
        mapStore.centerOnLocation(savedMarker, 16);
        
        // Mostrar la base y POIs después del vuelo (mismo timing que handleLocationSelected)
        setTimeout(() => {
          mapStore.marker = savedMarker;
          // Confirmar la base para que aparezca el radar
          mapStore.baseConfirmed = true;
          
          // Restaurar POIs después de que la base aparezca
          setTimeout(() => {
            poiStore.pois = savedPois;
            console.log('🎯 Base confirmed and POIs restored:', poiStore.pois.length);
          }, 100);
        }, 1700);
      }
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