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

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <!-- Radar Level Upgrade -->
        <div class="border border-white p-4">
          <div class="flex justify-between items-start mb-3">
            <div>
              <p class="text-white text-sm font-bold">{{ $t('upgrades.radar') }}</p>
              <p class="text-gray-400 text-xs mt-1">{{ radarLevel }} → {{ radarLevel + 1 }}</p>
            </div>
            <div class="text-right">
              <p class="text-yellow-400 text-base font-bold">{{ nextUpgradeCostDisplay }} ●</p>
            </div>
          </div>

          <div class="mb-4 text-gray-300 text-sm space-y-1">
            <p>{{ $t('upgrades.increaseRange') }}</p>
            <p class="text-gray-500">{{ $t('upgrades.currentRadius') }} <span class="text-white font-bold">{{ currentRadarRadius }}m</span></p>
          </div>

          <BaseButton
            @click="handleUpgrade"
            :disabled="!canAffordUpgrade || maxLevelReached"
            :label="maxLevelReached ? $t('upgrades.maxLevel') : canAffordUpgrade ? $t('upgrades.upgradeButton') : $t('upgrades.insufficientFunds')"
            block
            full-width
            base-class="font-bold py-3 px-4 border-2 border-white text-sm relative overflow-hidden transition-all"
          />
        </div>

        <!-- Auto-Attack Upgrade -->
        <div class="border border-white p-4">
          <div class="flex justify-between items-start mb-3">
            <div>
              <p class="text-white text-sm font-bold">{{ $t('upgrades.autoAttack') }}</p>
              <p class="text-gray-400 text-xs mt-1">{{ autoAttackLevel }} → {{ autoAttackLevel + 1 }}</p>
            </div>
            <div class="text-right">
              <p class="text-gray-400 text-base font-bold">{{ nextAutoUpgradeCostDisplay }} ●</p>
            </div>
          </div>

          <div class="mb-4 text-gray-300 text-sm space-y-1">
            <p>{{ $t('upgrades.autoAttackDesc') }}</p>
            <p class="text-gray-500" v-if="autoAttackLevel > 0">{{ $t('upgrades.currentCooldown') }} <span class="text-white font-bold">{{ autoAttackCooldownDisplay }}s</span></p>
          </div>

          <BaseButton
            @click="handleAutoUpgrade"
            :disabled="!canAffordAutoUpgrade || autoMaxLevelReached"
            :label="autoMaxLevelReached ? $t('upgrades.maxLevel') : canAffordAutoUpgrade ? $t('upgrades.upgradeButton') : $t('upgrades.insufficientFunds')"
            block
            full-width
            base-class="font-bold py-3 px-4 border-2 border-white text-sm relative overflow-hidden transition-all"
          />
        </div>

        <!-- Base Nodes Upgrade -->
        <div class="border border-white p-4">
          <div class="flex justify-between items-start mb-3">
            <div>
              <p class="text-white text-sm font-bold">{{ $t('upgrades.baseNodes') }}</p>
              <p class="text-gray-400 text-xs mt-1">{{ baseNodesLevel }} → {{ baseNodesLevel + 1 }}</p>
            </div>
            <div class="text-right">
              <p class="text-base font-bold" :style="{ color: foodColor }">{{ nextBaseNodesCostDisplay }} ●</p>
            </div>
          </div>

          <div class="mb-4 text-gray-300 text-sm space-y-1">
            <p>{{ $t('upgrades.baseNodesDesc') }}</p>
            <p class="text-gray-500">{{ $t('upgrades.currentNodes') }} <span class="text-white font-bold">{{ currentBaseNodes }}</span></p>
          </div>

          <BaseButton
            @click="handleBaseNodesUpgrade"
            :disabled="!canAffordBaseNodesUpgrade || baseNodesMaxLevelReached"
            :label="baseNodesMaxLevelReached ? $t('upgrades.maxLevel') : canAffordBaseNodesUpgrade ? $t('upgrades.upgradeButton') : $t('upgrades.insufficientFunds')"
            block
            full-width
            base-class="font-bold py-3 px-4 border-2 border-white text-sm relative overflow-hidden transition-all"
          />
        </div>
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
import { getPOIColor } from '@/constants/poiTypes';
const emit = defineEmits(['close']);

const gameStore = useGameStore();
const { resources, radarLevel, autoAttackLevel, baseNodesLevel } = storeToRefs(gameStore);
const foodColor = getPOIColor('food');

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
const nextAutoAttackCooldownDisplay = computed(() => {
  const nextLevel = autoAttackLevel.value + 1;
  const cooldown = gameStore.computeAutoAttackCooldownMs(nextLevel);
  if (!cooldown) return '—';
  return (cooldown / 1000).toFixed(1);
});

const handleAutoUpgrade = () => {
  const success = gameStore.upgradeAutoAttack();
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
