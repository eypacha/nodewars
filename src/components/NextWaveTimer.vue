<template>
  <div class="next-wave-timer px-2 py-1 text-white flex flex-col sm:flex-row items-center gap-0 sm:gap-2">
    <span>{{ $t('hud.wave') }} {{ displayedWaveNumber }}</span>
    <template v-if="showCountdown">
      <span class="hidden sm:inline">→</span>
      <span class="font-mono font-bold" :class="{ 'text-red-600': remainingSeconds <= 10 }">{{ formattedTime }}</span>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useEnemyStore } from '@/stores/enemyStore';
import { useGameClockStore } from '@/stores/gameClockStore';

const enemyStore = useEnemyStore();
const { nextWaveTimestamp, waveNumber } = storeToRefs(enemyStore);
const gameClockStore = useGameClockStore();
const { nowMs } = storeToRefs(gameClockStore);

const showCountdown = computed(() => {
  const target = Number.isFinite(nextWaveTimestamp.value) ? nextWaveTimestamp.value : 0;
  return target > nowMs.value;
});

const remainingSeconds = computed(() => {
  const target = Number.isFinite(nextWaveTimestamp.value) ? nextWaveTimestamp.value : 0;
  if (!target || target <= nowMs.value) return 0;
  return Math.max(0, Math.ceil((target - nowMs.value) / 1000));
});

const formattedTime = computed(() => {
  const secs = remainingSeconds.value;
  if (!secs) return '';
  const min = Math.floor(secs / 60);
  const sec = secs % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
});

const displayedWaveNumber = computed(() => {
  return showCountdown.value ? waveNumber.value : (waveNumber.value - 1);
});
</script>

<style scoped>
.next-wave-timer {
  min-width: 110px;
  justify-content: center;
}
</style>
