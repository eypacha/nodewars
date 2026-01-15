<template>
  <div class="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
    <div class="bg-black border-2 border-white p-8 shadow-2xl max-w-md w-full mx-4">
      <h1 class="text-3xl font-bold text-center mb-8">
        {{ $t('gameStart.title') }}
      </h1>
      
      <!-- Botón Continue si hay juego guardado -->
      <BaseButton 
        v-if="hasSavedGame"
        class="mb-4"
        full-width
        block
        base-class="cursor-pointer font-bold py-4 px-6 border-1 text-xl mx-auto block w-full"
        :label="$t('gameStart.continueButton')"
        @click="$emit('continue-game')"
      />
      
      <!-- Botón Start -->
      <BaseButton 
        full-width
        block
        base-class="cursor-pointer font-bold py-4 px-6 border-1 text-xl mx-auto block w-full"
        :label="hasSavedGame ? $t('gameStart.startNewButton') : $t('gameStart.startButton')"
        @click="$emit('start-game')"
      />

      <!-- Advertencia si hay juego previo -->
      <p v-if="hasSavedGame" class="text-sm text-center mt-3 text-gray-300">
        {{ $t('gameStart.overwriteWarning') }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useMapStore } from '@/stores/mapStore';
import BaseButton from '@/components/UI/BaseButton.vue';

defineEmits(['start-game', 'continue-game']);

const mapStore = useMapStore();
const hasSavedGame = computed(() => mapStore.hasSavedGame());
</script>
