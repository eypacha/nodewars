import { defineStore } from 'pinia';
const EARTH_RADIUS_METERS = 6371000;

const toDegrees = (radians) => radians * (180 / Math.PI);

const createEnemyAtEdge = (center, radius, angle) => {
  const chosenAngle = typeof angle === 'number' ? angle : Math.random() * Math.PI * 2;
  const distance = radius;

  const deltaLat = toDegrees((distance * Math.cos(chosenAngle)) / EARTH_RADIUS_METERS);
  const deltaLng = toDegrees((distance * Math.sin(chosenAngle)) / (EARTH_RADIUS_METERS * Math.cos((center.lat * Math.PI) / 180)));

  return {
    id: `enemy-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    lat: center.lat + deltaLat,
    lng: center.lng + deltaLng,
    heading: toDegrees(chosenAngle),
    spawnedAt: Date.now(),
  };
};

export const useEnemyStore = defineStore('enemy', {
  state: () => ({
    enemies: [],
  }),
  actions: {
    spawnEnemy({ center, radius, angle }) {
      if (!center || !radius) return null;
      const enemy = createEnemyAtEdge(center, radius, angle);
      this.enemies.push(enemy);
      return enemy;
    },
    clearEnemies() {
      this.enemies = [];
    },
  },
});
