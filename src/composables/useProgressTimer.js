import { onBeforeUnmount, ref } from 'vue';

const timers = new Map();

export function useProgressTimer(durationMs, { onComplete, key } = {}) {
  if (!durationMs || durationMs <= 0) {
    throw new Error('useProgressTimer requires a positive duration');
  }

  const getState = () => {
    if (key && timers.has(key)) {
      return timers.get(key);
    }

    const state = {
      progress: ref(0),
      isRunning: ref(false),
      rafId: null,
      startTime: 0,
    };

    if (key) timers.set(key, state);
    return state;
  };

  const state = getState();

  const stop = () => {
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
    state.isRunning.value = false;
    state.progress.value = 0;
  };

  const start = (completeCallback) => {
    if (state.isRunning.value) return;

    state.isRunning.value = true;
    state.progress.value = 0;
    state.startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - state.startTime;
      const value = Math.min((elapsed / durationMs) * 100, 100);
      state.progress.value = value;

      if (value < 100) {
        state.rafId = requestAnimationFrame(tick);
      } else {
        state.isRunning.value = false;
        state.progress.value = 0;
        state.rafId = null;
        if (onComplete) onComplete();
        if (completeCallback) completeCallback();
        if (key) timers.delete(key);
      }
    };

    state.rafId = requestAnimationFrame(tick);
  };

  onBeforeUnmount(() => {
    // No detenemos si hay clave compartida para permitir persistencia.
    if (!key) {
      stop();
    }
  });

  return {
    progress: state.progress,
    isRunning: state.isRunning,
    start,
    stop,
  };
}
