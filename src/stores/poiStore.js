import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { fetchPointsOfInterest, getPOIColor } from '@/services/overpassService';
import { calculateDistance } from '@/utils/mapHelpers';

export const usePoiStore = defineStore('poi', () => {
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

  // Acciones
  const fetchPOIs = async (center, radius, isRetry = false) => {
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
      
      // Si no hay error, resetear contador de reintentos
      retryCount.value = 0;
      shouldStopRetrying.value = false;
      
      // Filtrar POIs dentro del radio y añadir color
      const newPOIs = fetchedPOIs
        .filter(poi => {
          const distance = calculateDistance([center.lat, center.lng], [poi.lat, poi.lng]);
          return distance <= radius;
        })
        .map(poi => ({
          ...poi,
          // Usar la categoría si existe, sino usar el tipo
          color: getPOIColor(poi.category || poi.type),
          health: 50,
          maxHealth: 50,
          owned: false,
          resourceAmount: 5,
          resourceCapacity: 5,
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
      
      // Sumar los nuevos POIs a los existentes
      pois.value = [...pois.value, ...poisToAdd];
      
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
          fetchPOIs(center, radius, true);
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

  const getPOIById = (id) => {
    return pois.value.find(poi => poi.id === id);
  };

  // Convierte un POI conquistado en barrack
  const convertToBarracks = (poiId) => {
    const poi = getPOIById(poiId);
    if (!poi) return false;
    if (!poi.owned) return false;
    if (poi.type === 'barrack') return false;
    poi.type = 'barrack';
    return true;
  };

  // Activa o desactiva el radar de un barrack
  const toggleBarracksRadar = (poiId) => {
    const poi = getPOIById(poiId);
    if (!poi) return false;
    if (!poi.owned) return false;
    if (poi.type !== 'barrack') return false;
    poi.radarActive = !poi.radarActive;
    return poi.radarActive;
  };

  const resetPOIs = () => {
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
  };

  const selectPOI = async (poiId) => {
    const poi = getPOIById(poiId);
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
    poi.resourceAmount -= 1;
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
    convertToBarracks,
    toggleBarracksRadar,
    resetPOIs,
  };
});
