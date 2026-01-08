<template>
  <div class="fixed inset-0 flex items-center justify-center z-50 bg-black/60">
    <div class="bg-black border-2 border-white p-8 shadow-2xl max-w-md w-full mx-4 text-center">
      <h1 class="text-3xl font-bold mb-4">Game Over</h1>
      <p class="mb-6 text-sm opacity-80">La base fue destruida.</p>
      <BaseButton
        full-width
        block
        base-class="cursor-pointer font-bold py-4 px-6 border-1 text-xl mx-auto block w-full"
        label="Reiniciar"
        @click="$emit('restart')"
      />
    </div>
  </div>
</template>

<script setup>
import BaseButton from '@/components/UI/BaseButton.vue';

defineEmits(['restart']);
</script>
