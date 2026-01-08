<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="[baseClass, disabled ? disabledClass : enabledClass]"
    @click="$emit('click')"
  >
    <div
      v-if="showProgress"
      class="absolute top-0 left-0"
      :class="progressHeightClass"
      :style="{ width: `${normalizedProgress}%`, backgroundColor: progressColor }"
    ></div>
    <slot>{{ label }}</slot>
  </button>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  showProgress: {
    type: Boolean,
    default: false,
  },
  progress: {
    type: Number,
    default: 0,
  },
  progressColor: {
    type: String,
    default: 'white',
  },
  progressHeight: {
    type: String,
    default: 'h-1',
  },
  baseClass: {
    type: String,
    default: 'font-bold py-2 px-4 border-1 text-sm mx-auto block w-full relative overflow-hidden',
  },
  disabledClass: {
    type: String,
    default: 'opacity-50 cursor-not-allowed',
  },
  enabledClass: {
    type: String,
    default: 'cursor-pointer',
  },
  type: {
    type: String,
    default: 'button',
  },
});

defineEmits(['click']);

const normalizedProgress = computed(() => Math.min(Math.max(props.progress, 0), 100));
const progressHeightClass = computed(() => props.progressHeight || 'h-1');
</script>
