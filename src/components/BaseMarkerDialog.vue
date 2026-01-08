<template>
  <DialogShell border-color="white" background-color="black" container-class="bg-black" wrapper-class="mb-2 w-120">
    <div class="flex gap-2">
      <button 
        @click="$emit(isScanning ? 'stopScan' : 'scan')"
        :class="[
          'font-bold py-2 px-4 border-1 text-sm flex-1 cursor-pointer'
        ]"
      >
        {{ isScanning ? $t('baseMarker.stopScan') : $t('baseMarker.scan') }}
      </button>
      <button 
        @click="$emit('upgrades')"
        class="font-bold py-2 px-4 border-1 text-sm flex-1 cursor-pointer"
      >
        {{ $t('baseMarker.upgrades') }}
      </button>
    </div>
  </DialogShell>
</template>

<script setup>
import DialogShell from '@/components/UI/DialogShell.vue';

defineProps({
  isScanning: {
    type: Boolean,
    default: false
  }
});

defineEmits(['scan', 'stopScan', 'upgrades']);
</script>
