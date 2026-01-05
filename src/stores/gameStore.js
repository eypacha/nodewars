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
    police: 0,
  });

  // Upgrades
  const radarLevel = ref(1);
  const radarUpgradeCosts = {
    2: 10,
    3: 25,
    4: 50,
    5: 100,
  };

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

  const upgradeRadar = () => {
    const nextLevel = radarLevel.value + 1;
    const cost = radarUpgradeCosts[nextLevel];
    
    if (!cost) return false; // Max level reached
    if (resources.value.bank < cost) return false; // Not enough bank
    
    resources.value.bank -= cost;
    radarLevel.value = nextLevel;
    return true;
  };

  const getRadarUpgradeCost = () => {
    const nextLevel = radarLevel.value + 1;
    return radarUpgradeCosts[nextLevel] || null;
  };

  return {
    // State
    showStartPopup,
    showLocationPopup,
    resources,
    radarLevel,

    // Actions
    startGame,
    showLocationError,
    retryLocationPermission,
    addResource,
    upgradeRadar,
    getRadarUpgradeCost,
  };
});
