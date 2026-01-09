<template>
  <div class="pointer-events-none">
    <div class="border border-sky-400 shadow-lg px-3 py-2 backdrop-blur-sm text-white text-sm flex flex-col gap-1 min-w-[180px]">
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

const props = defineProps({
  perimeter: {
    type: Number,
    default: 0,
  },
  area: {
    type: Number,
    default: 0,
  },
});

const formattedPerimeter = computed(() => {
  const value = Number.isFinite(props.perimeter) ? props.perimeter : 0;
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)} km`;
  }
  return `${Math.round(value)} m`;
});

const formattedArea = computed(() => {
  const value = Number.isFinite(props.area) ? props.area : 0;
  return `${(value / 1_000_000).toFixed(2)} km²`;
});
</script>
