<template>
  <div class="fixed inset-0 flex items-center justify-center z-[3000] bg-black/50">
    <div class="bg-black border-2 border-white p-8 shadow-2xl w-[calc(100vw-4rem)] mx-4 h-[calc(100vh-4rem)] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-white">{{ $t('upgrades.title') }}</h2>
        <button
          @click="handleClose"
          class="text-white text-1xl font-bold leading-none cursor-pointer"
        >
          {{ $t('upgrades.close') }}
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-stretch">
        <!-- Radar Level Upgrade -->
        <UpgradeCard
          :title="$t('upgrades.radar')"
          :subtitle="`${radarLevel} → ${radarLevel + 1}`"
          :cost="nextUpgradeCostDisplay"
          :costColor="'#fbbf24'"
          :description="[
            $t('upgrades.increaseRange'),
            `${$t('upgrades.currentRadius')} ${currentRadarRadius}m`
          ]"
          :buttonLabel="maxLevelReached ? $t('upgrades.maxLevel') : canAffordUpgrade ? $t('upgrades.upgradeButton') : $t('upgrades.insufficientFunds')"
          :disabled="!canAffordUpgrade || maxLevelReached"
          :onClick="handleUpgrade"
        />

        <!-- Auto-Attack Upgrade -->
        <UpgradeCard
          :title="$t('upgrades.autoAttack')"
          :subtitle="`${autoAttackLevel} → ${autoAttackLevel + 1}`"
          :cost="nextAutoUpgradeCostDisplay"
          :costColor="'#9ca3af'"
          :description="[
            $t('upgrades.autoAttackDesc'),
            autoAttackLevel > 0 ? `${$t('upgrades.currentCooldown')} ${autoAttackCooldownDisplay}s` : ''
          ].filter(Boolean)"
          :buttonLabel="autoMaxLevelReached ? $t('upgrades.maxLevel') : canAffordAutoUpgrade ? $t('upgrades.upgradeButton') : $t('upgrades.insufficientFunds')"
          :disabled="!canAffordAutoUpgrade || autoMaxLevelReached"
          :onClick="handleAutoUpgrade"
        />

        <!-- Auto-Heal Upgrade -->
        <UpgradeCard
          :title="$t('upgrades.autoHeal')"
          :subtitle="`${autoHealLevel} → ${autoHealLevel + 1}`"
          :cost="nextAutoHealUpgradeCostDisplay"
          :costColor="pharmacyColor"
          :description="[
            $t('upgrades.autoHealDesc'),
            autoHealLevel > 0 ? `${$t('upgrades.currentCooldown')} ${autoHealCooldownDisplay}s` : ''
          ].filter(Boolean)"
          :buttonLabel="autoHealMaxLevelReached ? $t('upgrades.maxLevel') : canAffordAutoHealUpgrade ? $t('upgrades.upgradeButton') : $t('upgrades.insufficientFunds')"
          :disabled="!canAffordAutoHealUpgrade || autoHealMaxLevelReached"
          :onClick="handleAutoHealUpgrade"
        />

        <!-- Base Nodes Upgrade -->
        <UpgradeCard
          :title="$t('upgrades.baseNodes')"
          :subtitle="`${baseNodesLevel} → ${baseNodesLevel + 1}`"
          :cost="nextBaseNodesCostDisplay"
          :costColor="foodColor"
          :description="[
            $t('upgrades.baseNodesDesc'),
            `${$t('upgrades.currentNodes')} ${currentBaseNodes}`
          ]"
          :buttonLabel="baseNodesMaxLevelReached ? $t('upgrades.maxLevel') : canAffordBaseNodesUpgrade ? $t('upgrades.upgradeButton') : $t('upgrades.insufficientFunds')"
          :disabled="!canAffordBaseNodesUpgrade || baseNodesMaxLevelReached"
          :onClick="handleBaseNodesUpgrade"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useGameStore } from '@/stores/gameStore';
