<template>
  <div 
    class="w-8 h-8 bg-black border-2 rounded-full flex items-center justify-center cursor-pointer leading-none"
    :style="{ borderColor: color || defaultColor }"
  >
    <span class="emoji">⚔️</span>
  </div>
</template>

<script setup>
import { getPOIColor } from '@/constants/poiTypes';

const props = defineProps({
  color: {
    type: String,
    default: null,
  },
});

const defaultColor = getPOIColor('barrack');
const color = props.color || defaultColor;
</script>
