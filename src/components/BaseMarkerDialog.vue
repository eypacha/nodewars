<template>
  <DialogShell border-color="white" background-color="black" container-class="bg-black" wrapper-class="mb-2 w-120">
    <div class="mb-3">
      <LabeledProgressBar
        :left-label="$t('baseMarker.health')"
        :right-label="`${baseHealth} / ${baseMaxHealth}`"
        :progress="baseMaxHealth ? (baseHealth / baseMaxHealth) * 100 : 0"
        bar-color="#22c55e"
      />
    </div>
    <div class="flex gap-2">
      <BaseButton
        class="flex-1"
        :label="isScanning ? $t('baseMarker.stopScan') : $t('baseMarker.scan')"
        @click="$emit(isScanning ? 'stopScan' : 'scan')"
      />
      <BaseButton
        class="flex-1"
        :label="$t('baseMarker.upgrades')"
        @click="$emit('upgrades')"
      />
    </div>
  </DialogShell>
</template>

<script setup>
import DialogShell from '@/components/UI/DialogShell.vue';
import BaseButton from '@/components/UI/BaseButton.vue';
import LabeledProgressBar from '@/components/UI/LabeledProgressBar.vue';

defineProps({
  isScanning: {
    type: Boolean,
    default: false
  },
  baseHealth: {
    type: Number,
    default: 0,
  },
  baseMaxHealth: {
    type: Number,
    default: 0,
  },
});

defineEmits(['scan', 'stopScan', 'upgrades']);
</script>
