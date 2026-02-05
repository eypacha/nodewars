import { defineStore } from 'pinia';
import { ref } from 'vue';
import { ENEMY_SPEED_MPS, ENEMY_TYPES } from '@/constants/enemies';
import { computeBearingRadians, moveTowards, toDegrees } from '@/utils/mathUtils';
import { calculateDistance } from '@/utils/mapHelpers';
import { db } from '@/services/dbService';
import { useGameClockStore } from '@/stores/gameClockStore';

const createEnemyAtEdge = (center, radius, angle, targetType, targetId, enemyType = 'scout', nowMs = Date.now()) => {
  const chosenAngle = typeof angle === 'number' ? angle : Math.random() * Math.PI * 2;
  const distance = radius;
  const deltaLat = toDegrees((distance * Math.cos(chosenAngle)) / 6371000);
  const deltaLng = toDegrees((distance * Math.sin(chosenAngle)) / (6371000 * Math.cos((center.lat * Math.PI) / 180)));

  const typeConfig = ENEMY_TYPES[enemyType] || ENEMY_TYPES.scout;

  return {
    id: `enemy-${nowMs}-${Math.random().toString(16).slice(2)}`,
    lat: center.lat + deltaLat,
    lng: center.lng + deltaLng,
    heading: toDegrees(computeBearingRadians({ lat: center.lat + deltaLat, lng: center.lng + deltaLng }, center)),
    targetType,
    targetId,
    lastUpdatedAt: nowMs,
    spawnedAt: nowMs,
    type: typeConfig.id,
    damage: typeConfig.damage,
    health: typeConfig.health,
    maxHealth: typeConfig.health,
  };
};

