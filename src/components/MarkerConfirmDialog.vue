<template>
  <DialogShell border-color="white" background-color="black" container-class="bg-black" wrapper-class="pointer-events-auto mb-2 max-w-xs">
    <p class="text-center text-white text-sm mb-3">
      {{ $t('markerConfirm.instruction') }}
    </p>
    <button 
      @click="$emit('confirm')"
      class="cursor-pointer font-bold py-2 px-4 border-1 text-sm mx-auto block w-full"
    >
      {{ $t('markerConfirm.confirm') }}
    </button>
  </DialogShell>
</template>

<script setup>
import DialogShell from '@/components/UI/DialogShell.vue';

defineEmits(['confirm']);
</script>
