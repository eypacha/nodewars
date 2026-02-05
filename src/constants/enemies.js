export const ENEMY_SPAWN_INTERVAL_MS = 1000 * 60 * 3; // Espacio entre las oleadas
export const ENEMY_SPEED_MPS = 30; // Velocidad de movimiento hacia el objetivo
export const ENEMY_SPEED_RATIO = 0.80; // Relativo a la velocidad base (más lento)
export const ENEMY_WAVE_BASE_SIZE = 8;
export const ENEMY_WAVE_GROWTH_RATE = 0.15; // 15% más enemigos por oleada
export const ENEMY_PROJECTILE_STAGGER_MS = 600;
export const ENEMY_ATTACK_COOLDOWN_MS = 1500;

// Tipos de enemigos
export const ENEMY_TYPES = {
  scout: {
    id: 'scout',
    speedMultiplier: 1.0,
    damage: 1,
    health: 1,
  },
  tank: {
    id: 'tank',
    speedMultiplier: 0.5,
    damage: 2,
    health: 2,
  },
};

// Probabilidad de spawn de Tank por oleada
export const TANK_PROBABILITY_START_WAVE = 1; // Sin tanks en oleada 1
export const TANK_PROBABILITY_MAX = 0.35; // Máximo 35% de probabilidad
export const TANK_PROBABILITY_GROWTH = 0.05; // +5% por oleada después de START_WAVE
