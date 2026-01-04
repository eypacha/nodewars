<template>
  <div class="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
    <div class="bg-black border-2 border-white p-8 shadow-2xl max-w-md w-full mx-4">
      <h2 class="text-2xl font-bold text-center mb-4">
        Permiso de ubicación requerido
      </h2>
      <p class="text-center mb-8">
        El juego necesita acceso a tu ubicación para funcionar correctamente.<br>
        Por favor, acepta el permiso para continuar.
      </p>
      <button 
        @click="$emit('retry')"
        class="cursor-pointer font-bold py-4 px-6 border-1 text-xl mx-auto block"
      >
        Intentar de nuevo
      </button>
    </div>
  </div>
</template>

<script setup>
defineEmits(['retry']);
</script>
