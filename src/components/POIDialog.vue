<template>
  <div class="pointer-events-auto mb-2 max-w-xs">
    <div class="bg-black border-2 border-white px-4 py-3 shadow-2xl relative">
      <div>
        <h3 class="text-white text-sm font-bold mb-2">{{ poi.name }}</h3>
        <p v-if="formattedDistance" class="text-white text-xs mb-2 opacity-75">
          {{ formattedDistance }}
        </p>
        
        <!-- Health bar -->
        <div class="mb-2">
          <div class="flex justify-between text-white text-xs mb-1">
            <span>Health</span>
            <span>{{ poi.health }} / {{ poi.maxHealth }}</span>
          </div>
          <div class="w-full bg-gray-700 h-1 overflow-hidden">
            <div 
              class="h-full transition-all duration-300"
              :class="healthBarColor"
              :style="{ width: healthPercentage + '%' }"
            ></div>
          </div>
        </div>
        
        <span 
          class="inline-block px-2 py-1 text-xs rounded hidden"
          :style="{ backgroundColor: poi.color, color: 'white' }"
        >
          {{ poi.type }}
        </span>
      </div>
      <button 
        @click="$emit('attack')"
        class="cursor-pointer font-bold py-2 px-4 border-1 text-sm mx-auto block w-full mt-3"
      >
        Attack
      </button>
      <div class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white"></div>
      <div class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-black mt-[-2px]"></div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { calculateDistance } from '@/utils/mapHelpers';

const props = defineProps({
  poi: {
    type: Object,
    required: true,
  },
  basePosition: {
    type: Object,
    default: null,
  },
});

defineEmits(['close', 'attack']);

// Calcular porcentaje de health
const healthPercentage = computed(() => {
  if (!props.poi || !props.poi.health || !props.poi.maxHealth) return 0;
  return (props.poi.health / props.poi.maxHealth) * 100;
});

// Color de la barra de health según el porcentaje
const healthBarColor = computed(() => {
  const percentage = healthPercentage.value;
  if (percentage > 60) return 'bg-green-500';
  if (percentage > 30) return 'bg-yellow-500';
  return 'bg-red-500';
});

// Calcular y formatear la distancia
const formattedDistance = computed(() => {
  if (!props.basePosition || !props.poi) return null;
  
  const distanceInMeters = calculateDistance(
    [props.basePosition.lat, props.basePosition.lng],
    [props.poi.lat, props.poi.lng]
  );
  
  // Si la distancia es menor a 1000m, mostrar en metros
  // Si es mayor o igual a 1000m, mostrar en kilómetros
  if (distanceInMeters < 1000) {
    return `${Math.round(distanceInMeters)} m`;
  } else {
    const distanceInKm = distanceInMeters / 1000;
    return `${distanceInKm.toFixed(1)} km`;
  }
});
</script>
