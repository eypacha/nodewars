<template>
  <div class="pointer-events-auto" :class="wrapperClass">
    <div
      class="relative shadow-2xl border-2"
      :class="[paddingClass, containerClass]"
      :style="containerStyle"
    >
      <slot name="badge" />
      <slot />
      <div 
        v-if="showTail"
        class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8"
        :style="{ borderTopColor: borderColor }"
      ></div>
      <div 
        v-if="showTail"
        class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] mt-[-2px]"
        :style="{ borderTopColor: backgroundColor }"
      ></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  borderColor: {
    type: String,
    default: 'white',
  },
  backgroundColor: {
    type: String,
    default: 'black',
  },
  showTail: {
    type: Boolean,
    default: true,
  },
  paddingClass: {
    type: String,
    default: 'px-4 py-3',
  },
  containerClass: {
    type: String,
    default: 'bg-black',
  },
  wrapperClass: {
    type: String,
    default: '',
  },
});

const containerStyle = computed(() => ({
  borderColor: props.borderColor,
  backgroundColor: props.backgroundColor,
}));
</script>
