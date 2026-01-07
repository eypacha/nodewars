<template>
  <div class="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
    <div class="bg-black border-2 border-white p-8 shadow-2xl max-w-md w-full mx-4">
      <h1 class="text-3xl font-bold text-center mb-8">
        {{ $t('gameStart.title') }}
      </h1>
      
      <!-- Botón Continue si hay juego guardado -->
      <button 
        v-if="hasSavedGame"
        @click="$emit('continue-game')"
        class="cursor-pointer font-bold py-4 px-6 border-1 text-xl mx-auto block w-full mb-4"
      >
        {{ $t('gameStart.continueButton') }}
      </button>
      
      <!-- Botón Start -->
      <button 
        @click="$emit('start-game')"
        class="cursor-pointer font-bold py-4 px-6 border-1 text-xl mx-auto block w-full"
      >
        {{ $t('gameStart.startButton') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useMapStore } from '@/stores/mapStore';

defineEmits(['start-game', 'continue-game']);

const mapStore = useMapStore();
const hasSavedGame = computed(() => mapStore.hasSavedGame());
</script>
