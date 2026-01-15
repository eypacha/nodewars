<template>
  <div class="border border-white p-4 flex flex-col h-full">
    <div class="flex justify-between items-start mb-3">
      <div>
        <p class="text-white text-sm font-bold">{{ title }}</p>
        <p v-if="subtitle" class="text-gray-400 text-xs mt-1">{{ subtitle }}</p>
      </div>
      <div v-if="showCost" class="text-right">
        <p class="text-base font-bold" :style="{ color: costColor }">
          {{ cost }} ●
        </p>
      </div>
    </div>

    <div class="mb-4 text-gray-300 text-sm space-y-1 flex-grow">
      <p v-for="desc in descriptionArray" :key="desc">{{ desc }}</p>
    </div>

    <BaseButton
      @click="handleClick"
      :disabled="disabled"
      :label="buttonLabel"
      block
      full-width
      base-class="font-bold py-3 px-4 border-2 border-white text-sm relative overflow-hidden transition-all"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import BaseButton from '@/components/UI/BaseButton.vue';

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
  cost: {
    type: [Number, String],
    default: '—',
  },
  costColor: {
    type: String,
    default: '#cd23e8ff',
  },
  description: {
    type: [String, Array],
    default: '',
  },
  buttonLabel: {
    type: String,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  onClick: {
    type: Function,
    default: () => {},
  },
  showCost: {
    type: Boolean,
    default: true,
  },
});

const descriptionArray = computed(() => {
  return Array.isArray(props.description) ? props.description : [props.description];
});

const handleClick = () => {
  if (!props.disabled) {
    props.onClick();
  }
};
</script>