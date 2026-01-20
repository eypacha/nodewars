<template>
  <div
    class="w-8 h-8 bg-black border-2 rounded-full flex items-center justify-center cursor-pointer"
    :style="{ borderColor, backgroundColor }"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" class="poi-icon" aria-hidden="true" :style="{ color: iconColor }">
      <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  iconColor: {
    type: String,
    default: '#ffffff'
  },
  background: {
    type: String,
    default: '#000000'
  },
  border: {
    type: String,
    default: '#ffffff'
  }
});

const borderColor = computed(() => props.border);
const backgroundColor = computed(() => props.background);
</script>
