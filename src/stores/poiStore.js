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
  const fetchPOIs = async (center, radius) => {
    isLoading.value = true;
    error.value = null;
    
    try {
      const fetchedPOIs = await fetchPointsOfInterest(center.lat, center.lng, radius);
      
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
          health: 100,
          maxHealth: 100,
          owned: false,
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
    } finally {
      isLoading.value = false;
    }
  };

  const clearPOIs = () => {
    pois.value = [];
    lastFetchCenter.value = null;
    lastFetchRadius.value = null;
    error.value = null;
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

  const selectPOI = (poiId) => {
    selectedPOI.value = getPOIById(poiId);
    if (selectedPOI.value) {
      showPOIDialog.value = true;
    }
  };

  const closePOIDialog = () => {
    showPOIDialog.value = false;
    selectedPOI.value = null;
  };

  const damagePOI = (poiId, damage = 10) => {
    const poi = getPOIById(poiId);
    if (poi) {
      // Solo reducir health si no está owned
      if (!poi.owned) {
        poi.health = Math.max(0, poi.health - damage);
        
        // Si el health llega a 0, marcar como owned
        if (poi.health <= 0) {
          poi.owned = true;
          // Cerrar el diálogo si este POI estaba seleccionado
          if (selectedPOI.value?.id === poiId) {
            closePOIDialog();
          }
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
    clearPOIs,
    filterPOIsInRadius,
    getPOIById,
    selectPOI,
    closePOIDialog,
    damagePOI,
  };
});
