import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '@/services/dbService';
import { AUTO_ATTACK_BASE_COOLDOWN_MS, AUTO_ATTACK_COOLDOWN_REDUCTION_RATE, AUTO_ATTACK_MIN_COOLDOWN_MS } from '@/constants/player';

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
  const isBaseCaptured = ref(false);
  const GAME_OVER_DELAY_MS = 1000;
  let gameOverTimeoutId = null;

  const clearGameOverTimer = () => {
    if (gameOverTimeoutId) {
      clearTimeout(gameOverTimeoutId);
      gameOverTimeoutId = null;
    }
  };

  const scheduleGameOverPopup = (delayMs = GAME_OVER_DELAY_MS) => {
    clearGameOverTimer();
    gameOverTimeoutId = setTimeout(() => {
      showGameOverPopup.value = true;
    }, delayMs);
  };

  const handleBaseCaptured = (delayMs = GAME_OVER_DELAY_MS) => {
    if (isBaseCaptured.value) return;
    isBaseCaptured.value = true;
    showGameOverPopup.value = false;
    scheduleGameOverPopup(delayMs);
  };

  // Upgrades
  const radarLevel = ref(1);
  const radarUpgradeCosts = {
    2: 10,
    3: 25,
    4: 50,
    5: 100,
  };
  const autoAttackLevel = ref(1);
  const autoAttackUpgradeCosts = {
    2: 10,
    3: 25,
    4: 50,
  };
  const maxPredefinedLevel = Math.max(...Object.keys(radarUpgradeCosts).map(Number));
  const maxPredefinedCost = radarUpgradeCosts[maxPredefinedLevel];
  const fallbackGrowthRate = 2; // Multiplicador exponencial para niveles superiores

  const autoAttackMaxPredefinedLevel = Math.max(...Object.keys(autoAttackUpgradeCosts).map(Number));
  const autoAttackMaxPredefinedCost = autoAttackUpgradeCosts[autoAttackMaxPredefinedLevel];

  const calculateUpgradeCost = (nextLevel) => {
    if (nextLevel <= 1) return 0;

    const predefined = radarUpgradeCosts[nextLevel];
    if (predefined) return predefined;

    // A partir del último nivel definido, duplicamos el costo por nivel
    const extraLevels = nextLevel - maxPredefinedLevel;
    return Math.round(maxPredefinedCost * Math.pow(fallbackGrowthRate, extraLevels));
  };

  const calculateAutoAttackUpgradeCost = (nextLevel) => {
    const predefined = autoAttackUpgradeCosts[nextLevel];
    if (predefined) return predefined;

    const extraLevels = nextLevel - autoAttackMaxPredefinedLevel;
    if (extraLevels <= 0) return autoAttackMaxPredefinedCost;
    return autoAttackMaxPredefinedCost; // Coste constante 50 para niveles superiores
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

  const persistAutoAttackLevel = async () => {
    try {
      await db.game.put({ key: 'autoAttackLevel', data: autoAttackLevel.value });
    } catch (error) {
      console.error('Error saving auto-attack level to DB:', error);
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

  const loadAutoAttackLevel = async () => {
    try {
      const saved = await db.game.get('autoAttackLevel');
      if (saved?.data) {
        autoAttackLevel.value = saved.data;
      }
    } catch (error) {
      console.error('Error loading auto-attack level from DB:', error);
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
          handleBaseCaptured();
        } else {
          isBaseCaptured.value = false;
        }
      }
    } catch (error) {
      console.error('Error loading base health from DB:', error);
    }
  };

  const setBaseHealth = (value, { delayMs = GAME_OVER_DELAY_MS } = {}) => {
    baseHealth.value = Math.max(0, Math.min(baseMaxHealth.value, value));
    if (baseHealth.value <= 0) {
      baseHealth.value = 0;
      handleBaseCaptured(delayMs);
    } else {
      isBaseCaptured.value = false;
      showGameOverPopup.value = false;
      clearGameOverTimer();
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

  const upgradeAutoAttack = () => {
    const nextLevel = autoAttackLevel.value + 1;
    const cost = calculateAutoAttackUpgradeCost(nextLevel);
    if (resources.value.police < cost) return false; // Not enough police resources

    resources.value.police -= cost;
    autoAttackLevel.value = nextLevel;
    persistResources();
    persistAutoAttackLevel();
    return true;
  };

  const getRadarUpgradeCost = () => {
    return calculateUpgradeCost(radarLevel.value + 1);
  };

  const getAutoAttackUpgradeCost = () => {
    return calculateAutoAttackUpgradeCost(autoAttackLevel.value + 1);
  };

  const computeAutoAttackCooldownMs = (level) => {
    if (!Number.isFinite(level) || level <= 0) return null;
    const cooldown = AUTO_ATTACK_BASE_COOLDOWN_MS * Math.pow(AUTO_ATTACK_COOLDOWN_REDUCTION_RATE, Math.max(0, level - 1));
    return Math.max(AUTO_ATTACK_MIN_COOLDOWN_MS, Math.round(cooldown));
  };

  const getAutoAttackCooldownMs = () => {
    return computeAutoAttackCooldownMs(autoAttackLevel.value);
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
    isBaseCaptured.value = false;
    showGameOverPopup.value = false;
    clearGameOverTimer();

    // Resetear nivel del radar
    radarLevel.value = 1;
    autoAttackLevel.value = 1;
    
    // Resetear popups
    showStartPopup.value = false;
    showBaseLocationPopup.value = true;
    showLocationPopup.value = false;
    persistResources();
    persistBaseHealth();
    persistRadarLevel();
    persistAutoAttackLevel();
  };

  // Cargar recursos al inicializar el store
  loadResources();
  loadBaseHealth();
  loadRadarLevel();
  loadAutoAttackLevel();

  return {
    // State
    showStartPopup,
    showBaseLocationPopup,
    showLocationPopup,
    showGameOverPopup,
    resources,
    radarLevel,
    autoAttackLevel,
    baseHealth,
    baseMaxHealth,
    isBaseCaptured,

    // Actions
    startGame,
    confirmBaseLocation,
    showLocationError,
    goBackToLocationSelect,
    continueGame,
    addResource,
    upgradeRadar,
    upgradeAutoAttack,
    getRadarUpgradeCost,
    getAutoAttackUpgradeCost,
    computeAutoAttackCooldownMs,
    getAutoAttackCooldownMs,
    resetGame,
    consumeResource,
    loadResources,
    persistRadarLevel,
    loadRadarLevel,
    persistAutoAttackLevel,
    loadAutoAttackLevel,
    persistBaseHealth,
    loadBaseHealth,
    setBaseHealth,
  };
});
