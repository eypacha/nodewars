<template>
  <div class="fixed inset-0 z-[2600] flex items-center justify-center bg-black/70 text-white">
    <div class="w-full max-w-sm border border-white/60 bg-black/90 p-6 text-center">
      <h2 class="text-2xl font-bold mb-3">Estadisticas</h2>
      <div class="border border-white/40 p-4 text-left">
        <div class="flex items-center justify-between gap-2 text-sm">
          <span class="font-bold">Contorno</span>
          <span>{{ formattedPerimeter }}</span>
        </div>
        <div class="flex items-center justify-between gap-2 text-sm mt-2">
          <span class="font-bold">Campo</span>
          <span>{{ formattedArea }}</span>
        </div>
      </div>
      <BaseButton
        full-width
        block
        base-class="cursor-pointer font-bold py-3 px-6 border-1 text-lg mx-auto block w-full mt-5"
        label="Volver"
        @click="$emit('back')"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import BaseButton from '@/components/UI/BaseButton.vue';
import { useMapStore } from '@/stores/mapStore';

defineEmits(['back']);

const mapStore = useMapStore();
const { coverageMetrics } = storeToRefs(mapStore);

const formattedPerimeter = computed(() => {
  const value = Number.isFinite(coverageMetrics.value.perimeter) ? coverageMetrics.value.perimeter : 0;
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} km`;
  }
  return `${Math.round(value)} m`;
});

const formattedArea = computed(() => {
  const value = Number.isFinite(coverageMetrics.value.area) ? coverageMetrics.value.area : 0;
  return `${(value / 1_000_000).toFixed(2)} km2`;
});
</script>
