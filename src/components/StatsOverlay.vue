<template>
  <div class="fixed inset-0 z-[2600] flex items-center justify-center bg-black/70 text-white">
    <div class="w-full max-w-sm border border-white/60 bg-black/90 p-6 text-center">
      <h2 class="text-2xl font-bold mb-3">{{ t('stats.title') }}</h2>
      <div class="border border-white/40 p-4 text-left">
        <div class="flex items-center justify-between gap-2 text-sm">
          <span class="font-bold">{{ t('stats.contour') }}</span>
          <span>{{ formattedPerimeter }}</span>
        </div>
        <div class="flex items-center justify-between gap-2 text-sm mt-2">
          <span class="font-bold">{{ t('stats.field') }}</span>
          <span>{{ formattedArea }}</span>
        </div>
        <div class="flex items-center justify-between gap-2 text-sm mt-2">
          <span class="font-bold">{{ t('stats.enemiesDestroyed') }}</span>
          <span>{{ enemiesDestroyed }}</span>
        </div>
        <div class="flex items-center justify-between gap-2 text-sm mt-2">
          <span class="font-bold">{{ t('stats.activeBarracks') }}</span>
          <span>{{ activeBarracks }}</span>
        </div>
      </div>
      <div class="border border-white/40 p-4 text-left mt-4">
        <div class="flex items-center justify-between gap-2 text-sm font-bold mb-2">
          <span>{{ t('stats.resources') }}</span>
          <span>{{ t('stats.capturedTotal') }}</span>
        </div>
        <div
          v-for="entry in resourceStats"
          :key="entry.type"
          class="flex items-center justify-between gap-2 text-sm"
        >
          <span class="flex items-center gap-2">
            <span
              class="inline-block h-2.5 w-2.5 rounded-full flex"
              :style="{ backgroundColor: entry.color }"
              aria-hidden="true"
            ></span>
            <span>{{ entry.label }}</span>
          </span>
          <span>{{ entry.owned }}/{{ entry.total }} ({{ entry.percent }}%)</span>
        </div>
      </div>
      <BaseButton
        full-width
        block
        base-class="cursor-pointer font-bold py-3 px-6 border-1 text-lg mx-auto block w-full mt-5"
        :label="t('stats.back')"
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
import { useI18n } from 'vue-i18n';

defineEmits(['back']);

const { t } = useI18n();
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

const activeBarracks = computed(() => {
  const list = Array.isArray(pois.value) ? pois.value : [];
  return list.filter((poi) => poi.type === 'barrack' && poi.owned).length;
});
</script>
