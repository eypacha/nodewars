import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGameClockStore = defineStore('gameClock', () => {
  const isPaused = ref(false);
  const isRunning = ref(false);
  const nowMs = ref(Date.now());
  let rafId = null;
  let lastTs = null;
  const subscribers = new Set();

  const notify = (deltaMs) => {
    subscribers.forEach((cb) => {
      try {
        cb({ deltaMs, nowMs: nowMs.value, isPaused: isPaused.value });
      } catch (err) {
        console.error('GameClock subscriber failed', err);
      }
    });
  };

  const step = (ts) => {
    if (lastTs == null) {
      lastTs = ts;
      rafId = requestAnimationFrame(step);
      return;
    }

    const deltaMs = ts - lastTs;
    lastTs = ts;

    if (!isPaused.value) {
      nowMs.value += deltaMs;
      notify(deltaMs);
    } else {
      notify(0);
    }

    rafId = requestAnimationFrame(step);
  };

  const start = () => {
    if (isRunning.value) return;
    isRunning.value = true;
    lastTs = null;
    rafId = requestAnimationFrame(step);
  };

  const stop = () => {
    if (!isRunning.value) return;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    isRunning.value = false;
    lastTs = null;
  };

  const pause = () => {
    isPaused.value = true;
  };

  const resume = () => {
    isPaused.value = false;
  };

  const onTick = (cb) => {
    if (typeof cb !== 'function') return () => {};
    subscribers.add(cb);
    return () => subscribers.delete(cb);
  };

  const now = () => nowMs.value;

  return {
    isPaused,
    isRunning,
    nowMs,
    now,
    pause,
    resume,
    start,
    stop,
    onTick,
  };
});
