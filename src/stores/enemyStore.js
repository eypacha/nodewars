import { defineStore } from 'pinia';
import { ENEMY_SPEED_MPS } from '@/constants/enemies';
import { computeBearingRadians, moveTowards, toDegrees } from '@/utils/enemyUtils';
import { calculateDistance } from '@/utils/mapHelpers';

const createEnemyAtEdge = (center, radius, angle, targetType, targetId) => {
  const chosenAngle = typeof angle === 'number' ? angle : Math.random() * Math.PI * 2;
  const distance = radius;
  const deltaLat = toDegrees((distance * Math.cos(chosenAngle)) / 6371000);
  const deltaLng = toDegrees((distance * Math.sin(chosenAngle)) / (6371000 * Math.cos((center.lat * Math.PI) / 180)));

  return {
    id: `enemy-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    lat: center.lat + deltaLat,
    lng: center.lng + deltaLng,
    heading: toDegrees(computeBearingRadians({ lat: center.lat + deltaLat, lng: center.lng + deltaLng }, center)),
    targetType,
    targetId,
    lastUpdatedAt: Date.now(),
    spawnedAt: Date.now(),
  };
};

export const useEnemyStore = defineStore('enemy', {
  state: () => ({
    enemies: [],
  }),
  actions: {
    spawnEnemy({ center, radius, angle, targetType = 'base', targetId = 'base' }) {
      if (!center || !radius) return null;
      const enemy = createEnemyAtEdge(center, radius, angle, targetType, targetId);
      this.enemies.push(enemy);
      return enemy;
    },
    moveEnemies(deltaSeconds, { getTargetPosition, onBaseHit, onBarrackHit }) {
      this.enemies = this.enemies.filter((enemy) => {
        const targetPos = getTargetPosition(enemy.targetType, enemy.targetId);
        if (!targetPos) return false;

        const distanceToTarget = calculateDistance([enemy.lat, enemy.lng], [targetPos.lat, targetPos.lng]);
        const stepDistance = ENEMY_SPEED_MPS * deltaSeconds;

        if (distanceToTarget <= stepDistance) {
          if (enemy.targetType === 'base') {
            onBaseHit?.();
          } else if (enemy.targetType === 'barrack') {
            onBarrackHit?.(enemy.targetId);
          }
          return false; // remove enemy
        }

        const bearing = computeBearingRadians({ lat: enemy.lat, lng: enemy.lng }, targetPos);
        const nextPos = moveTowards({ lat: enemy.lat, lng: enemy.lng }, bearing, stepDistance);
        enemy.lat = nextPos.lat;
        enemy.lng = nextPos.lng;
        enemy.heading = toDegrees(bearing);
        enemy.lastUpdatedAt = Date.now();
        return true;
      });
    },
    clearEnemies() {
      this.enemies = [];
    },
  },
});
