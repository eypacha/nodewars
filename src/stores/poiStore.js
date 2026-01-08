import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { fetchPointsOfInterest } from '@/services/overpassService';
import { getPOIColor } from '@/constants/poiTypes';
import { calculateDistance } from '@/utils/mapHelpers';
import { db } from '@/services/dbService';

export const usePoiStore = defineStore('poi', () => {
  const DEFAULT_RESOURCE_CAPACITY = 5;
  const DEFAULT_PRODUCTION_RATE = 60000; // 1 minuto en ms
  const BARRACK_COLOR = getPOIColor('barrack');

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Estado
  const pois = ref([]);
  const error = ref(null);
  const maxRetries = 10;
  const defaultScanKey = 'base';
  const scanStates = ref(new Map()); // key -> { isLoading, retryCount, shouldStopRetrying, error }
  const lastFetchCenter = ref(new Map()); // key -> center
  const lastFetchRadius = ref(new Map()); // key -> radius
  const selectedPOI = ref(null);
  const showPOIDialog = ref(false);
  
  const getScanState = (key = defaultScanKey) => {
    const mapCopy = new Map(scanStates.value);
    if (!mapCopy.has(key)) {
      mapCopy.set(key, {
        isLoading: false,
        retryCount: 0,
        shouldStopRetrying: false,
        retryTimeout: null,
        error: null,
      });
      scanStates.value = mapCopy;
    }
    return mapCopy.get(key);
  };

  const setScanState = (key, newState) => {
    const mapCopy = new Map(scanStates.value);
    mapCopy.set(key, newState);
    scanStates.value = mapCopy;
  };

  // Getters
  const poisCount = computed(() => pois.value.length);
  const isLoading = computed(() => Array.from(scanStates.value.values()).some((s) => s.isLoading));
  
  const poisByType = computed(() => {
    return pois.value.reduce((acc, poi) => {
      const type = poi.type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(poi);
      return acc;
    }, {});
  });

  const getPOIById = (id) => {
    return pois.value.find(poi => poi.id === id);
  };

  const withProductionDefaults = (poi) => {
    const capacity = poi.resourceCapacity ?? DEFAULT_RESOURCE_CAPACITY;
    const productionRate = poi.productionRate ?? DEFAULT_PRODUCTION_RATE;
    const lastProducedAt = poi.lastProducedAt ?? Date.now();
    const color = poi.type === 'barrack' ? (poi.color || BARRACK_COLOR) : poi.color;

    return {
      ...poi,
      color,
      resourceCapacity: capacity,
      productionRate,
      lastProducedAt,
      resourceAmount: Math.min(poi.resourceAmount ?? capacity, capacity),
    };
  };

  // DB functions
  const loadPOIs = async () => {
    try {
      const loadedPOIs = await db.pois.toArray();
      pois.value = loadedPOIs.map(poi => withProductionDefaults(poi));
      console.log('POIs loaded from DB:', pois.value.length);
    } catch (error) {
      console.error('Error loading POIs from DB:', error);
    }
  };

  const savePOI = async (poi) => {
    try {
      await db.pois.put(poi);
      console.log('POI saved:', poi.id);
    } catch (error) {
      console.error('Error saving POI:', error);
    }
  };

  const updatePOI = async (poiId, updates) => {
    try {
      await db.pois.update(poiId, updates);
      console.log('POI updated:', poiId, updates);
    } catch (error) {
      console.error('Error updating POI:', error);
    }
  };

  const applyProductionForPOI = (poiId) => {
    const poi = getPOIById(poiId);
    if (!poi || poi.type === 'barrack') return poi;

    const now = Date.now();
    const lastTick = poi.lastProducedAt ?? now;
    const elapsed = now - lastTick;

    if (elapsed < poi.productionRate) {
      return poi;
    }

    const producedCycles = Math.floor(elapsed / poi.productionRate);
    if (producedCycles <= 0) return poi;

    const maxAddable = poi.resourceCapacity - poi.resourceAmount;
    if (maxAddable <= 0) {
      return poi;
    }

    const effectiveProduction = Math.min(producedCycles, maxAddable);
    const newAmount = poi.resourceAmount + effectiveProduction;
    const newTimestamp = lastTick + effectiveProduction * poi.productionRate;

    poi.resourceAmount = newAmount;
    poi.lastProducedAt = newTimestamp;
    updatePOI(poiId, { resourceAmount: newAmount, lastProducedAt: newTimestamp });
    return poi;
  };

  // Acciones
  const fetchPOIs = async (center, radius, options = {}) => {
    const { stagger = false, staggerDelay = 200, originKey = defaultScanKey } = options;

    const key = originKey || defaultScanKey;
    let state = { ...getScanState(key) };

    // Inicializar estado para este scan
    state.retryCount = 0;
    state.shouldStopRetrying = false;
    state.isLoading = true;
    state.error = null;
    setScanState(key, state);
    error.value = null;

    console.log(`🔍 Scanning (${key})...`);

    while (true) {
      // Si otro proceso pidió detener
      state = { ...getScanState(key) };
      if (state.shouldStopRetrying) {
        state.isLoading = false;
        setScanState(key, state);
        return { status: 'stopped', error: state.error };
      }

      try {
        const fetchedPOIs = await fetchPointsOfInterest(center.lat, center.lng, radius);
        const now = Date.now();

        // Si durante el fetch se pidió detener, salir sin procesar
        state = { ...getScanState(key) };
        if (state.shouldStopRetrying) {
          state.isLoading = false;
          setScanState(key, state);
          return { status: 'stopped', error: 'stopped' };
        }

        // Resetear contadores de reintento
        state.retryCount = 0;
        state.shouldStopRetrying = false;
        state.error = null;
        state.isLoading = false;
        setScanState(key, state);

        // Filtrar POIs dentro del radio y añadir color
        const newPOIs = fetchedPOIs
          .filter(poi => {
            const distance = calculateDistance([center.lat, center.lng], [poi.lat, poi.lng]);
            return distance <= radius;
          })
          .map(poi => withProductionDefaults({
            ...poi,
            // Usar la categoría si existe, sino usar el tipo
            color: getPOIColor(poi.category || poi.type),
          health: 5,
          maxHealth: 5,
            owned: false,
            resourceAmount: DEFAULT_RESOURCE_CAPACITY,
            resourceCapacity: DEFAULT_RESOURCE_CAPACITY,
            productionRate: DEFAULT_PRODUCTION_RATE,
            lastProducedAt: now,
            radarActive: false,
            conqueredFrom: null, // null = base, o ID del cuartel desde donde fue conquistado
          }));

        // Crear un Set con los IDs existentes para verificar duplicados
        const existingIds = new Set(pois.value.map(poi => poi.id));

        // Filtrar POIs que no estén ya en la lista
        const uniqueNewPOIs = newPOIs.filter(poi => !existingIds.has(poi.id));

        // Contar cuántos POIs de cada categoría ya existen
        const categoryCounts = {};
        pois.value.forEach(poi => {
          const category = poi.category || poi.type;
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
        });

        // Agrupar los nuevos POIs por categoría
        const poisByCategory = {};
        uniqueNewPOIs.forEach(poi => {
          const category = poi.category || poi.type;
          if (!poisByCategory[category]) {
            poisByCategory[category] = [];
          }
          poisByCategory[category].push(poi);
        });

        // Agregar máximo 2 POIs por categoría en este scan
        const poisToAdd = [];
        Object.keys(poisByCategory).forEach(category => {
          const existingCount = categoryCounts[category] || 0;
          const availablePOIs = poisByCategory[category];
          // Agregar hasta 2 POIs nuevos de esta categoría
          const toAdd = availablePOIs.slice(0, 2);
          poisToAdd.push(...toAdd);
        });

        if (stagger && poisToAdd.length) {
          for (let i = 0; i < poisToAdd.length; i++) {
            const poi = poisToAdd[i];
            pois.value = [...pois.value, poi];
            await savePOI(poi);
            if (i < poisToAdd.length - 1 && staggerDelay > 0) {
              await sleep(staggerDelay);
            }
          }
        } else {
          // Sumar los nuevos POIs a los existentes
          pois.value = [...pois.value, ...poisToAdd];
          // Guardar los nuevos POIs en DB
          await Promise.all(poisToAdd.map(poi => savePOI(poi)));
        }

        lastFetchCenter.value.set(key, center);
        lastFetchRadius.value.set(key, radius);

        return { status: 'ok' };
      } catch (err) {
        state = { ...getScanState(key) };
        state.error = err.message;
        error.value = err.message;
        console.error(`Error fetching POIs (${key}):`, err);

        // Si no se debe detener y no se alcanzó el máximo de reintentos
        if (!state.shouldStopRetrying && state.retryCount < maxRetries) {
          state.retryCount++;
          setScanState(key, state);
          console.log(`Reintentando (${key})... (${state.retryCount}/${maxRetries})`);
          await sleep(3000);
          continue;
        }

        // Detener después de 10 intentos o si el usuario lo detuvo
        state.isLoading = false;
        setScanState(key, state);
        if (state.retryCount >= maxRetries) {
          console.log(`Máximo de reintentos alcanzado (${key})`);
        }
        return { status: 'stopped', error: err.message };
      }
    }
  };

  const clearPOIs = () => {
    pois.value = [];
    lastFetchCenter.value = new Map();
    lastFetchRadius.value = new Map();
    error.value = null;
    scanStates.value.forEach((state) => {
      if (state.retryTimeout) {
        clearTimeout(state.retryTimeout);
      }
    });
    scanStates.value = new Map();
  };
  
  const stopScan = (originKey = null) => {
    const keysToStop = originKey ? [originKey] : Array.from(scanStates.value.keys());

    keysToStop.forEach((key) => {
      const state = { ...getScanState(key) };
      state.shouldStopRetrying = true;
      state.isLoading = false;
      if (state.retryTimeout) {
        clearTimeout(state.retryTimeout);
        state.retryTimeout = null;
      }
      state.retryCount = 0;
      setScanState(key, state);
      console.log(`⏹️ Scan stopped (${key})`);
    });
  };

  const filterPOIsInRadius = (center, radius) => {
    return pois.value.filter(poi => {
      const distance = calculateDistance([center.lat, center.lng], [poi.lat, poi.lng]);
      return distance <= radius;
    });
  };

  // Convierte un POI conquistado en barrack
  const convertToBarracks = (poiId) => {
    const poi = getPOIById(poiId);
    if (!poi) return false;
    if (!poi.owned) return false;
    if (poi.type === 'barrack') return false;
    poi.type = 'barrack';
    poi.color = BARRACK_COLOR;
    updatePOI(poiId, { type: 'barrack', color: BARRACK_COLOR });
    return true;
  };

  // Activa o desactiva el radar de un barrack
  const toggleBarracksRadar = (poiId) => {
    const poi = getPOIById(poiId);
    if (!poi) return false;
    if (!poi.owned) return false;
    if (poi.type !== 'barrack') return false;
    poi.radarActive = !poi.radarActive;
    updatePOI(poiId, { radarActive: poi.radarActive });
    return poi.radarActive;
  };

  const resetPOIs = async () => {
    pois.value = [];
    lastFetchCenter.value = new Map();
    lastFetchRadius.value = new Map();
    error.value = null;
    selectedPOI.value = null;
    showPOIDialog.value = false;

    // Limpiar timers y estados de scan
    scanStates.value.forEach((state) => {
      if (state.retryTimeout) {
        clearTimeout(state.retryTimeout);
      }
    });
    scanStates.value = new Map();

    // Limpiar DB
    try {
      await db.pois.clear();
      console.log('POIs DB cleared');
    } catch (error) {
      console.error('Error clearing POIs DB:', error);
    }
  };

  const selectPOI = async (poiId) => {
    const poi = applyProductionForPOI(poiId) || getPOIById(poiId);
    selectedPOI.value = poi;
    if (poi) {
      showPOIDialog.value = true;
      // Cerrar otros diálogos cuando se abre un POI
      const { useMapStore } = await import('./mapStore');
      const mapStore = useMapStore();
      mapStore.closeAllDialogs();
    }
    return poi; // Devolver el POI para que se pueda usar en MapComponent
  };

  const closePOIDialog = () => {
    showPOIDialog.value = false;
    selectedPOI.value = null;
  };

  const consumeResource = (poiId) => {
    const poi = getPOIById(poiId);
    if (!poi) return false;
    if (poi.resourceAmount <= 0) return false;
    const wasFull = poi.resourceAmount >= poi.resourceCapacity;
    poi.resourceAmount -= 1;
    if (wasFull) {
      poi.lastProducedAt = Date.now();
      updatePOI(poiId, { resourceAmount: poi.resourceAmount, lastProducedAt: poi.lastProducedAt });
    } else {
      updatePOI(poiId, { resourceAmount: poi.resourceAmount });
    }
    return true;
  };

  const damagePOI = (poiId, damage = 1, attackOriginId = null) => {
    const poi = getPOIById(poiId);
    if (poi) {
      // Solo reducir health si no está owned
      if (!poi.owned) {
        poi.health = Math.max(0, poi.health - damage);
        
        // Si el health llega a 0, marcar como owned
        if (poi.health <= 0) {
          poi.owned = true;
          // Registrar desde dónde fue conquistado (base = null, o ID del cuartel)
          poi.conqueredFrom = attackOriginId;
        }
      }
      updatePOI(poiId, { health: poi.health, owned: poi.owned, conqueredFrom: poi.conqueredFrom });
    }
  };

  const markAsEnemyBarrack = (poiId) => {
    const poi = getPOIById(poiId);
    if (!poi) return false;
    poi.type = 'barrack';
    poi.owned = false;
    poi.enemy = true;
    poi.color = '#ef4444';
    updatePOI(poiId, { type: 'barrack', owned: false, enemy: true, color: poi.color });
    return true;
  };

  const spawnEnemyBarrack = async (data) => {
    const now = Date.now();
    const poi = withProductionDefaults({
      id: data.id,
      name: data.name || 'Enemy Outpost',
      lat: data.lat,
      lng: data.lng,
      type: 'barrack',
      enemy: true,
      owned: false,
      color: data.color || '#ef4444',
      health: data.health ?? 5,
      maxHealth: data.maxHealth ?? 5,
      resourceAmount: data.resourceAmount ?? 0,
      resourceCapacity: data.resourceCapacity ?? 0,
      productionRate: data.productionRate ?? 0,
      lastProducedAt: data.lastProducedAt ?? now,
      radarActive: false,
      conqueredFrom: null,
    });
    pois.value = [...pois.value, poi];
    await savePOI(poi);
    return poi;
  };

  const healPOI = (poiId, amount = 1) => {
    const poi = getPOIById(poiId);
    if (!poi || !poi.owned) return false;
    const maxHealth = poi.maxHealth || poi.health || 0;
    const newHealth = Math.min(maxHealth, (poi.health || 0) + amount);
    poi.health = newHealth;
    updatePOI(poiId, { health: newHealth });
    return true;
  };

  return {
    // State
    pois,
    isLoading,
    error,
    lastFetchCenter,
    lastFetchRadius,
    selectedPOI,
    showPOIDialog,

    // Getters
    poisCount,
    poisByType,

    // Actions
    fetchPOIs,
    stopScan,
    clearPOIs,
    filterPOIsInRadius,
    getPOIById,
    selectPOI,
    closePOIDialog,
    damagePOI,
    markAsEnemyBarrack,
    spawnEnemyBarrack,
    healPOI,
    consumeResource,
    applyProductionForPOI,
    convertToBarracks,
    toggleBarracksRadar,
    resetPOIs,
    loadPOIs,
  };
});
