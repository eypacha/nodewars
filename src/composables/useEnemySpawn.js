import { ref, onBeforeUnmount, watch } from 'vue';
import { ENEMY_SPAWN_INTERVAL_MS, ENEMY_WAVE_BASE_SIZE, ENEMY_WAVE_GROWTH_RATE } from '@/constants/enemies';
import { useEnemyStore } from '@/stores/enemyStore';
import { getRadarConfig } from '@/services/mapService';
import { createUniformSpawnOnUnionBoundarySelector } from '@/utils/mathUtils';

const BARRACKS_RADAR_RADIUS = 500;

export const useEnemySpawn = ({ baseMarkerPosition, pois, radarLevel }) => {
  const enemyStore = useEnemyStore();
  const intervalId = ref(null);
  const timeoutId = ref(null);
  const spawnSelector = ref(null);
  const nextWaveTimestamp = ref(0);

  const getRadarsForSpawn = () => {
    const list = [];

    if (baseMarkerPosition.value) {
      const baseConfig = getRadarConfig(radarLevel.value);
      list.push({
        id: 'base',
        center: baseMarkerPosition.value,
        radius: baseConfig.radius,
        targetType: 'base',
        targetId: 'base',
      });
    }

    (pois.value || []).forEach((poi) => {
      if (poi.type !== 'barrack' || !poi.owned) return;
      list.push({
        id: `barrack-${poi.id}`,
        center: { lat: poi.lat, lng: poi.lng },
        radius: BARRACKS_RADAR_RADIUS,
        targetType: 'barrack',
        targetId: poi.id,
      });
    });

    return list;
  };

  const updateSpawnSelector = () => {
    const radars = getRadarsForSpawn();
    spawnSelector.value = createUniformSpawnOnUnionBoundarySelector(radars);
  };

  const getBarracksSignature = () => {
    if (!Array.isArray(pois.value)) return [];
    return pois.value
      .filter((poi) => poi.type === 'barrack')
      .map((poi) => `${poi.id}:${poi.lat}:${poi.lng}:${poi.owned}`)
      .sort();
  };

  watch(
    [baseMarkerPosition, radarLevel, getBarracksSignature],
    updateSpawnSelector,
    { immediate: true, deep: true }
  );

  const spawnEnemyAtRadarEdge = () => {
    if (!spawnSelector.value) return;

    const growth = Math.pow(1 + ENEMY_WAVE_GROWTH_RATE, Math.max(0, enemyStore.waveNumber - 1));
    const waveSize = Math.max(1, Math.ceil(ENEMY_WAVE_BASE_SIZE * growth));
    const staggerMs = 400;

    for (let i = 0; i < waveSize; i += 1) {
      const selection = spawnSelector.value();
      if (!selection) return;
      const { radar, angle } = selection;
      setTimeout(() => {
        enemyStore.spawnEnemy({
          center: radar.center,
          radius: radar.radius,
          angle,
          targetType: radar.targetType,
          targetId: radar.targetId,
        });
      }, i * staggerMs);
    }

    enemyStore.incrementWaveNumber();
    enemyStore.setNextWaveTimestamp(Date.now() + ENEMY_SPAWN_INTERVAL_MS);
  };

  const startEnemySpawnLoop = () => {
    stopEnemySpawnLoop();
    const now = Date.now();
    const target = enemyStore.nextWaveTimestamp || 0;
    const initialDelay = target > now ? target - now : ENEMY_SPAWN_INTERVAL_MS;

    if (!target || target <= now) {
      enemyStore.setNextWaveTimestamp(now + ENEMY_SPAWN_INTERVAL_MS);
    }

    timeoutId.value = setTimeout(() => {
      spawnEnemyAtRadarEdge();
      intervalId.value = setInterval(spawnEnemyAtRadarEdge, ENEMY_SPAWN_INTERVAL_MS);
    }, initialDelay);
  };

  const stopEnemySpawnLoop = () => {
    if (timeoutId.value) {
      clearTimeout(timeoutId.value);
      timeoutId.value = null;
    }
    if (intervalId.value) {
      clearInterval(intervalId.value);
      intervalId.value = null;
    }
    enemyStore.setNextWaveTimestamp(0);
  };

  onBeforeUnmount(() => {
    stopEnemySpawnLoop();
  });

  return {
    startEnemySpawnLoop,
    stopEnemySpawnLoop,
    spawnEnemyAtRadarEdge,
  };
};
