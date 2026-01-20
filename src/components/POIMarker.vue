<template>
  <div
    class="w-6 h-6 bg-black border-2 rounded-full flex items-center justify-center cursor-pointer"
    :style="{ borderColor }"
  >
    <span v-if="icon" class="poi-icon" v-html="icon" :style="{ color }"></span>
    <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" class="poi-icon" aria-hidden="true" :style="{ color }">
      <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  color: {
    type: String,
    default: '#ffffff'
  },
  icon: {
    type: String,
    default: ''
  }
});

const borderColor = computed(() => props.color);
</script>
