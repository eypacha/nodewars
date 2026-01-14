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

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div class="border border-white p-4">
          <div class="flex justify-between items-start mb-3">
            <div>
              <p class="text-white text-sm font-bold">{{ $t('poiUpgrades.autoExtract') }}</p>
              <p class="text-gray-400 text-xs mt-1">
                {{ hasAutoExtract ? $t('poiUpgrades.unlocked') : $t('poiUpgrades.locked') }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-base font-bold" :style="{ color: '#cd23e8ff' }">
                {{ autoExtractCost }} ●
              </p>
            </div>
          </div>

          <div class="mb-4 text-gray-300 text-sm space-y-1">
            <p>{{ $t('poiUpgrades.autoExtractDesc') }}</p>
          </div>

          <BaseButton
            @click="handleAutoExtractUpgrade"
            :disabled="hasAutoExtract || !canUpgrade || !canAfford"
            :label="hasAutoExtract ? $t('poiUpgrades.unlocked') : !canUpgrade ? $t('poiUpgrades.unavailable') : !canAfford ? $t('poiUpgrades.insufficientFuel') : $t('poiUpgrades.upgradeButton')"
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
import { usePoiStore } from '@/stores/poiStore';
import BaseButton from '@/components/UI/BaseButton.vue';

const emit = defineEmits(['close']);

const props = defineProps({
  poi: {
    type: Object,
    required: true,
  },
});

const AUTO_EXTRACT_COST = 10;
const gameStore = useGameStore();
const poiStore = usePoiStore();
const { resources } = storeToRefs(gameStore);

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

const handleClose = () => {
  emit('close');
};
</script>
