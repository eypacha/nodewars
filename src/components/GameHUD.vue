<template>
  <div class="pointer-events-none fixed left-0 right-0 z-[2000] p-3 bg-black">
    <div class="flex items-center justify-between gap-3">
      <ResourceHUD />
      <NextWaveTimer />
      <CoverageHUD />
    </div>
  </div>
</template>

<script setup>
import CoverageHUD from './CoverageHUD.vue';
import ResourceHUD from './ResourceHUD.vue';
import NextWaveTimer from './NextWaveTimer.vue';
</script>
