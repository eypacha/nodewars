import { ref, onBeforeUnmount, watch } from 'vue';
import { ENEMY_SPAWN_INTERVAL_MS, ENEMY_WAVE_BASE_SIZE, ENEMY_WAVE_GROWTH_RATE, ENEMY_PROJECTILE_STAGGER_MS } from '@/constants/enemies';
import { BARRACKS_MIN_RADIUS, BARRACKS_RADIUS_RATIO } from '@/constants/player';
import { useEnemyStore } from '@/stores/enemyStore';
import { getRadarConfig } from '@/services/mapService';
import { computeBearingRadians, createUniformSpawnOnUnionBoundarySelector } from '@/utils/mathUtils';


export const useEnemySpawn = ({ baseMarkerPosition, pois, radarLevel }) => {
  const enemyStore = useEnemyStore();
  const timeoutId = ref(null);
  const spawnSelector = ref(null);
  const isSpawnLoopActive = ref(false);
  const isWaitingForWaveClear = ref(false);


  const getRadarsForSpawn = () => {
    const list = [];

    const baseRadius = getRadarConfig(radarLevel.value).radius;
    if (baseMarkerPosition.value) {
      list.push({
        id: 'base',
        center: baseMarkerPosition.value,
        radius: baseRadius,
        owner: 'player',
        kind: 'base',
        poiId: 'base',
      });
    }

    (pois.value || []).forEach((poi) => {
      if (poi.type !== 'barrack') return;

      const isOwned = !!poi.owned;
      const barrackRadius = poi.barrackRadarRadius
        ?? Math.max(BARRACKS_MIN_RADIUS, Math.round(baseRadius * BARRACKS_RADIUS_RATIO));

      list.push({
        id: `${isOwned ? 'barrack' : 'enemy-barrack'}-${poi.id}`,
        center: { lat: poi.lat, lng: poi.lng },
        radius: barrackRadius,
        owner: isOwned ? 'player' : 'enemy',
        kind: 'barrack',
        poiId: poi.id,
      });
    });

    return list;
  };

  const updateSpawnSelector = () => {
    const radars = getRadarsForSpawn();
    spawnSelector.value = createUniformSpawnOnUnionBoundarySelector(radars);
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

    if (baseMarkerPosition.value) {
      return { type: 'base', id: 'base', position: baseMarkerPosition.value };
    }

    return null;
  };

  const spawnExtraProjectilesFromEnemyBarracks = () => {
    if (!Array.isArray(pois.value)) return;
    
    const enemyBarracks = pois.value.filter((poi) => poi.type === 'barrack' && !poi.owned);
    const extraShotsPerBarrack = Math.max(1, Math.floor(1 + enemyStore.waveNumber / 2));

    enemyBarracks.forEach((barrack, barrackIndex) => {
      const target = getTargetForEnemyBarrack(barrack);
      if (!target) return;

      for (let shotIndex = 0; shotIndex < extraShotsPerBarrack; shotIndex += 1) {
        const delayMs = (barrackIndex * extraShotsPerBarrack + shotIndex) * ENEMY_PROJECTILE_STAGGER_MS;
        setTimeout(() => {
          const angle = computeBearingRadians({ lat: barrack.lat, lng: barrack.lng }, target.position);

          const earthRadius = 6371000; // metros
          const deltaLat = (1 * Math.cos(angle)) / earthRadius * (180 / Math.PI);
          const deltaLng = (1 * Math.sin(angle)) / (earthRadius * Math.cos((barrack.lat * Math.PI) / 180)) * (180 / Math.PI);
          const spawnLat = barrack.lat + deltaLat;
          const spawnLng = barrack.lng + deltaLng;

          enemyStore.spawnEnemy({
            center: { lat: spawnLat, lng: spawnLng },
            radius: 0,
            angle,
            targetType: target.type,
            targetId: target.id,
          });
        }, delayMs);
      }
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

  const getTargetForRadar = (radar) => {
    if (!radar) return { targetType: 'base', targetId: 'base' };

    if (radar.kind === 'base') {
      return { targetType: 'base', targetId: 'base' };
    }

    if (radar.owner === 'player' && radar.kind === 'barrack') {
      return { targetType: 'barrack', targetId: radar.poiId };
    }

    // Enemy radars or any fallback
    return { targetType: 'base', targetId: 'base' };
  };

  const spawnEnemyAtRadarEdge = () => {
    const growth = Math.pow(1 + ENEMY_WAVE_GROWTH_RATE, Math.max(0, enemyStore.waveNumber - 1));
    const waveSize = Math.max(1, Math.ceil(ENEMY_WAVE_BASE_SIZE * growth));

    if (spawnSelector.value) {
      for (let i = 0; i < waveSize; i += 1) {
        const selection = spawnSelector.value();
        if (!selection) break;
        const { radar, angle } = selection;
        const target = getTargetForRadar(radar);
        setTimeout(() => {
          enemyStore.spawnEnemy({
            center: radar.center,
            radius: radar.radius,
            angle,
            targetType: target.targetType,
            targetId: target.targetId,
          });
        }, i * ENEMY_PROJECTILE_STAGGER_MS);
      }
    }

    spawnExtraProjectilesFromEnemyBarracks();

    enemyStore.incrementWaveNumber();
    enemyStore.setNextWaveTimestamp(0);
    isWaitingForWaveClear.value = true;
  };

  const clearSpawnTimeout = () => {
    if (timeoutId.value) {
      clearTimeout(timeoutId.value);
      timeoutId.value = null;
    }
  };

  const scheduleNextWaveSpawn = () => {
    if (!isSpawnLoopActive.value) return;
    clearSpawnTimeout();

    const now = Date.now();
    const target = enemyStore.nextWaveTimestamp && enemyStore.nextWaveTimestamp > now
      ? enemyStore.nextWaveTimestamp
      : now + ENEMY_SPAWN_INTERVAL_MS;

    enemyStore.setNextWaveTimestamp(target);

    timeoutId.value = setTimeout(() => {
      timeoutId.value = null;
      if (!isSpawnLoopActive.value) return;
      spawnEnemyAtRadarEdge();
    }, Math.max(0, target - now));
  };

  const startEnemySpawnLoop = () => {
    stopEnemySpawnLoop();
    isSpawnLoopActive.value = true;

    const currentEnemies = enemyStore.enemies?.length || 0;
    if (currentEnemies > 0) {
      isWaitingForWaveClear.value = true;
      enemyStore.setNextWaveTimestamp(0);
      return;
    }

    isWaitingForWaveClear.value = false;
    scheduleNextWaveSpawn();
  };

  const stopEnemySpawnLoop = () => {
    clearSpawnTimeout();
    isSpawnLoopActive.value = false;
    isWaitingForWaveClear.value = false;
    enemyStore.setNextWaveTimestamp(0);
  };

  watch(
    () => enemyStore.enemies?.length || 0,
    (count, prev) => {
      if (!isSpawnLoopActive.value) return;

      if (count === 0) {
        if (isWaitingForWaveClear.value || prev > 0 || !timeoutId.value) {
          isWaitingForWaveClear.value = false;
          scheduleNextWaveSpawn();
        }
        return;
      }

      // There are active enemies, ensure countdown is stopped
      isWaitingForWaveClear.value = true;
      if (timeoutId.value) {
        clearSpawnTimeout();
      }
      if (enemyStore.nextWaveTimestamp) {
        enemyStore.setNextWaveTimestamp(0);
      }
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    stopEnemySpawnLoop();
  });

  return {
    startEnemySpawnLoop,
    stopEnemySpawnLoop,
    spawnEnemyAtRadarEdge,
  };
};
