import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '@/services/dbService';
import {
  AUTO_ATTACK_BASE_COOLDOWN_MS,
  AUTO_ATTACK_COOLDOWN_REDUCTION_RATE,
  AUTO_ATTACK_MIN_COOLDOWN_MS,
  AUTO_HEAL_BASE_COOLDOWN_MS,
  AUTO_HEAL_COOLDOWN_REDUCTION_RATE,
  AUTO_HEAL_MIN_COOLDOWN_MS,
} from '@/constants/player';

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
  const autoAttackLevel = ref(0);
  const autoHealLevel = ref(0);
  const baseNodesLevel = ref(1);
  const autoAttackUpgradeCosts = {
    1: 5,
    2: 20,
    3: 60,
    4: 140,
  };
  const maxPredefinedLevel = Math.max(...Object.keys(radarUpgradeCosts).map(Number));
  const maxPredefinedCost = radarUpgradeCosts[maxPredefinedLevel];
  const fallbackGrowthRate = 1.5; // Multiplicador exponencial para niveles superiores
  const autoAttackFallbackGrowthRate = 1.4; // Curva más suave para auto-attack
  const autoHealFallbackGrowthRate = 1.5;
  const autoHealUpgradeCosts = {
    1: 10,
    2: 25,
    3: 50,
    4: 100,
  };

  const autoAttackMaxPredefinedLevel = Math.max(...Object.keys(autoAttackUpgradeCosts).map(Number));
  const autoAttackMaxPredefinedCost = autoAttackUpgradeCosts[autoAttackMaxPredefinedLevel];
  const autoHealMaxPredefinedLevel = Math.max(...Object.keys(autoHealUpgradeCosts).map(Number));
  const autoHealMaxPredefinedCost = autoHealUpgradeCosts[autoHealMaxPredefinedLevel];

  const calculateUpgradeCost = (nextLevel) => {
    if (nextLevel <= 1) return 0;

    const predefined = radarUpgradeCosts[nextLevel];
    if (predefined) return predefined;

    // A partir del último nivel definido, duplicamos el costo por nivel
    const extraLevels = nextLevel - maxPredefinedLevel;
    return Math.round(maxPredefinedCost * Math.pow(fallbackGrowthRate, extraLevels));
  };

  const getUpgradeCostForLevel = (level) => {
    if (!Number.isFinite(level) || level <= 0) return null;
    return calculateUpgradeCost(level);
  };

  const calculateAutoAttackUpgradeCost = (nextLevel) => {
    const predefined = autoAttackUpgradeCosts[nextLevel];
    if (predefined) return predefined;

    const extraLevels = nextLevel - autoAttackMaxPredefinedLevel;
    if (extraLevels <= 0) return autoAttackMaxPredefinedCost;
    return Math.round(autoAttackMaxPredefinedCost * Math.pow(autoAttackFallbackGrowthRate, extraLevels));
  };

  const calculateAutoHealUpgradeCost = (nextLevel) => {
    const predefined = autoHealUpgradeCosts[nextLevel];
    if (predefined) return predefined;

    const extraLevels = nextLevel - autoHealMaxPredefinedLevel;
    if (extraLevels <= 0) return autoHealMaxPredefinedCost;
    return Math.round(autoHealMaxPredefinedCost * Math.pow(autoHealFallbackGrowthRate, extraLevels));
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

  const persistAutoHealLevel = async () => {
    try {
      await db.game.put({ key: 'autoHealLevel', data: autoHealLevel.value });
    } catch (error) {
      console.error('Error saving auto-heal level to DB:', error);
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

  const loadAutoHealLevel = async () => {
    try {
      const saved = await db.game.get('autoHealLevel');
      if (saved?.data) {
        autoHealLevel.value = saved.data;
      }
    } catch (error) {
      console.error('Error loading auto-heal level from DB:', error);
    }
  };

  const persistBaseNodesLevel = async () => {
    try {
      await db.game.put({ key: 'baseNodesLevel', data: baseNodesLevel.value });
    } catch (error) {
      console.error('Error saving base nodes level to DB:', error);
    }
  };

  const loadBaseNodesLevel = async () => {
    try {
      const saved = await db.game.get('baseNodesLevel');
      if (saved?.data) {
        baseNodesLevel.value = saved.data;
      }
    } catch (error) {
      console.error('Error loading base nodes level from DB:', error);
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

  const upgradeAutoHeal = () => {
    const nextLevel = autoHealLevel.value + 1;
    const cost = calculateAutoHealUpgradeCost(nextLevel);
    if (resources.value.pharmacy < cost) return false;

    resources.value.pharmacy -= cost;
    autoHealLevel.value = nextLevel;
    persistResources();
    persistAutoHealLevel();
    return true;
  };

  const getRadarUpgradeCost = () => {
    return calculateUpgradeCost(radarLevel.value + 1);
  };

  const getAutoAttackUpgradeCost = () => {
    return calculateAutoAttackUpgradeCost(autoAttackLevel.value + 1);
  };

  const getAutoHealUpgradeCost = () => {
    return calculateAutoHealUpgradeCost(autoHealLevel.value + 1);
  };

  const getAutoAttackUpgradeCostForLevel = (level) => {
    if (!Number.isFinite(level) || level <= 0) return null;
    return calculateAutoAttackUpgradeCost(level);
  };

  const getAutoHealUpgradeCostForLevel = (level) => {
    if (!Number.isFinite(level) || level <= 0) return null;
    return calculateAutoHealUpgradeCost(level);
  };

  const getBaseNodesUpgradeCost = () => {
    return calculateUpgradeCost(baseNodesLevel.value + 1);
  };

  const upgradeBaseNodes = () => {
    const nextLevel = baseNodesLevel.value + 1;
    const cost = calculateUpgradeCost(nextLevel);
    if (resources.value.food < cost) return false;
    resources.value.food -= cost;
    baseNodesLevel.value = nextLevel;
    persistResources();
    persistBaseNodesLevel();
    return true;
  };

  const getMaxBaseNodes = () => {
    return 10 + (baseNodesLevel.value - 1) * 2;
  };

  const computeAutoAttackCooldownMs = (level) => {
    if (!Number.isFinite(level) || level <= 0) return null;
    const cooldown = AUTO_ATTACK_BASE_COOLDOWN_MS * Math.pow(AUTO_ATTACK_COOLDOWN_REDUCTION_RATE, Math.max(0, level - 1));
    return Math.max(AUTO_ATTACK_MIN_COOLDOWN_MS, Math.round(cooldown));
  };

  const computeAutoHealCooldownMs = (level) => {
    if (!Number.isFinite(level) || level <= 0) return null;
    const cooldown = AUTO_HEAL_BASE_COOLDOWN_MS * Math.pow(AUTO_HEAL_COOLDOWN_REDUCTION_RATE, Math.max(0, level - 1));
    return Math.max(AUTO_HEAL_MIN_COOLDOWN_MS, Math.round(cooldown));
  };

  const getAutoAttackCooldownMs = () => {
    return computeAutoAttackCooldownMs(autoAttackLevel.value);
  };

  const getAutoHealCooldownMs = (level = autoHealLevel.value) => {
    return computeAutoHealCooldownMs(level);
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

    // Resetear upgrades
    radarLevel.value = 1;
    autoAttackLevel.value = 0;
    autoHealLevel.value = 0;
    baseNodesLevel.value = 1;
    
    // Resetear popups
    showStartPopup.value = false;
    showBaseLocationPopup.value = true;
    showLocationPopup.value = false;
    persistResources();
    persistBaseHealth();
    persistRadarLevel();
    persistAutoAttackLevel();
    persistAutoHealLevel();
    persistBaseNodesLevel();
  };

  // Cargar recursos al inicializar el store
  loadResources();
  loadBaseHealth();
  loadRadarLevel();
  loadAutoAttackLevel();
  loadAutoHealLevel();
  loadBaseNodesLevel();

  return {
    // State
    showStartPopup,
    showBaseLocationPopup,
    showLocationPopup,
    showGameOverPopup,
    resources,
    radarLevel,
    autoAttackLevel,
    autoHealLevel,
    baseNodesLevel,
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
    upgradeAutoHeal,
    upgradeBaseNodes,
    getRadarUpgradeCost,
    getAutoAttackUpgradeCost,
    getAutoHealUpgradeCost,
    getAutoAttackUpgradeCostForLevel,
    getAutoHealUpgradeCostForLevel,
    getUpgradeCostForLevel,
    getBaseNodesUpgradeCost,
    getMaxBaseNodes,
    computeAutoAttackCooldownMs,
    computeAutoHealCooldownMs,
    getAutoAttackCooldownMs,
    getAutoHealCooldownMs,
    resetGame,
    consumeResource,
    loadResources,
    persistRadarLevel,
    loadRadarLevel,
    persistAutoAttackLevel,
    loadAutoAttackLevel,
    persistAutoHealLevel,
    loadAutoHealLevel,
    persistBaseNodesLevel,
    loadBaseNodesLevel,
    persistBaseHealth,
    loadBaseHealth,
    setBaseHealth,
  };
});
