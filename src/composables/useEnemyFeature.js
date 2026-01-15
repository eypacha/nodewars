import { computed, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useEnemyStore } from '@/stores/enemyStore';
import { useEnemySpawn } from '@/composables/useEnemySpawn';
import { useEnemyMovement } from '@/composables/useEnemyMovement';
import { useAutoAttack } from '@/composables/useAutoAttack';
import { useBarrackAutoAttack } from '@/composables/useBarrackAutoAttack';
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
    onBaseHit: () => {
      gameStore.setBaseHealth(baseHealth.value - 1);
    },
    onBarrackHit: (poiId) => {
      poiStore.damagePOI(poiId, 1, null, { attackedByEnemy: true });
    },
    radarLevel,
  });

  const {
    selectedEnemyForAttack,
    enemyDialogStyle,
    isEnemyAttackOnCooldown,
    enemyAttackCooldownProgress,
    closeEnemyDialog,
    updateEnemyDialogPosition,
    handleEnemyClick,
    handleEnemyAttack,
  } = useEnemyDialog({
    mapRef,
    enemies,
    currentAttackOrigin,
    startAttack,
    closeDialogsKeepAttack,
    removeEnemy: enemyStore.removeEnemy,
  });

  useAutoAttack({
    markerRef,
    enemies,
    baseConfirmed,
    autoAttackLevel,
    getCooldownMs: () => gameStore.getAutoAttackCooldownMs(),
    startAttack,
    removeEnemy: enemyStore.removeEnemy,
  });

  useBarrackAutoAttack({
    pois,
    enemies,
    startAttack,
    removeEnemy: enemyStore.removeEnemy,
    getCooldownMsForLevel: (level) => gameStore.computeAutoAttackCooldownMs(level),
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
    const syncDialogPosition = () => {
      if (selectedEnemyForAttack.value) {
        updateEnemyDialogPosition(selectedEnemyForAttack.value);
      }
    };

    onMapEvent('move', syncDialogPosition);
    onMapEvent('zoom', syncDialogPosition);
    onMapEvent('click', closeEnemyDialog);
  });

  return {
    enemies,
    enemyMarkers,
    selectedEnemyForAttack,
    enemyDialogStyle,
    isEnemyAttackOnCooldown,
    enemyAttackCooldownProgress,
    handleEnemyClick,
    handleEnemyAttack,
    closeEnemyDialog,
  };
}
