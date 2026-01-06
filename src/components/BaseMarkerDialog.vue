<template>
  <div class="pointer-events-auto mb-2 w-120">
    <div class="bg-black border-2 border-white px-4 py-3 shadow-2xl relative">
      <div class="flex gap-2">
        <button 
          @click="$emit('scan')"
          :disabled="isScanning"
          :class="[
            'font-bold py-2 px-4 border-1 text-sm flex-1',
            isScanning ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          ]"
        >
          {{ isScanning ? $t('baseMarker.scanning') : $t('baseMarker.scan') }}
        </button>
        <button 
          @click="$emit('selectAsAttackOrigin')"
          :class="[
            'font-bold py-2 px-4 border-1 text-sm flex-1',
            isActive ? 'bg-blue-600 border-blue-400 cursor-default' : 'cursor-pointer'
          ]"
          :disabled="isActive"
        >
          {{ isActive ? $t('baseMarker.active') : $t('baseMarker.makeActive') }}
        </button>
        <button 
          @click="$emit('upgrades')"
          class="font-bold py-2 px-4 border-1 text-sm flex-1 cursor-pointer"
        >
          {{ $t('baseMarker.upgrades') }}
        </button>
      </div>
      <div class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white"></div>
      <div class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-black mt-[-2px]"></div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  isScanning: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: false
  }
});

defineEmits(['scan', 'upgrades', 'selectAsAttackOrigin']);
</script>
