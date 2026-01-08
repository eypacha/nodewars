import { onBeforeUnmount, ref } from 'vue';

export function useProgressTimer(durationMs, { onComplete } = {}) {
  const progress = ref(0);
  const isRunning = ref(false);
  let rafId = null;

  const stop = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    isRunning.value = false;
    progress.value = 0;
  };

  const start = (completeCallback) => {
    if (isRunning.value) return;

    isRunning.value = true;
    progress.value = 0;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const value = Math.min((elapsed / durationMs) * 100, 100);
      progress.value = value;

      if (value < 100) {
        rafId = requestAnimationFrame(tick);
      } else {
        isRunning.value = false;
        progress.value = 0;
        if (onComplete) onComplete();
        if (completeCallback) completeCallback();
      }
    };

    rafId = requestAnimationFrame(tick);
  };

  onBeforeUnmount(stop);

  return {
    progress,
    isRunning,
    start,
    stop,
  };
}
