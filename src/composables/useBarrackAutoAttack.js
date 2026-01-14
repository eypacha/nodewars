import { onBeforeUnmount } from 'vue';
import L from 'leaflet';
import { BARRACKS_RADAR_RADIUS } from '@/constants/player';

export const useBarrackAutoAttack = ({
  pois,
  enemies,
  startAttack,
  removeEnemy,
  getCooldownMsForLevel,
}) => {
  const AUTO_ATTACK_TICK_MS = 500;
  const lastShotAtByBarrack = new Map();
  let intervalId = null;

  const getNearestEnemyInRange = (barrack, enemyList) => {
    if (!barrack || !Array.isArray(enemyList) || !enemyList.length) return null;
    const origin = L.latLng([barrack.lat, barrack.lng]);
    let best = null;
    let bestDistance = Infinity;
    enemyList.forEach((enemy) => {
      const dist = origin.distanceTo(L.latLng([enemy.lat, enemy.lng]));
      if (dist <= BARRACKS_RADAR_RADIUS && dist < bestDistance) {
        best = enemy;
        bestDistance = dist;
      }
    });
    return best;
  };

  const handleBarrackAutoAttackTick = () => {
    if (!Array.isArray(pois.value) || !pois.value.length || !enemies.value.length) return;

    const now = Date.now();
    pois.value.forEach((poi) => {
      if (!poi || poi.type !== 'barrack' || !poi.owned) return;
      const level = poi.barrackAutoAttackLevel ?? 0;
      if (level <= 0) return;

      const cooldown = getCooldownMsForLevel(level);
      if (!cooldown) return;

      const lastShotAt = lastShotAtByBarrack.get(poi.id) ?? 0;
      if (now - lastShotAt < cooldown) return;

      const target = getNearestEnemyInRange(poi, enemies.value);
      if (!target) return;

      lastShotAtByBarrack.set(poi.id, now);
      const enemyId = target.id;
      startAttack({ lat: target.lat, lng: target.lng }, poi, {
        onHit: () => removeEnemy?.(enemyId),
        trackTarget: () => {
          const liveEnemy = enemies.value.find((e) => e.id === enemyId);
          if (!liveEnemy) return null;
          return { lat: liveEnemy.lat, lng: liveEnemy.lng };
        },
        interceptDistanceMeters: 5,
        isAuto: true,
      });
    });
  };

  const startBarrackAutoAttack = () => {
    if (intervalId) return;
    intervalId = setInterval(handleBarrackAutoAttackTick, AUTO_ATTACK_TICK_MS);
  };

  const stopBarrackAutoAttack = () => {
    if (!intervalId) return;
    clearInterval(intervalId);
    intervalId = null;
  };

  startBarrackAutoAttack();

  onBeforeUnmount(() => {
    stopBarrackAutoAttack();
  });

  return {
    startBarrackAutoAttack,
    stopBarrackAutoAttack,
  };
};
