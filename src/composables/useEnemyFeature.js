import { computed, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useEnemyStore } from '@/stores/enemyStore';
import { useEnemySpawn } from '@/composables/useEnemySpawn';
import { useEnemyMovement } from '@/composables/useEnemyMovement';
import { useAutoAttack } from '@/composables/useAutoAttack';
import { useBarrackAutoAttack } from '@/composables/useBarrackAutoAttack';
import { useBarrackAutoHeal } from '@/composables/useBarrackAutoHeal';
import { usePoiStore } from '@/stores/poiStore';
import { useEnemyDialog } from '@/composables/useEnemyDialog';

export function useEnemyFeature({
  mapRef,
  onMapEvent,
  mapViewVersion,
  baseConfirmed,
  showStartPopup,
  baseMarkerPosition,
  pois,
  radarLevel,
  gameStore,
  poiStore,
  baseHealth,
  autoAttackLevel,
  currentAttackOrigin,
  startAttack,
  startHealAnimation,
  markerRef,
  closeDialog,
  removeConnectionLine,
  mapStore,
}) {
  const enemyStore = useEnemyStore();
  enemyStore.initialize();
  const { enemies } = storeToRefs(enemyStore);

  const closeDialogsKeepAttack = () => {
    if (closeDialog) closeDialog(removeConnectionLine);
    mapStore?.closeAllDialogs();
  };

  const enemySpawner = useEnemySpawn({ baseMarkerPosition, pois, radarLevel });
  const enemyMover = useEnemyMovement({
    getTargetPosition: (type, id) => {
      if (type === 'base') {
        return baseMarkerPosition.value;
      }
      if (type === 'barrack') {
        const target = (pois.value || []).find(
          (p) => String(p.id) === String(id) && p.owned,
        );
        if (target) return { lat: target.lat, lng: target.lng };
      }
      return null;
    },
    onBaseHit: (enemy) => {
      const damage = enemy?.damage || 1;
      gameStore.setBaseHealth(baseHealth.value - damage);
    },
    onBarrackHit: (poiId, enemy) => {
      const damage = enemy?.damage || 1;
      poiStore.damagePOI(poiId, damage, null, { attackedByEnemy: true });
    },
    radarLevel,
  });

  const {
    selectedEnemyId,
    isEnemyAttackOnCooldown,
    enemyAttackCooldownProgress,
    closeEnemyDialog,
    handleEnemyClick,
  } = useEnemyDialog({
    mapRef,
    enemies,
    currentAttackOrigin,
    startAttack,
    closeDialogsKeepAttack,
    damageEnemy: enemyStore.damageEnemy,
  });

  useAutoAttack({
    markerRef,
    enemies,
    baseConfirmed,
    autoAttackLevel,
    getCooldownMs: () => gameStore.getAutoAttackCooldownMs(),
    startAttack,
    damageEnemy: enemyStore.damageEnemy,
  });

  useBarrackAutoAttack({
    pois,
    enemies,
    startAttack,
    damageEnemy: enemyStore.damageEnemy,
    getCooldownMsForLevel: (level) => gameStore.computeAutoAttackCooldownMs(level),
  });

  useBarrackAutoHeal({
    pois,
    startHealAnimation: startHealAnimation ?? ((target, onHit) => startAttack(target, null, { type: 'heal', onHit, interceptDistanceMeters: 5 })),
    healPOI: poiStore.healPOI,
    getCooldownMsForLevel: (level) => gameStore.getAutoHealCooldownMs(level),
    gameStore,
  });

  const enemyMarkers = computed(() => {
    mapViewVersion.value;
    if (!mapRef.value || showStartPopup.value || !baseConfirmed.value) return [];

    return enemies.value.map((enemy) => {
      const point = mapRef.value.latLngToLayerPoint([enemy.lat, enemy.lng]);
      return {
        id: enemy.id,
        x: point.x,
        y: point.y,
        rotation: enemy.heading ?? 0,
        type: enemy.type || 'scout',
        health: enemy.health ?? 1,
        maxHealth: enemy.maxHealth ?? 1,
        lastDamagedAt: enemy.lastDamagedAt ?? 0,
      };
    });
  });

  watch(baseConfirmed, (confirmed) => {
    if (confirmed) {
      enemySpawner.startEnemySpawnLoop();
      enemyMover.start();
    } else {
      enemySpawner.stopEnemySpawnLoop();
      enemyMover.stop();
    }
  }, { immediate: true });

  onMounted(() => {
  });

  return {
    enemies,
    enemyMarkers,
    selectedEnemyId,
    isEnemyAttackOnCooldown,
    enemyAttackCooldownProgress,
    handleEnemyClick,
    closeEnemyDialog,
  };
}
