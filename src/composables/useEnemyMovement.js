import { onBeforeUnmount } from 'vue';
import { useEnemyStore } from '@/stores/enemyStore';
import { useGameClockStore } from '@/stores/gameClockStore';
import { ENEMY_SPEED_MPS, ENEMY_SPEED_RATIO } from '@/constants/enemies';
import { getRadarConfig } from '@/services/mapService';

export const useEnemyMovement = ({ getTargetPosition, onBaseHit, onBarrackHit, radarLevel }) => {
  const enemyStore = useEnemyStore();
  const gameClockStore = useGameClockStore();
  let unsubscribe = null;
  let accumulator = 0;
  const fixedStep = 1 / 30;

  const getSpeedMps = () => {
    const level = radarLevel?.value ?? 1;
    const baseRadius = getRadarConfig(1).radius;
    const currentRadius = getRadarConfig(level).radius;
    return ENEMY_SPEED_MPS * (currentRadius / baseRadius) * ENEMY_SPEED_RATIO;
  };

  const handleTick = ({ deltaMs }) => {
    if (!deltaMs) return;
    accumulator += deltaMs / 1000;

    while (accumulator >= fixedStep) {
      enemyStore.moveEnemies(fixedStep, { getTargetPosition, onBaseHit, onBarrackHit, speedMps: getSpeedMps() });
      accumulator -= fixedStep;
    }
  };

  const start = () => {
    if (unsubscribe) return;
    accumulator = 0;
    unsubscribe = gameClockStore.onTick(handleTick);
  };

  const stop = () => {
    if (!unsubscribe) return;
    unsubscribe();
    unsubscribe = null;
    accumulator = 0;
  };

  onBeforeUnmount(() => {
    stop();
  });

  return { start, stop };
};
