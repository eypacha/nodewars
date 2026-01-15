import { computed, onBeforeUnmount, ref, watch } from 'vue';

export const useAutoHeal = ({
  baseConfirmed,
  autoHealLevel,
  baseHealth,
  baseMaxHealth,
  resources,
  isBaseCaptured,
  getCooldownMs,
  onHeal,
}) => {
  const autoHealTimeoutId = ref(null);
  const autoHealProgress = ref(0);
  const timeToNextHeal = ref(0);
  const lastAutoHealAt = ref(null);
  let autoHealProgressIntervalId = null;

  const autoHealUnlocked = computed(() => (autoHealLevel?.value ?? 0) > 0);
  const autoHealCooldownMs = computed(() => (typeof getCooldownMs === 'function' ? getCooldownMs() : null));
  const autoHealEnabled = computed(() => baseConfirmed.value && autoHealUnlocked.value && !isBaseCaptured.value);

  const clearAutoHealTimeout = () => {
    if (autoHealTimeoutId.value) {
      clearTimeout(autoHealTimeoutId.value);
      autoHealTimeoutId.value = null;
    }
  };

  const clearAutoHealProgress = () => {
    if (autoHealProgressIntervalId) {
      clearInterval(autoHealProgressIntervalId);
      autoHealProgressIntervalId = null;
    }
    autoHealProgress.value = 0;
    timeToNextHeal.value = 0;
    lastAutoHealAt.value = null;
  };

  const updateAutoHealProgress = () => {
    if (!autoHealEnabled.value) {
      autoHealProgress.value = 0;
      timeToNextHeal.value = 0;
      return;
    }

    const cooldown = autoHealCooldownMs.value;
    if (!cooldown) {
      autoHealProgress.value = 0;
      timeToNextHeal.value = 0;
      return;
    }

    const now = Date.now();
    const last = lastAutoHealAt.value ?? now;
    const elapsed = now - last;
    autoHealProgress.value = Math.max(100 - (elapsed / cooldown) * 100, 0);
    timeToNextHeal.value = Math.max(cooldown - (elapsed % cooldown), 0);
  };

  const startAutoHealProgress = () => {
    if (autoHealProgressIntervalId) return;
    if (!autoHealEnabled.value) return;
    if (lastAutoHealAt.value == null) {
      lastAutoHealAt.value = Date.now();
    }
    updateAutoHealProgress();
    autoHealProgressIntervalId = setInterval(updateAutoHealProgress, 250);
  };

  const tryAutoHeal = () => {
    if (baseHealth.value >= baseMaxHealth.value) return;
    if (resources.value?.pharmacy < 1) return;
    onHeal?.();
  };

  const scheduleAutoHeal = ({ immediate = false } = {}) => {
    if (!autoHealEnabled.value) return;

    const cooldown = autoHealCooldownMs.value;
    if (!cooldown) return;

    if (immediate) {
      tryAutoHeal();
    }

    if (autoHealTimeoutId.value) return;

    lastAutoHealAt.value = Date.now();
    updateAutoHealProgress();
    startAutoHealProgress();

    autoHealTimeoutId.value = setTimeout(() => {
      autoHealTimeoutId.value = null;

      if (!autoHealEnabled.value) {
        scheduleAutoHeal();
        return;
      }

      tryAutoHeal();
      scheduleAutoHeal();
    }, cooldown);
  };

  watch(
    [baseConfirmed, autoHealUnlocked, isBaseCaptured],
    ([confirmed, unlocked, captured]) => {
      if (!confirmed || !unlocked || captured) {
        clearAutoHealTimeout();
        clearAutoHealProgress();
        return;
      }
      scheduleAutoHeal();
    }
  );

  watch(autoHealCooldownMs, () => {
    clearAutoHealTimeout();
    clearAutoHealProgress();
    if (!autoHealEnabled.value) return;
    scheduleAutoHeal();
  });

  onBeforeUnmount(() => {
    clearAutoHealTimeout();
    clearAutoHealProgress();
  });

  return {
    scheduleAutoHeal,
    clearAutoHealTimeout,
    autoHealProgress,
    timeToNextHeal,
  };
};
