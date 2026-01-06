<template>
  <div class="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
    <div class="bg-black border-2 border-white p-8 shadow-2xl max-w-md w-full mx-4">
      <h2 class="text-xl font-bold text-center mb-8">
        {{ $t('locationRequired.title') }}
      </h2>
      <button 
        @click="$emit('back')"
        class="cursor-pointer font-bold py-4 px-6 border-1 text-xl mx-auto block"
      >
        {{ $t('locationRequired.backButton') }}
      </button>
    </div>
  </div>
</template>

<script setup>
defineEmits(['back']);
</script>
