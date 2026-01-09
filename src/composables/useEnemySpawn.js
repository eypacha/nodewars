import { ref, onBeforeUnmount, watch } from 'vue';
import { ENEMY_SPAWN_INTERVAL_MS, ENEMY_WAVE_BASE_SIZE, ENEMY_WAVE_GROWTH_RATE } from '@/constants/enemies';
import { useEnemyStore } from '@/stores/enemyStore';
import { getRadarConfig } from '@/services/mapService';
import { computeBearingRadians, createUniformSpawnOnUnionBoundarySelector } from '@/utils/mathUtils';

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

  const getEnemyBarracksRadars = () => {
    if (!Array.isArray(pois.value)) return [];
    return pois.value
      .filter((poi) => poi.type === 'barrack' && !poi.owned)
      .map((poi) => ({
        id: `enemy-barrack-${poi.id}`,
        center: { lat: poi.lat, lng: poi.lng },
        radius: BARRACKS_RADAR_RADIUS,
      }));
  };

  const updateSpawnSelector = () => {
    const radars = getRadarsForSpawn();
    const blockers = getEnemyBarracksRadars();
    spawnSelector.value = createUniformSpawnOnUnionBoundarySelector(radars, { blockers });
  };

  const getTargetForEnemyBarrack = (barrack) => {

    if (!barrack?.conqueredFrom || barrack.conqueredFrom === 'base') {
      if (baseMarkerPosition.value) {
        return { type: 'base', id: 'base', position: baseMarkerPosition.value };
      }
      return null;
    }

    const target = (pois.value || []).find(
      (p) => p.type === 'barrack' && p.owned && String(p.id) === String(barrack.conqueredFrom)
    );

    if (target) {
      return { type: 'barrack', id: target.id, position: { lat: target.lat, lng: target.lng } };
    }

    return null;
  };

  const spawnExtraProjectilesFromEnemyBarracks = () => {
    if (!Array.isArray(pois.value)) {
      console.log('[ENEMY BARRACKS] pois.value is not array:', pois.value);
      return;
    }

    const enemyBarracks = pois.value.filter((poi) => poi.type === 'barrack' && !poi.owned);
    console.log(`[ENEMY BARRACKS] Found ${enemyBarracks.length} enemy barracks`);

    enemyBarracks.forEach((barrack) => {
      console.log('[ENEMY BARRACKS] Processing barrack:', barrack);
      const target = getTargetForEnemyBarrack(barrack);
      if (!target) {
        console.log('[ENEMY BARRACKS] No target found for barrack', barrack.id, barrack);
        return;
      }

      // El proyectil debe salir a 1 metro del centro de la barraca enemiga en dirección al objetivo
      const angle = computeBearingRadians({ lat: barrack.lat, lng: barrack.lng }, target.position);

      // Calcular nueva posición a 1 metro del centro
      const earthRadius = 6371000; // metros
      const deltaLat = (1 * Math.cos(angle)) / earthRadius * (180 / Math.PI);
      const deltaLng = (1 * Math.sin(angle)) / (earthRadius * Math.cos((barrack.lat * Math.PI) / 180)) * (180 / Math.PI);
      const spawnLat = barrack.lat + deltaLat;
      const spawnLng = barrack.lng + deltaLng;

      console.log('[ENEMY BARRACKS] Spawning enemy projectile (offset 1m):', {
        center: { lat: spawnLat, lng: spawnLng },
        radius: 0,
        angle,
        targetType: target.type,
        targetId: target.id,
      });

      enemyStore.spawnEnemy({
        center: { lat: spawnLat, lng: spawnLng },
        radius: 0,
        angle,
        targetType: target.type,
        targetId: target.id,
      });
    });
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
    const growth = Math.pow(1 + ENEMY_WAVE_GROWTH_RATE, Math.max(0, enemyStore.waveNumber - 1));
    const waveSize = Math.max(1, Math.ceil(ENEMY_WAVE_BASE_SIZE * growth));
    const staggerMs = 400;

    if (spawnSelector.value) {
      for (let i = 0; i < waveSize; i += 1) {
        const selection = spawnSelector.value();
        if (!selection) break;
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
    }

    spawnExtraProjectilesFromEnemyBarracks();

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
