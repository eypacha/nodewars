import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useGameClockStore } from '@/stores/gameClockStore';

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
  const gameClockStore = useGameClockStore();
  const autoHealProgress = ref(0);
  const timeToNextHeal = ref(0);
  const lastAutoHealAt = ref(null);
  const nextHealAt = ref(null);
  let unsubscribeTick = null;

  const autoHealUnlocked = computed(() => (autoHealLevel?.value ?? 0) > 0);
  const autoHealCooldownMs = computed(() => (typeof getCooldownMs === 'function' ? getCooldownMs() : null));
  const autoHealEnabled = computed(() => baseConfirmed.value && autoHealUnlocked.value && !isBaseCaptured.value);

  const clearAutoHealProgress = () => {
    autoHealProgress.value = 0;
    timeToNextHeal.value = 0;
    lastAutoHealAt.value = null;
    nextHealAt.value = null;
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

    const now = gameClockStore.now();
    const last = lastAutoHealAt.value ?? now;
    const elapsed = now - last;
    autoHealProgress.value = Math.max(100 - (elapsed / cooldown) * 100, 0);
    timeToNextHeal.value = Math.max(cooldown - (elapsed % cooldown), 0);
  };

  const stopTicking = () => {
    if (!unsubscribeTick) return;
    unsubscribeTick();
    unsubscribeTick = null;
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

    if (nextHealAt.value != null) return;

    lastAutoHealAt.value = gameClockStore.now();
    updateAutoHealProgress();
    nextHealAt.value = lastAutoHealAt.value + cooldown;

    if (!unsubscribeTick) {
      unsubscribeTick = gameClockStore.onTick(({ nowMs, deltaMs }) => {
        if (!deltaMs) return;
        updateAutoHealProgress();
        if (nextHealAt.value == null || nowMs < nextHealAt.value) return;
        nextHealAt.value = null;

        if (!autoHealEnabled.value) {
          scheduleAutoHeal();
          return;
        }

        tryAutoHeal();
        scheduleAutoHeal();
      });
    }
  };

  watch(
    [baseConfirmed, autoHealUnlocked, isBaseCaptured],
    ([confirmed, unlocked, captured]) => {
      if (!confirmed || !unlocked || captured) {
        clearAutoHealProgress();
        stopTicking();
        return;
      }
      scheduleAutoHeal();
    }
  );

  watch(autoHealCooldownMs, () => {
    clearAutoHealProgress();
    stopTicking();
    if (!autoHealEnabled.value) return;
    scheduleAutoHeal();
  });

  onBeforeUnmount(() => {
    clearAutoHealProgress();
    stopTicking();
  });

  return {
    scheduleAutoHeal,
    clearAutoHealProgress,
    autoHealProgress,
    timeToNextHeal,
  };
};
