import { computed, onBeforeUnmount, ref, watch } from 'vue';
import L from 'leaflet';
import { useGameClockStore } from '@/stores/gameClockStore';

export const useAutoAttack = ({
  markerRef,
  enemies,
  baseConfirmed,
  autoAttackLevel,
  getCooldownMs,
  startAttack,
  damageEnemy,
}) => {
  const autoAttackTargetIndex = ref(0);
  const gameClockStore = useGameClockStore();
  const nextFireAt = ref(null);
  let unsubscribeTick = null;

  const autoAttackUnlocked = computed(() => (autoAttackLevel?.value ?? 0) > 0);
  const autoAttackCooldownMs = computed(() => (typeof getCooldownMs === 'function' ? getCooldownMs() : null));

  const clearAutoAttackTimeout = () => {
    nextFireAt.value = null;
    if (unsubscribeTick) {
      unsubscribeTick();
      unsubscribeTick = null;
    }
  };

  const getEnemiesOrderedByDistance = () => {
    if (!markerRef.value || !enemies?.value?.length) return [];
    const baseLatLng = markerRef.value.getLatLng();
    return [...enemies.value]
      .map((enemy) => ({ enemy, dist: L.latLng(baseLatLng).distanceTo(L.latLng([enemy.lat, enemy.lng])) }))
      .sort((a, b) => a.dist - b.dist)
      .map((item) => item.enemy);
  };

  const getNextAutoAttackTarget = () => {
    const ordered = getEnemiesOrderedByDistance();
    if (!ordered.length) return null;
    const idx = autoAttackTargetIndex.value % ordered.length;
    const target = ordered[idx];
    autoAttackTargetIndex.value = (autoAttackTargetIndex.value + 1) % ordered.length;
    return target;
  };

  const fireAutoAttack = () => {
    const target = getNextAutoAttackTarget();
    if (!target) return;
    const enemyId = target.id;
    startAttack({ lat: target.lat, lng: target.lng }, null, {
      onHit: () => damageEnemy?.(enemyId),
      trackTarget: () => {
        const liveEnemy = enemies.value.find((e) => e.id === enemyId);
        if (!liveEnemy) return null;
        return { lat: liveEnemy.lat, lng: liveEnemy.lng };
      },
      interceptDistanceMeters: 5,
      isAuto: true,
    });
  };

  const scheduleAutoAttack = ({ immediate = false } = {}) => {
    if (!baseConfirmed.value || !enemies.value.length || !autoAttackUnlocked.value) return;

    const cooldown = autoAttackCooldownMs.value;
    if (!cooldown) return;

    if (immediate) {
      if (nextFireAt.value != null) clearAutoAttackTimeout();
      fireAutoAttack();
    }

    if (nextFireAt.value != null) return;

    nextFireAt.value = gameClockStore.now() + cooldown;
    if (!unsubscribeTick) {
      unsubscribeTick = gameClockStore.onTick(({ nowMs }) => {
        if (nextFireAt.value == null) return;
        if (nowMs < nextFireAt.value) return;
        nextFireAt.value = null;

        if (!baseConfirmed.value || !enemies.value.length || !autoAttackUnlocked.value) {
          scheduleAutoAttack();
          return;
        }

        fireAutoAttack();
        scheduleAutoAttack();
      });
    }
  };

  watch(
    [() => enemies.value.length, baseConfirmed, autoAttackUnlocked],
    ([count, confirmed, unlocked], prev = []) => {
      const prevCount = prev[0] ?? 0;
      const shouldFireImmediately = prevCount === 0 && count > 0;
      if (count <= 1) {
        autoAttackTargetIndex.value = 0;
      }
      if (!confirmed || count === 0 || !unlocked) {
        clearAutoAttackTimeout();
        return;
      }
      scheduleAutoAttack({ immediate: shouldFireImmediately });
    }
  );

  watch(autoAttackCooldownMs, () => {
    clearAutoAttackTimeout();
    if (!baseConfirmed.value || !enemies.value.length || !autoAttackUnlocked.value) return;
    scheduleAutoAttack();
  });

  onBeforeUnmount(() => {
    clearAutoAttackTimeout();
  });

  return {
    scheduleAutoAttack,
    clearAutoAttackTimeout,
  };
};
