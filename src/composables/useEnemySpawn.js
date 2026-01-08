import { ref, onBeforeUnmount } from 'vue';
import { ENEMY_SPAWN_INTERVAL_MS } from '@/constants/enemies';
import { useEnemyStore } from '@/stores/enemyStore';
import { getRadarConfig } from '@/services/mapService';
import { calculateDistance } from '@/utils/mapHelpers';
import { computePointOnEdge, findAngleOutsideOtherRadars } from '@/utils/enemyUtils';

const BARRACKS_RADAR_RADIUS = 500;

export const useEnemySpawn = ({ baseMarkerPosition, pois, radarLevel }) => {
  const enemyStore = useEnemyStore();
  const intervalId = ref(null);
  const timeoutId = ref(null);

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
      if (poi.type !== 'barrack') return;
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

  const pickNonOverlappingRadar = (radars) => {
    if (!radars.length) return null;

    const nonOverlapping = radars.filter((radar, idx) => radars.every((other, otherIdx) => {
      if (idx === otherIdx) return true;
      const dist = calculateDistance([radar.center.lat, radar.center.lng], [other.center.lat, other.center.lng]);
      return dist >= (radar.radius + other.radius);
    }));

    const sourceList = nonOverlapping.length ? nonOverlapping : radars;
    return sourceList[Math.floor(Math.random() * sourceList.length)] || null;
  };

  const spawnEnemyAtRadarEdge = () => {
    const radars = getRadarsForSpawn();
    if (!radars.length) return;

    const waveSize = Math.max(1, Math.floor(Math.random() * 5) + 1);
    const selectedCount = Math.min(waveSize, radars.length);

    const shuffled = [...radars].sort(() => Math.random() - 0.5);
    const targets = shuffled.slice(0, selectedCount);

    targets.forEach((radar) => {
      const angle = findAngleOutsideOtherRadars(radar, radars) ?? (Math.random() * Math.PI * 2);
      enemyStore.spawnEnemy({
        center: radar.center,
        radius: radar.radius,
        angle,
        targetType: radar.targetType,
        targetId: radar.targetId,
      });
    });
  };

  const startEnemySpawnLoop = () => {
    stopEnemySpawnLoop();
    timeoutId.value = setTimeout(() => {
      spawnEnemyAtRadarEdge();
      intervalId.value = setInterval(spawnEnemyAtRadarEdge, ENEMY_SPAWN_INTERVAL_MS);
    }, ENEMY_SPAWN_INTERVAL_MS);
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
