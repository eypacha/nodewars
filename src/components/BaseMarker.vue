<template>
  <div 
    class="w-10 h-10 bg-black border-2 rounded-full flex items-center justify-center text-lg cursor-pointer"
    :style="{ borderColor, backgroundColor }"
  >
    <span class="emoji">🏰</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { ENEMY_COLOR, FRIENDLY_BASE_COLOR } from '@/constants/colors';

const props = defineProps({
  isEnemy: {
    type: Boolean,
    default: false,
  },
});

const borderColor = computed(() => (props.isEnemy ? ENEMY_COLOR : FRIENDLY_BASE_COLOR));
const backgroundColor = computed(() => (props.isEnemy ? '#2c0a0a' : '#000'));
</script>
