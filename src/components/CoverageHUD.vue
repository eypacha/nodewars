<template>
  <div class="pointer-events-none fixed top-3 right-3 z-[2000]">
    <div class="bg-black/70 border border-sky-400 shadow-lg px-3 py-2 backdrop-blur-sm text-white text-sm flex flex-col gap-1 min-w-[180px]">
      <div class="flex items-center justify-between gap-2">
          <span>{{ $t('coverage.contour') }}</span>
        <span class="font-bold">{{ formattedPerimeter }}</span>
      </div>
      <div class="flex items-center justify-between gap-2">
          <span>{{ $t('coverage.field') }}</span>
        <span class="font-bold">{{ formattedArea }}</span>
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
  if (props.perimeter >= 1000) {
    return `${(props.perimeter / 1000).toFixed(2)} km`;
  }
  return `${Math.round(props.perimeter)} m`;
});

const formattedArea = computed(() => `${(props.area / 1_000_000).toFixed(2)} km²`);
</script>
