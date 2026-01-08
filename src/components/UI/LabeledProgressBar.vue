<template>
  <div>
    <div class="flex justify-between text-white text-xs mb-1">
      <span>{{ leftLabel }}</span>
      <span>{{ rightLabel }}</span>
    </div>
    <div class="w-full overflow-hidden" :class="[trackClass, heightClass]">
      <div
        class="h-full transition-all duration-300"
        :style="{ width: normalizedProgress + '%', backgroundColor: barColor }"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  leftLabel: {
    type: String,
    default: '',
  },
  rightLabel: {
    type: String,
    default: '',
  },
  progress: {
    type: Number,
    default: 0,
  },
  barColor: {
    type: String,
    default: 'white',
  },
  trackClass: {
    type: String,
    default: 'bg-gray-700',
  },
  size: {
    type: String,
    default: 'small',
    validator: (value) => ['small', 'large'].includes(value),
  },
});

const normalizedProgress = computed(() => Math.min(Math.max(props.progress, 0), 100));

const heightClass = computed(() => (props.size === 'large' ? 'h-3' : 'h-1'));
</script>
