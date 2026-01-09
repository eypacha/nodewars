<template>
  <div class="pointer-events-none">
    <div class="border px-3 py-2 text-white text-sm flex flex-col">
      <div class="flex items-center justify-between gap-2">
        <span class="font-bold">{{ $t('hud.contour') }}</span>
        <span>{{ formattedPerimeter }}</span>
        <span class="font-bold">{{ $t('hud.field') }}</span>
        <span>{{ formattedArea }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useMapStore } from '@/stores/mapStore';

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
  return `${(value / 1_000_000).toFixed(2)} km²`;
});
</script>
