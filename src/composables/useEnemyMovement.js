import { onBeforeUnmount } from 'vue';
import { useEnemyStore } from '@/stores/enemyStore';

export const useEnemyMovement = ({ getTargetPosition, onBaseHit, onBarrackHit }) => {
  const enemyStore = useEnemyStore();
  let rafId = null;
  let lastTs = null;

  const step = (ts) => {
    if (lastTs === null) {
      lastTs = ts;
      rafId = requestAnimationFrame(step);
      return;
    }

    const deltaSeconds = (ts - lastTs) / 1000;
    lastTs = ts;

    enemyStore.moveEnemies(deltaSeconds, { getTargetPosition, onBaseHit, onBarrackHit });
    rafId = requestAnimationFrame(step);
  };

  const start = () => {
    if (rafId) return;
    lastTs = null;
    rafId = requestAnimationFrame(step);
  };

  const stop = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
      lastTs = null;
    }
  };

  onBeforeUnmount(() => {
    stop();
  });

  return { start, stop };
};
