<template>
  <div class="fixed inset-0 flex items-center justify-center z-[3000] bg-black/50">
    <div class="bg-black border-2 border-white p-8 shadow-2xl w-[calc(100vw-4rem)] mx-4 h-[calc(100vh-4rem)] overflow-y-auto">
      <div class="flex justify-between items-start mb-6">
        <div>
          <h2 class="text-2xl font-bold text-white">{{ $t('poiUpgrades.title') }}</h2>
          <p v-if="poi" class="text-gray-400 text-xs mt-1">{{ poi.name }}</p>
        </div>
        <button
          @click="handleClose"
          class="text-white text-1xl font-bold leading-none cursor-pointer"
        >
          {{ $t('poiUpgrades.close') }}
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 items-stretch">
        <UpgradeCard
          v-if="poi?.type !== 'barrack'"
          :title="$t('poiUpgrades.autoExtract')"
          :subtitle="hasAutoExtract ? $t('poiUpgrades.unlocked') : $t('poiUpgrades.locked')"
          :cost="autoExtractCost"
          :costColor="'#cd23e8ff'"
          :description="$t('poiUpgrades.autoExtractDesc')"
          :buttonLabel="hasAutoExtract ? $t('poiUpgrades.unlocked') : !canUpgrade ? $t('poiUpgrades.unavailable') : !canAfford ? $t('poiUpgrades.insufficientFuel') : $t('poiUpgrades.upgradeButton')"
          :disabled="hasAutoExtract || !canUpgrade || !canAfford"
          :onClick="handleAutoExtractUpgrade"
        />

        <UpgradeCard
          v-if="poi?.type !== 'barrack'"
          :title="$t('poiUpgrades.productionRate')"
          :subtitle="`${productionUpgradeLevel} → ${productionUpgradeNextLevel}`"
          :cost="productionUpgradeCost ?? '—'"
          :costColor="'#cd23e8ff'"
          :description="[
            $t('poiUpgrades.productionRateDesc'),
            `${$t('poiUpgrades.currentRate')} ${productionRateSeconds}s`,
            `${$t('poiUpgrades.nextRate')} ${nextProductionRateSeconds}s`
          ]"
          :buttonLabel="!canUpgradeProduction ? $t('poiUpgrades.unavailable') : !canAffordProduction ? $t('poiUpgrades.insufficientFuel') : $t('poiUpgrades.upgradeButton')"
          :disabled="!canUpgradeProduction || !canAffordProduction"
          :onClick="handleProductionRateUpgrade"
        />

        <UpgradeCard
          v-if="poi?.type === 'barrack'"
          :title="$t('poiUpgrades.barrackAutoAttack')"
          :subtitle="`${barrackAutoAttackLevel} → ${barrackAutoAttackNextLevel}`"
          :cost="barrackAutoAttackCost ?? '—'"
          :costColor="policeColor"
          :description="[
            $t('poiUpgrades.barrackAutoAttackDesc'),
            barrackAutoAttackLevel > 0 ? `${$t('poiUpgrades.currentCooldown')} ${barrackAutoAttackCooldownDisplay}s` : ''
          ].filter(Boolean)"
          :buttonLabel="!canUpgradeBarrackAutoAttack ? $t('poiUpgrades.unavailable') : !canAffordBarrackAutoAttack ? $t('poiUpgrades.insufficientPolice') : $t('poiUpgrades.upgradeButton')"
          :disabled="!canUpgradeBarrackAutoAttack || !canAffordBarrackAutoAttack"
          :onClick="handleBarrackAutoAttackUpgrade"
        />

        <UpgradeCard
          v-if="poi?.type === 'barrack'"
          :title="$t('poiUpgrades.barrackAutoHeal')"
          :subtitle="`${barrackAutoHealLevel} → ${barrackAutoHealNextLevel}`"
          :cost="barrackAutoHealCost ?? '—'"
          :costColor="pharmacyColor"
          :description="[
            $t('poiUpgrades.barrackAutoHealDesc'),
            barrackAutoHealLevel > 0 ? `${$t('poiUpgrades.currentCooldown')} ${barrackAutoHealCooldownDisplay}s` : ''
          ].filter(Boolean)"
          :buttonLabel="!canUpgradeBarrackAutoHeal ? $t('poiUpgrades.unavailable') : !canAffordBarrackAutoHeal ? $t('poiUpgrades.insufficientPharmacy') : $t('poiUpgrades.upgradeButton')"
          :disabled="!canUpgradeBarrackAutoHeal || !canAffordBarrackAutoHeal"
          :onClick="handleBarrackAutoHealUpgrade"
        />

        <UpgradeCard
          v-if="poi?.type === 'barrack'"
          :title="$t('poiUpgrades.barrackNodes')"
          :subtitle="`${barrackNodesLevel} → ${barrackNodesNextLevel}`"
          :cost="barrackNodesCost ?? '—'"
          :costColor="foodColor"
          :description="$t('poiUpgrades.barrackNodesDesc')"
          :buttonLabel="!canAffordBarrackNodes ? $t('poiUpgrades.insufficientFood') : $t('poiUpgrades.upgradeButton')"
          :disabled="!canAffordBarrackNodes"
          :onClick="handleBarrackNodesUpgrade"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useGameStore } from '@/stores/gameStore';
