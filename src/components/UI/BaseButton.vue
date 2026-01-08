<template>
  <button
    :type="type"
    :disabled="disabled"
    :class="computedClass"
    @click="$emit('click', $event)"
  >
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
  fullWidth: {
    type: Boolean,
    default: false,
  },
  block: {
    type: Boolean,
    default: false,
  },
  type: {
    type: String,
    default: 'button',
  },
  baseClass: {
    type: String,
    default: '',
  },
});

defineEmits(['click']);

const defaultBase = 'font-bold py-2 px-4 border-1 text-sm relative overflow-hidden';

const computedClass = computed(() => [
  props.baseClass || defaultBase,
  props.block ? 'block' : '',
  props.fullWidth ? 'w-full' : '',
  props.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
]);
</script>
