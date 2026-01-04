import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGameStore = defineStore('game', () => {
  // Estado de los popups
  const showStartPopup = ref(true);
  const showLocationPopup = ref(false);

  // Acciones
  const startGame = () => {
    showStartPopup.value = false;
  };

  const showLocationError = () => {
    showLocationPopup.value = true;
  };

  const retryLocationPermission = () => {
    showLocationPopup.value = false;
    showStartPopup.value = true;
  };

  return {
    // State
    showStartPopup,
    showLocationPopup,

    // Actions
    startGame,
    showLocationError,
    retryLocationPermission,
  };
});
