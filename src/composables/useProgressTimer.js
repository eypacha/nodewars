import { onBeforeUnmount, ref } from 'vue';
import { useGameClockStore } from '@/stores/gameClockStore';

const timers = new Map();

export function useProgressTimer(durationMs, { onComplete, key } = {}) {
  if (!durationMs || durationMs <= 0) {
    throw new Error('useProgressTimer requires a positive duration');
  }

  const gameClockStore = useGameClockStore();

  const getState = () => {
    if (key && timers.has(key)) {
      return timers.get(key);
    }

    const state = {
      progress: ref(0),
      isRunning: ref(false),
      unsubscribe: null,
      startTime: 0,
    };

    if (key) timers.set(key, state);
    return state;
  };

  const state = getState();

  const stop = () => {
    if (state.unsubscribe) {
      state.unsubscribe();
      state.unsubscribe = null;
    }
    state.isRunning.value = false;
    state.progress.value = 0;
  };

  const start = (completeCallback) => {
    if (state.isRunning.value) return;

    state.isRunning.value = true;
    state.progress.value = 0;
    state.startTime = gameClockStore.now();

    if (!state.unsubscribe) {
      state.unsubscribe = gameClockStore.onTick(({ nowMs, deltaMs }) => {
        if (!state.isRunning.value || !deltaMs) return;
        const elapsed = nowMs - state.startTime;
        const value = Math.min((elapsed / durationMs) * 100, 100);
        state.progress.value = value;

        if (value < 100) return;
        state.isRunning.value = false;
        state.progress.value = 0;
        if (state.unsubscribe) {
          state.unsubscribe();
          state.unsubscribe = null;
        }
        if (onComplete) onComplete();
        if (completeCallback) completeCallback();
        if (key) timers.delete(key);
      });
    }
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