import { usePoiStore } from '@/stores/poiStore';
import { getPOIColor } from '@/constants/poiTypes';
import BaseButton from '@/components/UI/BaseButton.vue';
import UpgradeCard from '@/components/UpgradeCard.vue';
import { PRODUCTION_RATE_MIN_MS, PRODUCTION_RATE_MULTIPLIER } from '@/constants/poiUpgrades';

const emit = defineEmits(['close']);

const props = defineProps({
  poi: {
    type: Object,
    required: true,
  },
});

const AUTO_EXTRACT_COST = 10;
const BARRACK_UPGRADE_COST_MULTIPLIER = 0.7;
const gameStore = useGameStore();
const poiStore = usePoiStore();
const { resources } = storeToRefs(gameStore);
const policeColor = getPOIColor('police');
const foodColor = getPOIColor('food');
const pharmacyColor = getPOIColor('pharmacy');

const hasAutoExtract = computed(() => !!props.poi?.autoExtract);
const canUpgrade = computed(() => props.poi?.owned && props.poi?.type !== 'barrack');
const canAfford = computed(() => resources.value.fuel >= AUTO_EXTRACT_COST);
const autoExtractCost = computed(() => AUTO_EXTRACT_COST);

const handleAutoExtractUpgrade = () => {
  if (!canUpgrade.value || hasAutoExtract.value) return;
  const paid = gameStore.consumeResource('fuel', AUTO_EXTRACT_COST);
  if (!paid) return;
  poiStore.setAutoExtract(props.poi.id, true);
};

const productionUpgradeLevel = computed(() => props.poi?.productionUpgradeLevel ?? 0);
const productionUpgradeNextLevel = computed(() => productionUpgradeLevel.value + 1);
const productionUpgradeCost = computed(() => poiStore.getProductionUpgradeCostForLevel(productionUpgradeNextLevel.value));
const canUpgradeProduction = computed(() => props.poi?.owned && props.poi?.type !== 'barrack');
const canAffordProduction = computed(() => {
  const cost = productionUpgradeCost.value ?? null;
  return cost != null && resources.value.fuel >= cost;
});
const productionRateSeconds = computed(() => {
  const rate = props.poi?.productionRate ?? null;
  if (!rate) return '—';
  return (rate / 1000).toFixed(1);
});
const nextProductionRateSeconds = computed(() => {
  const baseRate = props.poi?.productionBaseRate ?? props.poi?.productionRate ?? null;
  if (!baseRate) return '—';
  const nextRate = Math.max(
    PRODUCTION_RATE_MIN_MS,
    Math.round(baseRate * Math.pow(PRODUCTION_RATE_MULTIPLIER, productionUpgradeNextLevel.value))
  );
  return (nextRate / 1000).toFixed(1);
});

