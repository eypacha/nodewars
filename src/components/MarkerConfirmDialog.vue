<template>
  <DialogShell border-color="white" background-color="black" container-class="bg-black" wrapper-class="pointer-events-auto mb-2 max-w-xs">
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
