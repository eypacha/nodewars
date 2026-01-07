import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { fetchPointsOfInterest, getPOIColor } from '@/services/overpassService';
import { calculateDistance } from '@/utils/mapHelpers';
import { db } from '@/services/dbService';

export const usePoiStore = defineStore('poi', () => {
  const DEFAULT_RESOURCE_CAPACITY = 5;
  const DEFAULT_PRODUCTION_RATE = 60000; // 1 minuto en ms
  const BARRACK_COLOR = '#38bdf8';

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Estado
  const pois = ref([]);
  const isLoading = ref(false);
  const error = ref(null);
  const lastFetchCenter = ref(null);
  const lastFetchRadius = ref(null);
  const selectedPOI = ref(null);
  const showPOIDialog = ref(false);
  
  // Estado de reintentos automáticos
  const retryCount = ref(0);
  const maxRetries = 10;
  const retryTimeout = ref(null);
  const shouldStopRetrying = ref(false);

  // Getters
  const poisCount = computed(() => pois.value.length);
  
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
    const color = poi.type === 'barrack' ? BARRACK_COLOR : poi.color;

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
    const { isRetry = false, stagger = false, staggerDelay = 200 } = options;

    if (!isRetry) {
      // Si no es un reintento, resetear el contador
      retryCount.value = 0;
      shouldStopRetrying.value = false;
    }
    
    console.log('🔍 Scanning...');
    
    isLoading.value = true;
    error.value = null;
    
    try {
      const fetchedPOIs = await fetchPointsOfInterest(center.lat, center.lng, radius);
      const now = Date.now();
      
      // Si no hay error, resetear contador de reintentos
      retryCount.value = 0;
      shouldStopRetrying.value = false;
      
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
          health: 50,
          maxHealth: 50,
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
      
      lastFetchCenter.value = center;
      lastFetchRadius.value = radius;
    } catch (err) {
      error.value = err.message;
      console.error('Error fetching POIs:', err);
      
      // Si no se debe detener y no se alcanzó el máximo de reintentos
      if (!shouldStopRetrying.value && retryCount.value < maxRetries) {
        retryCount.value++;
        console.log(`Reintentando... (${retryCount.value}/${maxRetries})`);
        
        // Esperar 3 segundos antes de reintentar
      retryTimeout.value = setTimeout(() => {
        fetchPOIs(center, radius, { ...options, isRetry: true });
      }, 3000);
      } else {
        // Detener después de 10 intentos o si el usuario lo detuvo
        isLoading.value = false;
        if (retryCount.value >= maxRetries) {
          console.log('Máximo de reintentos alcanzado');
        }
      }
      return; // No ejecutar finally si estamos reintentando
    } finally {
      // Solo detener isLoading si no estamos en proceso de reintento
      if (shouldStopRetrying.value || retryCount.value >= maxRetries || !error.value) {
        isLoading.value = false;
      }
    }
  };

  const clearPOIs = () => {
    pois.value = [];
    lastFetchCenter.value = null;
    lastFetchRadius.value = null;
    error.value = null;
  };
  
  const stopScan = () => {
    shouldStopRetrying.value = true;
    isLoading.value = false;
    if (retryTimeout.value) {
      clearTimeout(retryTimeout.value);
      retryTimeout.value = null;
    }
    retryCount.value = 0;
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
    lastFetchCenter.value = null;
    lastFetchRadius.value = null;
    error.value = null;
    selectedPOI.value = null;
    showPOIDialog.value = false;
    retryCount.value = 0;
    shouldStopRetrying.value = false;
    if (retryTimeout.value) {
      clearTimeout(retryTimeout.value);
      retryTimeout.value = null;
    }
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

  const damagePOI = (poiId, damage = 10, attackOriginId = null) => {
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
    consumeResource,
    applyProductionForPOI,
    convertToBarracks,
    toggleBarracksRadar,
    resetPOIs,
    loadPOIs,
  };
});
