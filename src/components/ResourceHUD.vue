<template>
  <div class="pointer-events-none">
    <div class="px-3 py-2 flex gap-2">
      <div
        v-for="item in resourceList"
        :key="item.key"
        class="flex items-center gap-2 rounded-full font-bold text-white px-2 py-1 w-7 justify-center text-sm"
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
