<template>
  <div class="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
    <div class="bg-black border-2 border-white p-8 shadow-2xl max-w-md w-full mx-4">
      <h2 class="text-xl font-bold text-center mb-4">
        Permiso de ubicación requerido
      </h2>
      <p class="text-center text-white mb-4">
        El juego necesita acceso a tu ubicación para funcionar correctamente.<br>
        Por favor, acepta el permiso para continuar.
      </p>
      <div class="text-sm text-gray-300 text-center mb-8">
        Si ya denegaste el permiso, debes habilitarlo manualmente desde la configuración de tu navegador.<br>
        <span class="font-semibold">¿Cómo hacerlo?</span><br>
        Busca el icono de candado o "Permisos" cerca de la barra de direcciones, haz clic y permite el acceso a la ubicación para este sitio.<br>
        Luego, pulsa "Intentar de nuevo".
      </div>
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
