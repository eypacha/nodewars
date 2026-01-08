<template>
  <div class="pointer-events-auto">
    <div
      class="relative shadow-2xl border-2 px-4 py-3 bg-[rgba(0,0,0,0.8)]"
      :style="{ borderColor: props.borderColor }"
    >
      <slot name="badge" />
      <slot />
      <div 
        v-if="showTail"
        class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8"
        :style="{ borderTopColor: props.borderColor }"
      ></div>
      <div 
        v-if="showTail"
        class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] mt-[-2px] border-t-[rgba(0,0,0,0.8)]"
      ></div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  borderColor: {
    type: String,
    default: 'white',
  },
  showTail: {
    type: Boolean,
    default: true,
  },
});
</script>
