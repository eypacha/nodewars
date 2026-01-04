<template>
  <div class="w-screen h-screen overflow-hidden bg-map text-white">
    <MapComponent />
    <GamePopup v-if="showPopup" @start-game="startGame" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import MapComponent from '../components/MapComponent.vue';
import GamePopup from '../components/GamePopup.vue';

const showPopup = ref(true);

const startGame = () => {
  showPopup.value = false;
};
</script>