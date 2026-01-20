<template>
  <div
    class="poi-marker-core w-5 h-5 bg-black border-2 rounded-full flex items-center justify-center cursor-pointer relative"
    :class="{ 'has-autoextract': autoExtract }"
    :style="{ '--poi-color': color }"
  >
    <span v-if="icon" class="poi-icon" v-html="icon"></span>
    <svg v-else xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" class="poi-icon" aria-hidden="true">
      <path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/>
    </svg>
  </div>
</template>

<script setup>

const props = defineProps({
  color: {
    type: String,
    default: '#ffffff'
  },
  icon: {
    type: String,
    default: ''
  },
  autoExtract: {
    type: Boolean,
    default: false
  }
});
</script>

<style scoped>
.poi-marker-core {
  border-color: var(--poi-color);
}

.poi-marker-core .poi-icon {
  color: var(--poi-color);
}

.poi-marker-core.has-autoextract::after {
  content: '';
  position: absolute;
  inset: -6px;
  border: 2px solid var(--poi-color);
  border-radius: 9999px;
  opacity: 0.85;
  pointer-events: none;
}
</style>
