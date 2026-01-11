<template>
  <DialogShell border-color="white" class="w-60">
    <p class="text-center text-white text-sm mb-3">
      {{ $t('markerConfirm.instruction') }}
    </p>
    <BaseButton 
      block
      full-width
      class="mx-auto"
      :label="$t('markerConfirm.confirm')"
      @click="$emit('confirm')"
    />
  </DialogShell>
</template>

<script setup>
import DialogShell from '@/components/UI/DialogShell.vue';
import BaseButton from '@/components/UI/BaseButton.vue';

defineEmits(['confirm']);
</script>
