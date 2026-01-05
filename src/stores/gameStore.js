import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGameStore = defineStore('game', () => {
  // Estado de los popups
  const showStartPopup = ref(true);
  const showLocationPopup = ref(false);
  const resources = ref({
    food: 0,
    pharmacy: 0,
    fuel: 0,
    bank: 0,
  });

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

  const addResource = (resourceType) => {
    if (resources.value.hasOwnProperty(resourceType)) {
      resources.value[resourceType] += 1;
    }
  };

  return {
    // State
    showStartPopup,
    showLocationPopup,
    resources,

    // Actions
    startGame,
    showLocationError,
    retryLocationPermission,
    addResource,
  };
});
