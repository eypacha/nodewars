<template>
  <div class="pointer-events-none fixed top-3 left-1/2 -translate-x-1/2 z-[2000]">
    <div class="bg-black/70 border border-white shadow-lg px-3 py-2 flex gap-2 backdrop-blur-sm">
      <div
        v-for="item in resourceList"
        :key="item.key"
        class="flex items-center gap-2 font-bold text-white px-2 py-1 w-7 justify-center text-sm"
        :style="{ backgroundColor: item.bg, color: '#0b0b0b' }"
      >
        {{ resources[item.key] }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useGameStore } from '@/stores/gameStore';
import { RESOURCE_POI_TYPES, getPOIColor, getPOIDisplayName } from '@/constants/poiTypes';

const gameStore = useGameStore();
const { resources } = storeToRefs(gameStore);

const resourceList = computed(() =>
  RESOURCE_POI_TYPES.map((type) => ({
    key: type,
    label: getPOIDisplayName(type),
    bg: getPOIColor(type),
  }))
);
</script>
