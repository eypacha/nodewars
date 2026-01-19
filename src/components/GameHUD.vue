<template>
  <div class="pointer-events-none fixed left-0 right-0 z-[2000] p-3 bg-black">
    <div class="flex items-center justify-between gap-3">
      <ResourceHUD />
      <NextWaveTimer />
      <button
        class="pointer-events-auto cursor-pointer px-2 py-1 text-lg font-semibold text-white"
        type="button"
        aria-label="Pausar o reanudar"
        @click="gameClockStore.pause"
      >
        ☰
      </button>
    </div>
  </div>
</template>

<script setup>
import ResourceHUD from './ResourceHUD.vue';
import NextWaveTimer from './NextWaveTimer.vue';
import { useGameClockStore } from '@/stores/gameClockStore';

const gameClockStore = useGameClockStore();
</script>