const handleProductionRateUpgrade = () => {
  if (!canUpgradeProduction.value) return;
  const cost = productionUpgradeCost.value;
  if (!cost) return;
  const paid = gameStore.consumeResource('fuel', cost);
  if (!paid) return;
  poiStore.upgradeProductionRate(props.poi.id);
};

const barrackAutoAttackLevel = computed(() => props.poi?.barrackAutoAttackLevel ?? 0);
const barrackAutoAttackNextLevel = computed(() => barrackAutoAttackLevel.value + 1);
const barrackAutoAttackCost = computed(() => {
  const baseCost = gameStore.getAutoAttackUpgradeCostForLevel(barrackAutoAttackNextLevel.value);
  if (baseCost == null) return baseCost;
  return Math.max(1, Math.round(baseCost * BARRACK_UPGRADE_COST_MULTIPLIER));
});
const canUpgradeBarrackAutoAttack = computed(() => props.poi?.owned && props.poi?.type === 'barrack');
const canAffordBarrackAutoAttack = computed(() => {
  const cost = barrackAutoAttackCost.value ?? null;
  return cost != null && resources.value.police >= cost;
});
const barrackAutoAttackCooldownDisplay = computed(() => {
  const cooldown = gameStore.computeAutoAttackCooldownMs(barrackAutoAttackLevel.value);
  if (!cooldown) return '—';
  return (cooldown / 1000).toFixed(1);
});

const handleBarrackAutoAttackUpgrade = () => {
  if (!canUpgradeBarrackAutoAttack.value) return;
  const cost = barrackAutoAttackCost.value;
  if (!cost) return;
  const paid = gameStore.consumeResource('police', cost);
  if (!paid) return;
  poiStore.upgradeBarrackAutoAttack(props.poi.id);
};

const barrackAutoHealLevel = computed(() => props.poi?.barrackAutoHealLevel ?? 0);
const barrackAutoHealNextLevel = computed(() => barrackAutoHealLevel.value + 1);
const barrackAutoHealCost = computed(() => {
  const baseCost = gameStore.getAutoHealUpgradeCostForLevel(barrackAutoHealNextLevel.value);
  if (baseCost == null) return baseCost;
  return Math.max(1, Math.round(baseCost * BARRACK_UPGRADE_COST_MULTIPLIER));
});
const canUpgradeBarrackAutoHeal = computed(() => props.poi?.owned && props.poi?.type === 'barrack');
const canAffordBarrackAutoHeal = computed(() => {
  const cost = barrackAutoHealCost.value ?? null;
  return cost != null && resources.value.pharmacy >= cost;
});
const barrackAutoHealCooldownDisplay = computed(() => {
  const cooldown = gameStore.getAutoHealCooldownMs(barrackAutoHealLevel.value);
  if (!cooldown) return '—';
  return (cooldown / 1000).toFixed(1);
});

const handleBarrackAutoHealUpgrade = () => {
  if (!canUpgradeBarrackAutoHeal.value) return;
  const cost = barrackAutoHealCost.value;
  if (!cost) return;
  const paid = gameStore.consumeResource('pharmacy', cost);
  if (!paid) return;
  poiStore.upgradeBarrackAutoHeal(props.poi.id);
};

const barrackNodesLevel = computed(() => props.poi?.barrackNodesLevel ?? 1);
const barrackNodesNextLevel = computed(() => barrackNodesLevel.value + 1);
const barrackNodesCost = computed(() => {
  const baseCost = gameStore.getUpgradeCostForLevel(barrackNodesNextLevel.value);
  if (baseCost == null) return baseCost;
  return Math.max(1, Math.round(baseCost * BARRACK_UPGRADE_COST_MULTIPLIER));
});
const canAffordBarrackNodes = computed(() => {
  const cost = barrackNodesCost.value ?? null;
  return cost != null && resources.value.food >= cost;
});
const handleBarrackNodesUpgrade = () => {
  const cost = barrackNodesCost.value;
  if (!cost) return;
  const paid = gameStore.consumeResource('food', cost);
  if (!paid) return;
  poiStore.upgradeBarrackNodes(props.poi.id);
};

const handleClose = () => {
  emit('close');
};
</script>
