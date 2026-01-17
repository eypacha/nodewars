<template>
  <div class="fixed inset-0 z-[2600] flex items-center justify-center bg-black/70 text-white">
    <div class="w-full max-w-sm border border-white/60 bg-black/90 p-6 text-center">
      <h2 class="text-2xl font-bold mb-3">Juego en pausa</h2>
      <BaseButton
        full-width
        block
        base-class="cursor-pointer font-bold py-3 px-6 border-1 text-lg mx-auto block w-full"
        label="Volver al juego"
        @click="$emit('resume')"
      />
    </div>
  </div>
</template>

<script setup>
import BaseButton from '@/components/UI/BaseButton.vue';

defineEmits(['resume']);
</script>