export const useEnemyStore = defineStore('enemy', () => {
  const gameClockStore = useGameClockStore();
  const enemies = ref([]);
  const waveNumber = ref(1);
  const nextWaveTimestamp = ref(0);
  const enemiesDestroyed = ref(0);
  let persistTimeout = null;

  const initialize = async () => {
    await Promise.all([loadEnemies(), loadWaveNumber(), loadNextWaveTimestamp(), loadEnemiesDestroyed()]);
  };

  const loadEnemies = async () => {
    try {
      const stored = await db.enemies.toArray();
      enemies.value = stored || [];
    } catch (err) {
      console.error('Error loading enemies from DB', err);
    }
  };

  const loadWaveNumber = async () => {
    try {
      const stored = await db.game.get('waveNumber');
      if (stored?.data) {
        waveNumber.value = stored.data;
      }
    } catch (err) {
      console.error('Error loading wave number from DB', err);
    }
  };

  const loadNextWaveTimestamp = async () => {
    try {
      const stored = await db.game.get('nextWaveTimestamp');
      if (stored?.data) {
        nextWaveTimestamp.value = stored.data;
      }
    } catch (err) {
      console.error('Error loading next wave timestamp from DB', err);
    }
  };

  const loadEnemiesDestroyed = async () => {
    try {
      const stored = await db.game.get('enemiesDestroyed');
      if (stored?.data != null) {
        enemiesDestroyed.value = stored.data;
      }
    } catch (err) {
      console.error('Error loading enemies destroyed from DB', err);
    }
  };

  const persistEnemies = async () => {
    try {
      await db.enemies.clear();
      if (enemies.value.length) {
        await db.enemies.bulkPut(enemies.value.map((e) => ({ ...e })));
      }
    } catch (err) {
      console.error('Error persisting enemies to DB', err);
    }
  };

  const persistWaveNumber = async () => {
    try {
      await db.game.put({ key: 'waveNumber', data: waveNumber.value });
    } catch (err) {
      console.error('Error persisting wave number to DB', err);
    }
  };

  const persistNextWaveTimestamp = async () => {
    try {
      await db.game.put({ key: 'nextWaveTimestamp', data: nextWaveTimestamp.value });
    } catch (err) {
      console.error('Error persisting next wave timestamp to DB', err);
    }
  };

  const persistEnemiesDestroyed = async () => {
    try {
      await db.game.put({ key: 'enemiesDestroyed', data: enemiesDestroyed.value });
    } catch (err) {
      console.error('Error persisting enemies destroyed to DB', err);
    }
  };

  const schedulePersist = () => {
    if (persistTimeout) return;
    persistTimeout = setTimeout(async () => {
      persistTimeout = null;
      await persistEnemies();
    }, 1000);
  };

  const spawnEnemy = ({ center, radius, angle, targetType = 'base', targetId = 'base', enemyType = 'scout' }) => {
    if (!center) return null;
    const enemy = createEnemyAtEdge(center, radius, angle, targetType, targetId, enemyType, gameClockStore.now());
    enemies.value.push(enemy);
    schedulePersist();
    return enemy;
  };

  const moveEnemies = (deltaSeconds, { getTargetPosition, onBaseHit, onBarrackHit, speedMps }) => {
    enemies.value = enemies.value.filter((enemy) => {
      const targetPos = getTargetPosition(enemy.targetType, enemy.targetId);
      if (!targetPos) return false;

      const distanceToTarget = calculateDistance([enemy.lat, enemy.lng], [targetPos.lat, targetPos.lng]);
      const baseSpeed = Number.isFinite(speedMps) ? speedMps : ENEMY_SPEED_MPS;
      const typeConfig = ENEMY_TYPES[enemy.type] || ENEMY_TYPES.scout;
      const speed = baseSpeed * typeConfig.speedMultiplier;
      const stepDistance = speed * deltaSeconds;

      if (distanceToTarget <= stepDistance) {
        if (enemy.targetType === 'base') {
          onBaseHit?.(enemy);
        } else if (enemy.targetType === 'barrack') {
          onBarrackHit?.(enemy.targetId, enemy);
        }
        return false;
      }

      const bearing = computeBearingRadians({ lat: enemy.lat, lng: enemy.lng }, targetPos);
      const nextPos = moveTowards({ lat: enemy.lat, lng: enemy.lng }, bearing, stepDistance);
      enemy.lat = nextPos.lat;
      enemy.lng = nextPos.lng;
      enemy.heading = toDegrees(bearing);
      enemy.lastUpdatedAt = gameClockStore.now();
      return true;
    });

    schedulePersist();
  };

  const removeEnemy = (id) => {
    const hadEnemy = enemies.value.some((e) => e.id === id);
    enemies.value = enemies.value.filter((e) => e.id !== id);
    if (hadEnemy) {
      enemiesDestroyed.value += 1;
      persistEnemiesDestroyed();
    }
    db.enemies.delete(id).catch((err) => console.error('Error deleting enemy from DB', err));
    schedulePersist();
  };

  const damageEnemy = (id, amount = 1) => {
    const enemy = enemies.value.find((e) => e.id === id);
    if (!enemy) return false;

    enemy.health = Math.max(0, (enemy.health ?? 1) - amount);
    enemy.lastDamagedAt = gameClockStore.now();
    
    if (enemy.health <= 0) {
      removeEnemy(id);
      return true; // Enemy destroyed
    }
    
    schedulePersist();
    return false; // Enemy still alive
  };

  const setNextWaveTimestamp = (timestamp) => {
    nextWaveTimestamp.value = timestamp || 0;
    persistNextWaveTimestamp();
  };

  const setWaveNumber = (value) => {
    const safeValue = Number.isFinite(value) && value > 0 ? Math.floor(value) : 1;
    waveNumber.value = safeValue;
    persistWaveNumber();
  };

  const incrementWaveNumber = () => {
    setWaveNumber(waveNumber.value + 1);
  };

  const resetEnemiesDestroyed = () => {
    enemiesDestroyed.value = 0;
    persistEnemiesDestroyed();
  };

  const resetWaveState = () => {
    setWaveNumber(1);
    setNextWaveTimestamp(0);
    resetEnemiesDestroyed();
  };

  const clearEnemies = async () => {
    enemies.value = [];
    if (persistTimeout) {
      clearTimeout(persistTimeout);
      persistTimeout = null;
    }
    try {
      await db.enemies.clear();
    } catch (err) {
      console.error('Error clearing enemies DB', err);
    }
  };

  return {
    enemies,
    waveNumber,
    nextWaveTimestamp,
    enemiesDestroyed,
    initialize,
    loadEnemies,
    spawnEnemy,
    moveEnemies,
    removeEnemy,
    damageEnemy,
    clearEnemies,
    persistEnemies,
    persistWaveNumber,
    persistNextWaveTimestamp,
    persistEnemiesDestroyed,
    schedulePersist,
    setNextWaveTimestamp,
    setWaveNumber,
    incrementWaveNumber,
    resetEnemiesDestroyed,
    resetWaveState,
  };
});