import { getRadarConfig } from '@/services/mapService';
import BaseButton from '@/components/UI/BaseButton.vue';
import UpgradeCard from '@/components/UpgradeCard.vue';
import { getPOIColor } from '@/constants/poiTypes';
const emit = defineEmits(['close']);

const gameStore = useGameStore();
const { resources, radarLevel, autoAttackLevel, autoHealLevel, baseNodesLevel } = storeToRefs(gameStore);
const foodColor = getPOIColor('food');
const pharmacyColor = getPOIColor('pharmacy');

const nextUpgradeCost = computed(() => gameStore.getRadarUpgradeCost());
const nextUpgradeCostDisplay = computed(() => nextUpgradeCost.value ?? '—');

const maxLevelReached = computed(() => nextUpgradeCost.value == null);

const canAffordUpgrade = computed(() => {
  const cost = nextUpgradeCost.value;
  return cost != null && resources.value.bank >= cost;
});

const currentRadarRadius = computed(() => {
  const config = getRadarConfig(radarLevel.value);
  return config.radius;
});

const handleUpgrade = () => {
  const success = gameStore.upgradeRadar();
  if (success) {
    // Upgrade realizado, el componente se actualizará automáticamente
  }
};

const nextAutoUpgradeCost = computed(() => gameStore.getAutoAttackUpgradeCost());
const nextAutoUpgradeCostDisplay = computed(() => nextAutoUpgradeCost.value ?? '—');
const autoMaxLevelReached = computed(() => nextAutoUpgradeCost.value == null);
const canAffordAutoUpgrade = computed(() => {
  const cost = nextAutoUpgradeCost.value;
  return cost != null && resources.value.police >= cost;
});

const autoAttackCooldownMs = computed(() => gameStore.getAutoAttackCooldownMs());
const autoAttackCooldownDisplay = computed(() => {
  const value = autoAttackCooldownMs.value;
  if (!value) return '—';
  return (value / 1000).toFixed(1);
});

const handleAutoUpgrade = () => {
  const success = gameStore.upgradeAutoAttack();
  if (success) {
    // Upgrade realizado, el componente se actualizará automáticamente
  }
};

const nextAutoHealUpgradeCost = computed(() => gameStore.getAutoHealUpgradeCost());
const nextAutoHealUpgradeCostDisplay = computed(() => nextAutoHealUpgradeCost.value ?? '—');
const autoHealMaxLevelReached = computed(() => nextAutoHealUpgradeCost.value == null);
const canAffordAutoHealUpgrade = computed(() => {
  const cost = nextAutoHealUpgradeCost.value;
  return cost != null && resources.value.pharmacy >= cost;
});

const autoHealCooldownMs = computed(() => gameStore.getAutoHealCooldownMs());
const autoHealCooldownDisplay = computed(() => {
  const value = autoHealCooldownMs.value;
  if (!value) return '—';
  return (value / 1000).toFixed(1);
});

const handleAutoHealUpgrade = () => {
  const success = gameStore.upgradeAutoHeal();
  if (success) {
    // Upgrade realizado, el componente se actualizará automáticamente
  }
};

const nextBaseNodesCost = computed(() => gameStore.getBaseNodesUpgradeCost());
const nextBaseNodesCostDisplay = computed(() => nextBaseNodesCost.value ?? '—');
const baseNodesMaxLevelReached = computed(() => nextBaseNodesCost.value == null);
const canAffordBaseNodesUpgrade = computed(() => {
  const cost = nextBaseNodesCost.value;
  return cost != null && resources.value.food >= cost;
});
const currentBaseNodes = computed(() => gameStore.getMaxBaseNodes());

const handleBaseNodesUpgrade = () => {
  const success = gameStore.upgradeBaseNodes();
  if (success) {
    // Upgrade realizado, el componente se actualizará automáticamente
  }
};

const handleClose = () => {
  emit('close');
};
</script>

<style scoped>
</style>
