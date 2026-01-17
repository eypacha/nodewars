import { onBeforeUnmount, reactive } from 'vue';
import { useGameClockStore } from '@/stores/gameClockStore';

// Expose reactive maps so UI components can show per-barrack progress
export const barrackAutoHealProgress = reactive({});
export const barrackTimeToNextHeal = reactive({});

export const useBarrackAutoHeal = ({
  pois,
  startHealAnimation,
  healPOI,
  getCooldownMsForLevel,
  gameStore,
}) => {
  const AUTO_HEAL_TICK_MS = 500;
  const lastHealAtByBarrack = new Map();
  const gameClockStore = useGameClockStore();
  let unsubscribeTick = null;
  let tickAccumulator = 0;

  const handleBarrackAutoHealTick = () => {
    if (!Array.isArray(pois.value) || !pois.value.length) return;

    const now = gameClockStore.now();
    pois.value.forEach((poi) => {
      if (!poi || poi.type !== 'barrack' || !poi.owned) return;
      const level = poi.barrackAutoHealLevel ?? 0;
      if (level <= 0) return;

      const cooldown = getCooldownMsForLevel(level);
      if (!cooldown) return;

      const lastHealAt = lastHealAtByBarrack.get(poi.id) ?? 0;
      // Update progress map for UI
      const last = lastHealAtByBarrack.get(poi.id) ?? now;
      const elapsedSinceLast = now - last;
      barrackAutoHealProgress[poi.id] = Math.min((elapsedSinceLast / cooldown) * 100, 100);
      barrackTimeToNextHeal[poi.id] = Math.max(cooldown - (elapsedSinceLast % cooldown), 0);

      if (now - lastHealAt < cooldown) return;

      // Check if barrack needs healing
      const maxHealth = poi.maxHealth || poi.health || 0;
      if ((poi.health || 0) >= maxHealth) return;

      // Check if pharmacy available
      if (!gameStore.consumeResource('pharmacy', 1)) return;

      lastHealAtByBarrack.set(poi.id, now);

      // Start animation from base to barrack
      startHealAnimation(poi, () => {
        healPOI(poi.id, 1);
      });
    });
  };

  const startBarrackAutoHeal = () => {
    if (unsubscribeTick) return;
    tickAccumulator = 0;
    unsubscribeTick = gameClockStore.onTick(({ deltaMs }) => {
      if (!deltaMs) return;
      tickAccumulator += deltaMs;
      while (tickAccumulator >= AUTO_HEAL_TICK_MS) {
        handleBarrackAutoHealTick();
        tickAccumulator -= AUTO_HEAL_TICK_MS;
      }
    });
  };

  const stopBarrackAutoHeal = () => {
    if (!unsubscribeTick) return;
    unsubscribeTick();
    unsubscribeTick = null;
    tickAccumulator = 0;
  };

  startBarrackAutoHeal();

  onBeforeUnmount(() => {
    stopBarrackAutoHeal();
  });

  return {
    startBarrackAutoHeal,
    stopBarrackAutoHeal,
  };
};
