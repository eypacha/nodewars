<template>
  <div class="pointer-events-auto mb-2 max-w-xs">
    <div class="bg-black border-2 border-white px-4 py-3 shadow-2xl relative">
      <button 
        @click="$emit('scan')"
        class="cursor-pointer font-bold py-2 px-4 border-1 text-sm mx-auto block w-full"
      >
        Scan
      </button>
      <div class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white"></div>
      <div class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-black mt-[-2px]"></div>
    </div>
  </div>
</template>

<script setup>
defineEmits(['scan']);
</script>
