import { watch, onMounted } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import { useMapStore } from '@/stores/mapStore';
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

  /**
   * Guardar el estado actual del juego
   */
  const saveGame = async () => {
    const snapshot = createGameStateSnapshot(gameStore, mapStore);
    await saveGameState(snapshot);
  };

  /**
   * Cargar una partida guardada
   */
  const loadGame = async () => {
    const savedData = await loadGameState();
    if (savedData) {
      restoreGameState(savedData, gameStore, mapStore);
      return true;
    }
    return false;
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
  };

  return {
    saveGame,
    loadGame,
    setupAutoSave,
  };
}
