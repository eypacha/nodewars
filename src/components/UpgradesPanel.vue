<template>
  <div class="fixed inset-0 flex items-center justify-center z-[1100] bg-black/50">
    <div class="bg-black border-2 border-white p-8 shadow-2xl w-[calc(100vw-4rem)] mx-4 h-[calc(100vh-4rem)] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-white">Upgrade Base</h2>
        <button
          @click="handleClose"
          class="text-white text-1xl font-bold leading-none cursor-pointer"
        >
          ✕
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <!-- Radar Level Upgrade -->
        <div class="border border-white p-4">
          <div class="flex justify-between items-start mb-3">
            <div>
              <p class="text-white text-sm font-bold">Radar</p>
              <p class="text-gray-400 text-xs mt-1">{{ radarLevel }} → {{ radarLevel + 1 }}</p>
            </div>
            <div class="text-right">
              <p class="text-yellow-400 text-base font-bold">{{ nextUpgradeCostDisplay }}</p>
            </div>
          </div>

          <div class="mb-4 text-gray-300 text-sm space-y-1">
            <p>Aumenta el rango del radar en 30%</p>
            <p class="text-gray-500">Radio actual: <span class="text-white font-bold">{{ currentRadarRadius }}m</span></p>
          </div>

          <button
            @click="handleUpgrade"
            :disabled="!canAffordUpgrade || maxLevelReached"
            class="w-full font-bold py-3 px-4 border-2 text-sm relative overflow-hidden transition-all"
            :class="{
              'cursor-pointer border-white': canAffordUpgrade && !maxLevelReached,
              'opacity-50': !canAffordUpgrade || maxLevelReached
            }"
          >
            {{ maxLevelReached ? 'Nivel Máximo' : canAffordUpgrade ? 'Upgrade' : 'Dinero insuficiente' }}
          </button>
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

const emit = defineEmits(['close']);

const gameStore = useGameStore();
const { resources, radarLevel } = storeToRefs(gameStore);

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

const handleClose = () => {
  emit('close');
};
</script>

<style scoped>
</style>
