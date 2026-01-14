import { computed, onBeforeUnmount, ref, watch } from 'vue';
import L from 'leaflet';

export const useAutoAttack = ({
  markerRef,
  enemies,
  baseConfirmed,
  autoAttackLevel,
  getCooldownMs,
  startAttack,
  removeEnemy,
}) => {
  const autoAttackTimeoutId = ref(null);
  const autoAttackTargetIndex = ref(0);

  const autoAttackUnlocked = computed(() => (autoAttackLevel?.value ?? 0) > 0);
  const autoAttackCooldownMs = computed(() => (typeof getCooldownMs === 'function' ? getCooldownMs() : null));

  const clearAutoAttackTimeout = () => {
    if (autoAttackTimeoutId.value) {
      clearTimeout(autoAttackTimeoutId.value);
      autoAttackTimeoutId.value = null;
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
      onHit: () => removeEnemy?.(enemyId),
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
      if (autoAttackTimeoutId.value) {
        clearAutoAttackTimeout();
      }
      fireAutoAttack();
    }

    if (autoAttackTimeoutId.value) return;

    autoAttackTimeoutId.value = setTimeout(() => {
      autoAttackTimeoutId.value = null;

      if (!baseConfirmed.value || !enemies.value.length || !autoAttackUnlocked.value) {
        scheduleAutoAttack();
        return;
      }

      fireAutoAttack();

      scheduleAutoAttack();
    }, cooldown);
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
