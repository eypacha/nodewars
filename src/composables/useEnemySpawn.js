import { ref, onBeforeUnmount, watch } from 'vue';
import { ENEMY_SPAWN_INTERVAL_MS, ENEMY_WAVE_BASE_SIZE, ENEMY_WAVE_GROWTH_RATE, ENEMY_PROJECTILE_STAGGER_MS } from '@/constants/enemies';
import { BARRACKS_RADAR_RADIUS } from '@/constants/player';
import { useEnemyStore } from '@/stores/enemyStore';
import { getRadarConfig } from '@/services/mapService';
import { computeBearingRadians, createUniformSpawnOnUnionBoundarySelector } from '@/utils/mathUtils';


export const useEnemySpawn = ({ baseMarkerPosition, pois, radarLevel }) => {
  const enemyStore = useEnemyStore();
  const intervalId = ref(null);
  const timeoutId = ref(null);
  const spawnSelector = ref(null);


  const getRadarsForSpawn = () => {
    const list = [];

    if (baseMarkerPosition.value) {
      const baseConfig = getRadarConfig(radarLevel.value);
      list.push({
        id: 'base',
        center: baseMarkerPosition.value,
        radius: baseConfig.radius,
        owner: 'player',
        kind: 'base',
        poiId: 'base',
      });
    }

    (pois.value || []).forEach((poi) => {
      if (poi.type !== 'barrack') return;

      const isOwned = !!poi.owned;

      list.push({
        id: `${isOwned ? 'barrack' : 'enemy-barrack'}-${poi.id}`,
        center: { lat: poi.lat, lng: poi.lng },
        radius: BARRACKS_RADAR_RADIUS,
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

    return null;
  };

  const spawnExtraProjectilesFromEnemyBarracks = () => {
    if (!Array.isArray(pois.value)) return;
    
    const enemyBarracks = pois.value.filter((poi) => poi.type === 'barrack' && !poi.owned);

    enemyBarracks.forEach((barrack, index) => {
      const target = getTargetForEnemyBarrack(barrack);
      if (!target) return;

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
      }, index * ENEMY_PROJECTILE_STAGGER_MS);
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
