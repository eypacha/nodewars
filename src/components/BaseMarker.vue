<template>
  <div class="w-10 h-10 bg-black border-2 rounded-full flex items-center justify-center text-lg cursor-pointer"
    :style="{ borderColor, backgroundColor }">
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" class="base-icon"
      aria-hidden="true">
      <path fill="currentColor"
        d="M1 21v-4l2-2V9L1 7V3h2v2h2V3h2v2h2V3h2v4L9 9v1h6V9l-2-2V3h2v2h2V3h2v2h2V3h2v4l-2 2v6l2 2v4h-9v-3q0-.825-.587-1.412T12 16t-1.412.588T10 18v3z" />
    </svg>
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
