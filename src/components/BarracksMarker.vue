<template>
  <div 
    class="w-8 h-8 bg-black border-2 rounded-full flex items-center justify-center cursor-pointer leading-none"
    :style="{ borderColor }"
  >
    <span class="emoji">⚔️</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getPOIColor } from '@/constants/poiTypes';

const props = defineProps({
  isEnemy: {
    type: Boolean,
    default: false,
  },
});

const friendlyColor = getPOIColor('barrack');
const enemyColor = '#ff4d4f';

const borderColor = computed(() => (props.isEnemy ? enemyColor : friendlyColor));
</script>
