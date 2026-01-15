<template>
  <DialogShell border-color="white" class="mb-2 w-60">
    <div class="mb-3">
      <LabeledProgressBar
        :left-label="$t('baseMarker.health')"
        :right-label="`${baseHealth} / ${baseMaxHealth}`"
        :progress="baseMaxHealth ? (baseHealth / baseMaxHealth) * 100 : 0"
        bar-color="#22c55e"
      />
    </div>
    <div v-if="showAutoHeal" class="mb-2">
      <LabeledProgressBar
        :left-label="$t('baseMarker.autoHeal')"
        :right-label="autoHealLabel"
        :progress="autoHealProgress"
        bar-color="white"
      />
    </div>
    <p class="text-white text-xs mb-2 opacity-75">
      {{ baseNodesUsed }} / {{ baseNodesMax }} {{ $t('baseMarker.nodesConnected') }}
    </p>
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
  baseNodesUsed: {
    type: Number,
    default: 0,
  },
  baseNodesMax: {
    type: Number,
    default: 0,
  },
  showAutoHeal: {
    type: Boolean,
    default: false,
  },
  autoHealProgress: {
    type: Number,
    default: 0,
  },
  autoHealLabel: {
    type: String,
    default: '',
  },
});

defineEmits(['scan', 'stopScan', 'upgrades', 'heal']);
</script>
