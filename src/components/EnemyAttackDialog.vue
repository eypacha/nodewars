<template>
  <div class="absolute" :style="style">
    <DialogShell border-color="white">
      <div class="flex flex-col gap-2 min-w-[140px]">
        <div class="text-white text-sm font-bold">Enemy</div>
        <ProgressButton
          :label="$t('poi.attack')"
          :disabled="isOnCooldown"
          :show-progress="isOnCooldown"
          :progress="cooldownProgress"
          @click="$emit('attack')"
        />
      </div>
    </DialogShell>
  </div>
</template>

<script setup>
import DialogShell from '@/components/UI/DialogShell.vue';
import ProgressButton from '@/components/UI/ProgressButton.vue';

defineProps({
  style: {
    type: Object,
    required: true,
  },
  isOnCooldown: {
    type: Boolean,
    default: false,
  },
  cooldownProgress: {
    type: Number,
    default: 0,
  },
});

defineEmits(['attack']);
</script>
