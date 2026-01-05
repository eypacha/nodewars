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
        }));
      
      // Crear un Set con los IDs existentes para verificar duplicados
      const existingIds = new Set(pois.value.map(poi => poi.id));
      
      // Agregar solo los POIs nuevos (que no estén ya en la lista)
      const uniqueNewPOIs = newPOIs.filter(poi => !existingIds.has(poi.id));
      
      // Sumar los nuevos POIs a los existentes
      pois.value = [...pois.value, ...uniqueNewPOIs];
      
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
  };
});
