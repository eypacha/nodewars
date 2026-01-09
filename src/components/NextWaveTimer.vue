<template>
  <div class="next-wave-timer px-2 py-1 text-white flex items-center gap-2">
    <span>{{ $t('hud.wave') }} {{ waveNumber }}</span>
    <span>→</span>
    <span class="font-mono font-bold">{{ formattedTime }}</span>
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

const formattedTime = computed(() => {
  const target = Number.isFinite(nextWaveTimestamp.value) ? nextWaveTimestamp.value : 0;
  if (!target || target <= now.value) return '0:00';
  const diff = Math.max(0, Math.floor((target - now.value) / 1000));
  const min = Math.floor(diff / 60);
  const sec = diff % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
});
</script>

<style scoped>
.next-wave-timer {
  min-width: 110px;
  justify-content: center;
}
</style>
