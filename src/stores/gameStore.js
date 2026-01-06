import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGameStore = defineStore('game', () => {
  // Estado de los popups
  const showStartPopup = ref(true);
  const showBaseLocationPopup = ref(false);
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
  const maxPredefinedLevel = Math.max(...Object.keys(radarUpgradeCosts).map(Number));
  const maxPredefinedCost = radarUpgradeCosts[maxPredefinedLevel];
  const fallbackGrowthRate = 2; // Multiplicador exponencial para niveles superiores

  const calculateUpgradeCost = (nextLevel) => {
    if (nextLevel <= 1) return 0;

    const predefined = radarUpgradeCosts[nextLevel];
    if (predefined) return predefined;

    // A partir del último nivel definido, duplicamos el costo por nivel
    const extraLevels = nextLevel - maxPredefinedLevel;
    return Math.round(maxPredefinedCost * Math.pow(fallbackGrowthRate, extraLevels));
  };

  // Acciones
  const startGame = () => {
    showStartPopup.value = false;
    showBaseLocationPopup.value = true;
  };

  const confirmBaseLocation = () => {
    showBaseLocationPopup.value = false;
  };

  const showLocationError = () => {
    showLocationPopup.value = true;
  };

  const goBackToLocationSelect = () => {
    showLocationPopup.value = false;
    showBaseLocationPopup.value = true;
  };

  const addResource = (resourceType) => {
    if (resources.value.hasOwnProperty(resourceType)) {
      resources.value[resourceType] += 1;
    }
  };

  const upgradeRadar = () => {
    const nextLevel = radarLevel.value + 1;
    const cost = calculateUpgradeCost(nextLevel);
    if (resources.value.bank < cost) return false; // Not enough bank
    
    resources.value.bank -= cost;
    radarLevel.value = nextLevel;
    return true;
  };

  const getRadarUpgradeCost = () => {
    return calculateUpgradeCost(radarLevel.value + 1);
  };

  const resetGame = () => {
    // Resetear recursos
    resources.value = {
      food: 0,
      pharmacy: 0,
      fuel: 0,
      bank: 0,
      police: 0,
    };
    
    // Resetear nivel del radar
    radarLevel.value = 1;
    
    // Resetear popups
    showStartPopup.value = false;
    showBaseLocationPopup.value = true;
    showLocationPopup.value = false;
  };

  return {
    // State
    showStartPopup,
    showBaseLocationPopup,
    showLocationPopup,
    resources,
    radarLevel,

    // Actions
    startGame,
    confirmBaseLocation,
    showLocationError,
    goBackToLocationSelect,
    addResource,
    upgradeRadar,
    getRadarUpgradeCost,
    resetGame,
  };
});
