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
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useEnemyStore } from '@/stores/enemyStore';

const enemyStore = useEnemyStore();
const { nextWaveTimestamp, waveNumber } = storeToRefs(enemyStore);

const now = ref(Date.now());
let intervalId = null;

onMounted(() => {
  intervalId = setInterval(() => {
    now.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
});

const showCountdown = computed(() => {
  const target = Number.isFinite(nextWaveTimestamp.value) ? nextWaveTimestamp.value : 0;
  return target > now.value;
});

const remainingSeconds = computed(() => {
  const target = Number.isFinite(nextWaveTimestamp.value) ? nextWaveTimestamp.value : 0;
  if (!target || target <= now.value) return 0;
  return Math.max(0, Math.ceil((target - now.value) / 1000));
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
