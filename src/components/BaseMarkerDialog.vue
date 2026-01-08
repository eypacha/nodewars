<template>
  <DialogShell border-color="white" background-color="black" container-class="bg-black" wrapper-class="mb-2 w-60">
    <div class="mb-3">
      <LabeledProgressBar
        :left-label="$t('baseMarker.health')"
        :right-label="`${baseHealth} / ${baseMaxHealth}`"
        :progress="baseMaxHealth ? (baseHealth / baseMaxHealth) * 100 : 0"
        bar-color="#22c55e"
      />
    </div>
    <div class="flex flex-col gap-2 mb-2">
      <ProgressButton
        class="flex-1"
        :label="$t('baseMarker.heal')"
        :disabled="isHealOnCooldown || baseHealth >= baseMaxHealth || !canHeal"
        :show-progress="isHealOnCooldown"
        :progress="healProgress"
        @click="$emit('heal')"
      />
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
import ProgressButton from '@/components/UI/ProgressButton.vue';

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
  isHealOnCooldown: {
    type: Boolean,
    default: false,
  },
  healProgress: {
    type: Number,
    default: 0,
  },
  canHeal: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['scan', 'stopScan', 'upgrades', 'heal']);
</script>
