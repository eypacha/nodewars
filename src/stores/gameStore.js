import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '@/services/dbService';

export const useGameStore = defineStore('game', () => {
  // Estado de los popups
  const showStartPopup = ref(true);
  const showBaseLocationPopup = ref(false);
  const showLocationPopup = ref(false);
  const showGameOverPopup = ref(false);
  const resources = ref({
    food: 0,
    pharmacy: 0,
    fuel: 0,
    bank: 0,
    police: 0,
  });

  const baseHealth = ref(10);
  const baseMaxHealth = ref(10);

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
    showGameOverPopup.value = false;
  };

  const continueGame = () => {
    showStartPopup.value = false;
    showBaseLocationPopup.value = false;
    showGameOverPopup.value = false;
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

  const persistResources = async () => {
    try {
      await db.game.put({ key: 'resources', data: { ...resources.value } });
    } catch (error) {
      console.error('Error saving resources to DB:', error);
    }
  };

  const persistRadarLevel = async () => {
    try {
      await db.game.put({ key: 'radarLevel', data: radarLevel.value });
    } catch (error) {
      console.error('Error saving radar level to DB:', error);
    }
  };

  const loadResources = async () => {
    try {
      const saved = await db.game.get('resources');
      if (saved?.data) {
        resources.value = saved.data;
      }
    } catch (error) {
      console.error('Error loading resources from DB:', error);
    }
  };

  const loadRadarLevel = async () => {
    try {
      const saved = await db.game.get('radarLevel');
      if (saved?.data) {
        radarLevel.value = saved.data;
      }
    } catch (error) {
      console.error('Error loading radar level from DB:', error);
    }
  };

  const persistBaseHealth = async () => {
    try {
      await db.game.put({ key: 'baseHealth', data: { health: baseHealth.value, maxHealth: baseMaxHealth.value } });
    } catch (error) {
      console.error('Error saving base health to DB:', error);
    }
  };

  const loadBaseHealth = async () => {
    try {
      const saved = await db.game.get('baseHealth');
      if (saved?.data) {
        baseHealth.value = saved.data.health ?? 10;
        baseMaxHealth.value = saved.data.maxHealth ?? 10;
        if (baseHealth.value <= 0) {
          showGameOverPopup.value = true;
        }
      }
    } catch (error) {
      console.error('Error loading base health from DB:', error);
    }
  };

  const setBaseHealth = (value) => {
    baseHealth.value = Math.max(0, Math.min(baseMaxHealth.value, value));
    if (baseHealth.value <= 0) {
      showGameOverPopup.value = true;
    }
    persistBaseHealth();
  };

  const addResource = (resourceType) => {
    if (resources.value.hasOwnProperty(resourceType)) {
      resources.value[resourceType] += 1;
      persistResources();
    }
  };

  const consumeResource = (resourceType, amount = 1) => {
    if (!resources.value.hasOwnProperty(resourceType)) return false;
    if (resources.value[resourceType] < amount) return false;
    resources.value[resourceType] -= amount;
    persistResources();
    return true;
  };

  const upgradeRadar = () => {
    const nextLevel = radarLevel.value + 1;
    const cost = calculateUpgradeCost(nextLevel);
    if (resources.value.bank < cost) return false; // Not enough bank
    
    resources.value.bank -= cost;
    radarLevel.value = nextLevel;
    persistResources();
    persistRadarLevel();
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
    // Resetear salud base
    baseHealth.value = 10;
    baseMaxHealth.value = 10;
    showGameOverPopup.value = false;

    // Resetear nivel del radar
    radarLevel.value = 1;
    
    // Resetear popups
    showStartPopup.value = false;
    showBaseLocationPopup.value = true;
    showLocationPopup.value = false;
    persistResources();
    persistBaseHealth();
    persistRadarLevel();
  };

  // Cargar recursos al inicializar el store
  loadResources();
  loadBaseHealth();
  loadRadarLevel();

  return {
    // State
    showStartPopup,
    showBaseLocationPopup,
    showLocationPopup,
    showGameOverPopup,
    resources,
    radarLevel,
    baseHealth,
    baseMaxHealth,

    // Actions
    startGame,
    confirmBaseLocation,
    showLocationError,
    goBackToLocationSelect,
    continueGame,
    addResource,
    upgradeRadar,
    getRadarUpgradeCost,
    resetGame,
    consumeResource,
    loadResources,
    persistRadarLevel,
    loadRadarLevel,
    persistBaseHealth,
    loadBaseHealth,
    setBaseHealth,
  };
});
