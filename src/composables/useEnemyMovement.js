import { onBeforeUnmount } from 'vue';
import { useEnemyStore } from '@/stores/enemyStore';
import { ENEMY_SPEED_MPS } from '@/constants/enemies';
import { getRadarConfig } from '@/services/mapService';

export const useEnemyMovement = ({ getTargetPosition, onBaseHit, onBarrackHit, radarLevel }) => {
  const enemyStore = useEnemyStore();
  let rafId = null;
  let lastTs = null;
  let accumulator = 0;
  const fixedStep = 1 / 30;

  const getSpeedMps = () => {
    const level = radarLevel?.value ?? 1;
    const baseRadius = getRadarConfig(1).radius;
    const currentRadius = getRadarConfig(level).radius;
    return ENEMY_SPEED_MPS * (currentRadius / baseRadius);
  };

  const step = (ts) => {
    if (lastTs === null) {
      lastTs = ts;
      rafId = requestAnimationFrame(step);
      return;
    }

    const deltaSeconds = (ts - lastTs) / 1000;
    lastTs = ts;
    accumulator += deltaSeconds;

    while (accumulator >= fixedStep) {
      enemyStore.moveEnemies(fixedStep, { getTargetPosition, onBaseHit, onBarrackHit, speedMps: getSpeedMps() });
      accumulator -= fixedStep;
    }
    rafId = requestAnimationFrame(step);
  };

  const start = () => {
    if (rafId) return;
    lastTs = null;
    accumulator = 0;
    rafId = requestAnimationFrame(step);
  };

  const stop = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
      lastTs = null;
      accumulator = 0;
    }
  };

  onBeforeUnmount(() => {
    stop();
  });

  return { start, stop };
};
