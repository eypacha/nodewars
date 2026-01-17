import { ref, watch } from 'vue';
import { useProgressTimer } from '@/composables/useProgressTimer';
import { ENEMY_ATTACK_COOLDOWN_MS } from '@/constants/enemies';

export function useEnemyDialog({
  mapRef,
  enemies,
  currentAttackOrigin,
  startAttack,
  closeDialogsKeepAttack,
  removeEnemy,
}) {
  const selectedEnemyId = ref(null);

  const enemyAttackCooldown = useProgressTimer(ENEMY_ATTACK_COOLDOWN_MS, {
    key: 'enemy-attack',
    onComplete: () => {
      if (!selectedEnemyId.value) return;
      handleEnemyAttack(selectedEnemyId.value);
    },
  });
  const isEnemyAttackOnCooldown = enemyAttackCooldown.isRunning;
  const enemyAttackCooldownProgress = enemyAttackCooldown.progress;

  const closeEnemyDialog = () => {
    enemyAttackCooldown.stop();
    selectedEnemyId.value = null;
  };

  const deselectEnemy = () => {
    selectedEnemyId.value = null;
  };

  const handleEnemyClick = (enemyId) => {
    const enemy = enemies.value.find((e) => e.id === enemyId);
    if (!enemy) return;
    if (selectedEnemyId.value !== enemyId) {
      closeDialogsKeepAttack();
      selectedEnemyId.value = enemyId;
      enemyAttackCooldown.stop();
      enemyAttackCooldown.start();
      return;
    }
    if (enemyAttackCooldown.isRunning.value) return;
    handleEnemyAttack(enemyId);
  };

  function handleEnemyAttack(enemyId) {
    if (!enemyId || enemyAttackCooldown.isRunning.value) return;
    const target = enemies.value.find((e) => e.id === enemyId);
    if (!target) return;
    const origin = currentAttackOrigin.value || null;
    startAttack({ lat: target.lat, lng: target.lng }, origin, {
      onHit: () => removeEnemy(enemyId),
      trackTarget: () => {
        const liveEnemy = enemies.value.find((e) => e.id === enemyId);
        if (!liveEnemy) return null;
        return { lat: liveEnemy.lat, lng: liveEnemy.lng };
      },
      interceptDistanceMeters: 5,
    });
    enemyAttackCooldown.start();
    deselectEnemy();
  }

  watch(enemies, (list) => {
    if (!selectedEnemyId.value) return;
    const stillAlive = list.find((e) => e.id === selectedEnemyId.value);
    if (!stillAlive) {
      closeEnemyDialog();
      return;
    }
  });

  return {
    selectedEnemyId,
    isEnemyAttackOnCooldown,
    enemyAttackCooldownProgress,
    closeEnemyDialog,
    handleEnemyClick,
  };
}
