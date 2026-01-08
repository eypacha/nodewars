export const ENEMY_CONFIG = {
  spawnOnScan: {
    enabled: true,
    probability: 0.5, // Probabilidad por scan completado (cambiado a 50% para debug)
    radarRadius: 500,
    color: '#ef4444',
    minDistanceFromOwned: 150,
    maxAttempts: 20,
    edgeMargin: 30,
  },
};

export const getEnemySpawnConfig = () => ENEMY_CONFIG.spawnOnScan;
