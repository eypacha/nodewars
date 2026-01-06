import Dexie from 'dexie';

// Crear la base de datos
export const db = new Dexie('NodeWarsDB');

// Definir el esquema
db.version(1).stores({
  gameState: 'id, timestamp',
});

// ID fijo para el juego actual (solo hay una partida activa)
const GAME_ID = 'current_game';

/**
 * Guardar el estado del juego
 */
export async function saveGameState(gameData) {
  try {
    await db.gameState.put({
      id: GAME_ID,
      timestamp: Date.now(),
      ...gameData,
    });
    console.log('✅ Game saved');
    return true;
  } catch (error) {
    console.error('❌ Error saving game:', error);
    return false;
  }
}

/**
 * Cargar el estado del juego
 */
export async function loadGameState() {
  try {
    const savedGame = await db.gameState.get(GAME_ID);
    if (savedGame) {
      console.log('✅ Game loaded:', savedGame);
      return savedGame;
    }
    console.log('ℹ️ No saved game found');
    return null;
  } catch (error) {
    console.error('❌ Error loading game:', error);
    return null;
  }
}

/**
 * Verificar si existe una partida guardada
 */
export async function hasSavedGame() {
  try {
    const savedGame = await db.gameState.get(GAME_ID);
    return !!savedGame;
  } catch (error) {
    console.error('❌ Error checking saved game:', error);
    return false;
  }
}

/**
 * Eliminar la partida guardada
 */
export async function deleteSavedGame() {
  try {
    await db.gameState.delete(GAME_ID);
    console.log('✅ Saved game deleted');
    return true;
  } catch (error) {
    console.error('❌ Error deleting saved game:', error);
    return false;
  }
}

/**
 * Crear el objeto de estado del juego para guardar
 */
export function createGameStateSnapshot(gameStore, mapStore) {
  return {
    // Estado del mapa (convertir refs a valores planos)
    mapCenter: Array.isArray(mapStore.center) ? [...mapStore.center] : mapStore.center,
    mapZoom: mapStore.zoom,
    marker: mapStore.marker ? (Array.isArray(mapStore.marker) ? [...mapStore.marker] : mapStore.marker) : null,
    baseConfirmed: mapStore.baseConfirmed,
    
    // Estado del juego (convertir refs a valores planos)
    resources: JSON.parse(JSON.stringify(gameStore.resources)),
    radarLevel: gameStore.radarLevel,
    
    // Flags de UI (para no mostrar popups al cargar)
    showStartPopup: false,
    showBaseLocationPopup: false,
    showLocationPopup: false,
  };
}

/**
 * Restaurar el estado del juego desde los datos guardados
 */
export function restoreGameState(savedData, gameStore, mapStore) {
  if (!savedData) return false;

  try {
    // Restaurar estado del mapa (crear nuevos arrays para evitar referencias)
    if (savedData.mapCenter) mapStore.center = [...savedData.mapCenter];
    if (savedData.mapZoom !== undefined) mapStore.zoom = savedData.mapZoom;
    if (savedData.marker) mapStore.marker = [...savedData.marker];
    if (savedData.baseConfirmed !== undefined) mapStore.baseConfirmed = savedData.baseConfirmed;
    
    // Restaurar estado del juego (crear nuevo objeto para evitar referencias)
    if (savedData.resources) {
      gameStore.resources = JSON.parse(JSON.stringify(savedData.resources));
    }
    if (savedData.radarLevel !== undefined) gameStore.radarLevel = savedData.radarLevel;
    
    // Ocultar popups
    gameStore.showStartPopup = false;
    gameStore.showBaseLocationPopup = false;
    gameStore.showLocationPopup = false;
    
    console.log('✅ Game state restored');
    return true;
  } catch (error) {
    console.error('❌ Error restoring game state:', error);
    return false;
  }
}
