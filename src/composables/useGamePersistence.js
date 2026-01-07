import { watch, onMounted, ref } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import { useMapStore } from '@/stores/mapStore';
import { usePoiStore } from '@/stores/poiStore';
import { 
  saveGameState, 
  loadGameState, 
  createGameStateSnapshot,
  restoreGameState 
} from '@/services/gameDatabase';

/**
 * Composable para manejar la persistencia del juego
 * Guarda automáticamente en eventos clave
 */
export function useGamePersistence() {
  const gameStore = useGameStore();
  const mapStore = useMapStore();
  const poiStore = usePoiStore();
  
  // Flag para pausar el auto-guardado durante la carga
  const isLoading = ref(false);

  /**
   * Guardar el estado actual del juego
   */
  const saveGame = async () => {
    if (isLoading.value) {
      console.log('⏸️ Auto-save paused during loading');
      return;
    }
    const snapshot = createGameStateSnapshot(gameStore, mapStore, poiStore);
    await saveGameState(snapshot);
  };

  /**
   * Cargar una partida guardada
   */
  const loadGame = async () => {
    console.log('🔒 Locking auto-save for restoration');
    isLoading.value = true;
    
    const savedData = await loadGameState();
    if (savedData) {
      const result = restoreGameState(savedData, gameStore, mapStore, poiStore);
      
      // Esperar un momento antes de reactivar el auto-save
      setTimeout(() => {
        isLoading.value = false;
        console.log('✅ Auto-save reactivated');
      }, 2000);
      
      return result;
    }
    
    isLoading.value = false;
    return { success: false };
  };

  /**
   * Configurar guardado automático basado en eventos
   */
  const setupAutoSave = () => {
    // Guardar cuando se confirma la base
    watch(() => mapStore.baseConfirmed, (confirmed) => {
      if (confirmed) {
        console.log('🔄 Auto-saving: Base confirmed');
        saveGame();
      }
    });

    // Guardar cuando cambia la posición del marker (base)
    watch(() => mapStore.marker, (marker) => {
      if (marker && mapStore.baseConfirmed) {
        console.log('🔄 Auto-saving: Base position changed');
        saveGame();
      }
    }, { deep: true });

    // Guardar cuando cambia el centro del mapa
    watch(() => mapStore.center, (center) => {
      if (mapStore.baseConfirmed) {
        console.log('🔄 Auto-saving: Map center changed');
        saveGame();
      }
    }, { deep: true });

    // Guardar cuando cambia el zoom del mapa
    watch(() => mapStore.zoom, (zoom) => {
      if (mapStore.baseConfirmed) {
        console.log('🔄 Auto-saving: Map zoom changed');
        saveGame();
      }
    });

    // Guardar cuando suben los recursos (con debounce)
    let resourcesTimeout = null;
    watch(() => gameStore.resources, () => {
      if (mapStore.baseConfirmed) {
        clearTimeout(resourcesTimeout);
        resourcesTimeout = setTimeout(() => {
          console.log('🔄 Auto-saving: Resources changed');
          saveGame();
        }, 2000); // Esperar 2 segundos después del último cambio
      }
    }, { deep: true });

    // Guardar cuando sube el nivel del radar
    watch(() => gameStore.radarLevel, (newLevel) => {
      if (mapStore.baseConfirmed && newLevel > 1) {
        console.log('🔄 Auto-saving: Radar upgraded');
        saveGame();
      }
    });

    // Guardar cuando se descubren nuevos POIs
    watch(() => poiStore.pois.length, (newCount, oldCount) => {
      if (mapStore.baseConfirmed && newCount > oldCount) {
        console.log('🔄 Auto-saving: New POIs discovered');
        saveGame();
      }
    });

    // Guardar cuando un POI es conquistado o cambia de estado (con debounce)
    let poisTimeout = null;
    let lastPoisString = '';
    watch(() => poiStore.pois, (newPois) => {
      if (mapStore.baseConfirmed && newPois.length > 0) {
        // Evitar guardar durante la carga inicial comparando JSON
        const currentPoisString = JSON.stringify(newPois);
        if (currentPoisString !== lastPoisString) {
          lastPoisString = currentPoisString;
          clearTimeout(poisTimeout);
          poisTimeout = setTimeout(() => {
            console.log('🔄 Auto-saving: POI state changed');
            saveGame();
          }, 3000); // Esperar 3 segundos después del último cambio
        }
      }
    }, { deep: true });
  };

  return {
    saveGame,
    loadGame,
    setupAutoSave,
  };
}
