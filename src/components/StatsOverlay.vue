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
        <div class="flex items-center justify-between gap-2 text-sm mt-2">
          <span class="font-bold">Enemigos destruidos</span>
          <span>{{ enemiesDestroyed }}</span>
        </div>
      </div>
      <div class="border border-white/40 p-4 text-left mt-4">
        <div class="flex items-center justify-between gap-2 text-sm font-bold mb-2">
          <span class="w-40">Recursos capturados</span>
        </div>
        <div
          v-for="entry in resourceStats"
          :key="entry.type"
          class="flex items-center justify-between gap-2 text-sm"
        >
          <span class="flex items-center gap-2 w-30">
            <span
              class="inline-block h-2.5 w-2.5 rounded-full flex"
              :style="{ backgroundColor: entry.color }"
              aria-hidden="true"
            ></span>
            <span>{{ entry.label }}</span>
          </span>
          <span class="w-10 text-right">{{ entry.owned }}</span>
          <span class="w-10 text-right">{{ entry.percent }}%</span> 
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
import { usePoiStore } from '@/stores/poiStore';
import { useEnemyStore } from '@/stores/enemyStore';
import { RESOURCE_POI_TYPES, getPOIColor, getPOIDisplayName, normalizePOICategory } from '@/constants/poiTypes';

defineEmits(['back']);

const mapStore = useMapStore();
const { coverageMetrics } = storeToRefs(mapStore);
const poiStore = usePoiStore();
const { pois } = storeToRefs(poiStore);
const enemyStore = useEnemyStore();
const { enemiesDestroyed } = storeToRefs(enemyStore);

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

const resourceStats = computed(() => {
  const list = Array.isArray(pois.value) ? pois.value : [];
  return RESOURCE_POI_TYPES.map((type) => {
    const total = list.filter((poi) => normalizePOICategory(poi.category || poi.type) === type).length;
    const owned = list.filter((poi) => poi.owned && normalizePOICategory(poi.category || poi.type) === type).length;
    const percent = total > 0 ? Math.round((owned / total) * 100) : 0;
    return {
      type,
      total,
      owned,
      percent,
      label: getPOIDisplayName(type),
      color: getPOIColor(type),
    };
  });
});
</script>
