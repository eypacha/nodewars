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

  const scheduleAutoAttack = () => {
    if (autoAttackTimeoutId.value) return;
    if (!baseConfirmed.value || !enemies.value.length || !autoAttackUnlocked.value) return;

    const cooldown = autoAttackCooldownMs.value;
    if (!cooldown) return;

    autoAttackTimeoutId.value = setTimeout(() => {
      autoAttackTimeoutId.value = null;

      if (!baseConfirmed.value || !enemies.value.length || !autoAttackUnlocked.value) {
        scheduleAutoAttack();
        return;
      }

      const target = getNextAutoAttackTarget();
      if (target) {
        const enemyId = target.id;
        startAttack({ lat: target.lat, lng: target.lng }, null, {
          onHit: () => removeEnemy?.(enemyId),
          trackTarget: () => {
            const liveEnemy = enemies.value.find((e) => e.id === enemyId);
            if (!liveEnemy) return null;
            return { lat: liveEnemy.lat, lng: liveEnemy.lng };
          },
          interceptDistanceMeters: 5,
        });
      }

      scheduleAutoAttack();
    }, cooldown);
  };

  watch(
    [() => enemies.value.length, baseConfirmed, autoAttackUnlocked],
    ([count, confirmed, unlocked]) => {
      if (count <= 1) {
        autoAttackTargetIndex.value = 0;
      }
      if (!confirmed || count === 0 || !unlocked) {
        clearAutoAttackTimeout();
        return;
      }
      scheduleAutoAttack();
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
