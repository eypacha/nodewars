import { ref, watch } from 'vue';
import { useProgressTimer } from '@/composables/useProgressTimer';

export function useEnemyDialog({
  mapRef,
  enemies,
  currentAttackOrigin,
  startAttack,
  closeDialogsKeepAttack,
  removeEnemy,
}) {
  const selectedEnemyForAttack = ref(null);
  const enemyDialogStyle = ref(null);

  const ENEMY_ATTACK_COOLDOWN = 2000;
  const enemyAttackCooldown = useProgressTimer(ENEMY_ATTACK_COOLDOWN, { key: 'enemy-attack' });
  const isEnemyAttackOnCooldown = enemyAttackCooldown.isRunning;
  const enemyAttackCooldownProgress = enemyAttackCooldown.progress;

  const closeEnemyDialog = () => {
    selectedEnemyForAttack.value = null;
    enemyDialogStyle.value = null;
  };

  const updateEnemyDialogPosition = (enemy) => {
    if (!mapRef.value || !enemy) return;
    const point = mapRef.value.latLngToContainerPoint([enemy.lat, enemy.lng]);
    enemyDialogStyle.value = {
      position: 'absolute',
      left: `${point.x}px`,
      top: `${point.y}px`,
      transform: 'translate(-50%, -100%)',
      zIndex: 1500,
    };
  };

  const handleEnemyClick = (enemyId) => {
    const enemy = enemies.value.find((e) => e.id === enemyId);
    if (!enemy) return;
    closeDialogsKeepAttack();
    selectedEnemyForAttack.value = enemy;
    updateEnemyDialogPosition(enemy);
  };

  const handleEnemyAttack = () => {
    if (!selectedEnemyForAttack.value || enemyAttackCooldown.isRunning.value) return;
    const enemyId = selectedEnemyForAttack.value.id;
    const origin = currentAttackOrigin.value || null;
    startAttack({ lat: selectedEnemyForAttack.value.lat, lng: selectedEnemyForAttack.value.lng }, origin, {
      onHit: () => removeEnemy(enemyId),
      trackTarget: () => {
        const liveEnemy = enemies.value.find((e) => e.id === enemyId);
        if (!liveEnemy) return null;
        return { lat: liveEnemy.lat, lng: liveEnemy.lng };
      },
      interceptDistanceMeters: 5,
    });
    enemyAttackCooldown.start();
    closeEnemyDialog();
  };

  watch(enemies, (list) => {
    if (!selectedEnemyForAttack.value) return;
    const stillAlive = list.find((e) => e.id === selectedEnemyForAttack.value.id);
    if (!stillAlive) {
      closeEnemyDialog();
    } else {
      updateEnemyDialogPosition(stillAlive);
    }
  });

  return {
    selectedEnemyForAttack,
    enemyDialogStyle,
    isEnemyAttackOnCooldown,
    enemyAttackCooldownProgress,
    closeEnemyDialog,
    updateEnemyDialogPosition,
    handleEnemyClick,
    handleEnemyAttack,
  };
}
