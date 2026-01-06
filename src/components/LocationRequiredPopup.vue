<template>
  <div class="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
    <div class="bg-black border-2 border-white p-8 shadow-2xl max-w-md w-full mx-4">
      <h2 class="text-xl font-bold text-center mb-4">
        {{ $t('locationRequired.title') }}
      </h2>
      <p class="text-center text-white mb-4">
        {{ $t('locationRequired.description') }}<br>
        {{ $t('locationRequired.pleaseAccept') }}
      </p>
      <div class="text-sm text-gray-300 text-center mb-8">
        {{ $t('locationRequired.manualEnable') }}<br>
        <span class="font-semibold">{{ $t('locationRequired.howTo') }}</span><br>
        {{ $t('locationRequired.instructions') }}<br>
        {{ $t('locationRequired.thenRetry') }}
      </div>
      <button 
        @click="$emit('retry')"
        class="cursor-pointer font-bold py-4 px-6 border-1 text-xl mx-auto block"
      >
        {{ $t('locationRequired.retryButton') }}
      </button>
    </div>
  </div>
</template>

<script setup>
defineEmits(['retry']);
</script>
