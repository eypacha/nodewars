<template>
  <div class="pointer-events-auto mb-2 w-60">
    <div 
      class="bg-black border-2 px-4 py-3 shadow-2xl relative"
      :style="{ borderColor: dialogPOIColor }"
    >
      <span 
          class="absolute -top-6 -right-[2px] inline-block px-2 py-1 text-xs"
          :style="{ backgroundColor: dialogPOIColor, color: 'white' }"
        >
          <span class="emoji">{{ getPOIEmoji(poi.type) }}</span>  
        {{ getPOIDisplayName(poi.type) }}
        </span>
      <div>
        <h3 class="text-white text-sm font-bold mb-2">{{ poi.name }}</h3>
        <p v-if="formattedDistance" class="text-white text-xs mb-2 opacity-75">
          {{ formattedDistance }}<span v-if="!poi.owned && !isInRange" class="text-red-400"> {{ $t('poi.outOfRange') }}</span>
        </p>

        <!-- Resources bar -->
        <div v-if="poi.type !== 'barrack' && poi.owned" class="mb-2">
          <div class="flex justify-between text-white text-xs mb-1">
            <span>{{ $t('poi.resources') }}</span>
            <span>{{ poi.resourceAmount }} / {{ poi.resourceCapacity }}</span>
          </div>
          <div class="w-full bg-gray-700 h-3 overflow-hidden">
            <div 
              class="h-full transition-all duration-300"
              :style="{ width: resourcePercentage + '%', backgroundColor: dialogPOIColor }"
            ></div>
          </div>
        </div>
        
        <!-- Health bar -->
        <div class="mb-2">
          <div class="flex justify-between text-white text-xs mb-1">
            <span>{{ $t('poi.health') }}</span>
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

        <div v-if="poi.type !== 'barrack' && poi.owned" class="mb-2">
          <div class="flex justify-between text-white text-xs mb-1">
            <span>{{ $t('poi.production') }}</span>
            <span>{{ productionLabel }}</span>
          </div>
          <div class="w-full bg-gray-700 h-1 overflow-hidden">
            <div 
              class="h-full bg-white transition-all duration-300"
              :style="{ width: productionProgress + '%' }"
            ></div>
          </div>
        </div>
      </div>
      <button 
        v-if="!poi.owned"
        @click="handleAttack"
        :disabled="isOnCooldown || !isInRange"
        class="font-bold py-2 px-4 border-1 text-sm mx-auto block w-full mt-3 relative overflow-hidden transition-opacity"
        :class="(isOnCooldown || !isInRange) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'"
      >
        <!-- Barra de progreso del cooldown -->
        <div 
          v-if="isOnCooldown"
          class="absolute top-0 left-0 h-1 bg-white"
          :style="{ width: cooldownProgress + '%' }"
        ></div>
        {{ $t('poi.attack') }}
      </button>
      <div v-else>
        <button
          v-if="poi.type !== 'barrack'"
          @click="handleExtract"
          :disabled="isExtractOnCooldown || !poi.resourceAmount"
          class="font-bold py-2 px-4 border-1 text-sm mx-auto block w-full mt-3 relative overflow-hidden"
          :class="(isExtractOnCooldown || !poi.resourceAmount) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'"
        >
          <div
            v-if="isExtractOnCooldown"
            class="absolute top-0 left-0 h-1 bg-white"
            :style="{ width: extractCooldownProgress + '%' }"
          ></div>
          {{ poi.resourceAmount ? $t('poi.extract') : $t('poi.noResources') }}
        </button>
        <button
          v-if="poi.owned"
          @click="handleHeal"
          :disabled="isHealOnCooldown || poi.health >= poi.maxHealth || !canHeal"
          class="font-bold py-2 px-4 border-1 text-sm mx-auto block w-full mt-2 relative overflow-hidden"
          :class="(isHealOnCooldown || poi.health >= poi.maxHealth || !canHeal) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'"
        >
          <div
            v-if="isHealOnCooldown"
            class="absolute top-0 left-0 h-1 bg-white"
            :style="{ width: healCooldownProgress + '%' }"
          ></div>
          {{ $t('poi.heal') }}
        </button>
        <button
          v-if="poi.type !== 'barrack'"
          @click="handleConvertToBarracks"
          class="font-bold py-2 px-4 border-1 text-sm mx-auto block w-full mt-2 relative overflow-hidden"
          :disabled="isConverting"
          :class="isConverting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'"
        >
          <div
            v-if="isConverting"
            class="absolute top-0 left-0 h-1 bg-white"
            :style="{ width: convertingProgress + '%' }"
          ></div>
          {{ isConverting ? $t('poi.converting') : $t('poi.convertToBarracks') }}
        </button>
        <button
          v-if="poi.type === 'barrack' && isActive"
          @click="isScanning ? $emit('stopScan') : handleScan()"
          class="font-bold py-2 px-4 border-1 text-sm mx-auto block w-full mt-3 relative overflow-hidden cursor-pointer"
        >
          {{ isScanning ? $t('poi.stopScan') : $t('poi.scan') }}
        </button>
      </div>
      <div 
        class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8"
        :style="{ borderTopColor: dialogPOIColor }"
      ></div>
      <div class="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-black mt-[-2px]"></div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { calculateDistance } from '@/utils/mapHelpers';
import { getPOIEmoji, getPOIDisplayName } from '@/constants/poiTypes';
import { getRadarConfig } from '@/services/mapService';
import { usePoiStore } from '@/stores/poiStore';

const props = defineProps({
  poi: {
    type: Object,
    required: true,
  },
  basePosition: {
    type: Object,
    default: null,
  },
  selectedBarracksForAttack: {
    type: Object,
    default: null,
  },
  isBaseAttackOrigin: {
    type: Boolean,
    default: false,
  },
  radarRadius: {
    type: Number,
    default: 700,
  },
  allPois: {
    type: Array,
    default: () => [],
  },
  isScanning: {
    type: Boolean,
    default: false,
  },
  canHeal: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close', 'attack', 'extract', 'convertToBarracks', 'scan', 'stopScan', 'selectAsAttackOrigin', 'heal']);
const poiStore = usePoiStore();
const productionProgress = ref(0);
const timeToNextProduction = ref(0);
const atCapacity = ref(false);
let productionInterval = null;
const baseRadarColor = getRadarConfig().color;
const dialogPOIColor = computed(() => {
  if (!props.poi) return baseRadarColor;
  if (props.poi.enemy) return props.poi.color;
  return props.poi.type === 'barrack' ? baseRadarColor : props.poi.color;
});
// Emitir evento para convertir en barrack con barra de progreso
const isConverting = ref(false);
const convertingProgress = ref(0);
const CONVERT_DURATION = 2000;

const handleConvertToBarracks = () => {
  if (isConverting.value) return;
  isConverting.value = true;
  convertingProgress.value = 0;
  const startTime = performance.now();

  const updateConvertProgress = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min((elapsed / CONVERT_DURATION) * 100, 100);
    convertingProgress.value = progress;

    if (progress < 100) {
      requestAnimationFrame(updateConvertProgress);
    } else {
      emit('convertToBarracks');
      isConverting.value = false;
      convertingProgress.value = 0;
    }
  };

  requestAnimationFrame(updateConvertProgress);
};
// Emitir evento para escanear desde cuartel
const handleScan = () => {
  emit('scan');
};

// Verificar si este marcador está activo
const isActive = computed(() => {
  return props.selectedBarracksForAttack && props.selectedBarracksForAttack.id === props.poi.id;
});

const handleSelectAsAttackOrigin = () => {
  emit('selectAsAttackOrigin', props.poi);
};
// Estado del cooldown
const isOnCooldown = ref(false);
const cooldownProgress = ref(0);
const COOLDOWN_DURATION = 2000; // 2 segundos en milisegundos
const isExtractOnCooldown = ref(false);
const extractCooldownProgress = ref(0);
const EXTRACT_COOLDOWN_DURATION = 2000;
const isHealOnCooldown = ref(false);
const healCooldownProgress = ref(0);
const HEAL_COOLDOWN_DURATION = 2000;

// Manejar click en Attack con cooldown
const handleAttack = () => {
  if (isOnCooldown.value) return;
  
  // Emitir evento de ataque
  emit('attack');
  
  // Iniciar cooldown
  isOnCooldown.value = true;
  cooldownProgress.value = 0;
  
  const startTime = performance.now();
  
  const updateCooldown = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min((elapsed / COOLDOWN_DURATION) * 100, 100);
    
    cooldownProgress.value = progress;
    
    if (progress < 100) {
      requestAnimationFrame(updateCooldown);
    } else {
      // Cooldown completado
      isOnCooldown.value = false;
      cooldownProgress.value = 0;
    }
  };
  
  requestAnimationFrame(updateCooldown);
};

const handleExtract = () => {
  if (isExtractOnCooldown.value) return;
  emit('extract');

  isExtractOnCooldown.value = true;
  extractCooldownProgress.value = 0;
  const startTime = performance.now();

  const updateExtractCooldown = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min((elapsed / EXTRACT_COOLDOWN_DURATION) * 100, 100);
    extractCooldownProgress.value = progress;

    if (progress < 100) {
      requestAnimationFrame(updateExtractCooldown);
    } else {
      isExtractOnCooldown.value = false;
      extractCooldownProgress.value = 0;
    }
  };

  requestAnimationFrame(updateExtractCooldown);
};

const handleHeal = () => {
  if (isHealOnCooldown.value) return;
  emit('heal');

  isHealOnCooldown.value = true;
  healCooldownProgress.value = 0;
  const startTime = performance.now();

  const updateHealCooldown = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min((elapsed / HEAL_COOLDOWN_DURATION) * 100, 100);
    healCooldownProgress.value = progress;

    if (progress < 100) {
      requestAnimationFrame(updateHealCooldown);
    } else {
      isHealOnCooldown.value = false;
      healCooldownProgress.value = 0;
    }
  };

  requestAnimationFrame(updateHealCooldown);
};

const updateProductionProgress = () => {
  if (!props.poi || props.poi.type === 'barrack') {
    productionProgress.value = 0;
    timeToNextProduction.value = 0;
    atCapacity.value = false;
    return;
  }

  const updatedPOI = poiStore.applyProductionForPOI(props.poi.id) || props.poi;
  const rate = updatedPOI.productionRate || 0;
  const lastProducedAt = updatedPOI.lastProducedAt || Date.now();

  if (!rate) {
    productionProgress.value = 0;
    timeToNextProduction.value = 0;
    atCapacity.value = false;
    return;
  }

  const now = Date.now();
  const elapsed = now - lastProducedAt;
  const isFull = updatedPOI.resourceAmount >= updatedPOI.resourceCapacity;

  atCapacity.value = isFull;
  productionProgress.value = isFull ? 100 : Math.min((elapsed / rate) * 100, 100);
  timeToNextProduction.value = isFull ? 0 : Math.max(rate - (elapsed % rate), 0);
};

const startProductionInterval = () => {
  stopProductionInterval();
  updateProductionProgress();
  productionInterval = setInterval(updateProductionProgress, 500);
};

const stopProductionInterval = () => {
  if (productionInterval) {
    clearInterval(productionInterval);
    productionInterval = null;
  }
};

// Calcular porcentaje de health
const healthPercentage = computed(() => {
  if (!props.poi || !props.poi.health || !props.poi.maxHealth) return 0;
  return (props.poi.health / props.poi.maxHealth) * 100;
});

const resourcePercentage = computed(() => {
  if (!props.poi || !props.poi.resourceCapacity) return 0;
  return (props.poi.resourceAmount / props.poi.resourceCapacity) * 100;
});

const productionLabel = computed(() => {
  if (!props.poi || props.poi.type === 'barrack') return '';
  if (atCapacity.value) return '';
  const seconds = Math.max(0, Math.ceil(timeToNextProduction.value / 1000));
  return `${seconds}s`;
});

// Color de la barra de health según el porcentaje
const healthBarColor = computed(() => {
  return 'bg-green-500';
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

// Verificar si el POI está en rango de ataque
const isInRange = computed(() => {
  if (!props.poi || props.poi.owned) return true;
  
  const BARRACKS_RADAR_RADIUS = 500; // metros
  
  // Si hay un cuartel seleccionado como punto de ataque, verificar SOLO desde ese cuartel
  if (props.selectedBarracksForAttack) {
    const distanceFromBarrack = calculateDistance(
      [props.selectedBarracksForAttack.lat, props.selectedBarracksForAttack.lng],
      [props.poi.lat, props.poi.lng]
    );
    return distanceFromBarrack <= BARRACKS_RADAR_RADIUS;
  }
  
  // Si la base está seleccionada como punto de ataque, verificar desde la base
  if (props.isBaseAttackOrigin && props.basePosition) {
    const distanceFromBase = calculateDistance(
      [props.basePosition.lat, props.basePosition.lng],
      [props.poi.lat, props.poi.lng]
    );
    return distanceFromBase <= props.radarRadius;
  }
  
  // Si no hay punto de ataque seleccionado, verificar desde el radar principal
  if (props.basePosition) {
    const distanceFromBase = calculateDistance(
      [props.basePosition.lat, props.basePosition.lng],
      [props.poi.lat, props.poi.lng]
    );
    return distanceFromBase <= props.radarRadius;
  }
  
  return false;
});

onMounted(() => {
  startProductionInterval();
});

onBeforeUnmount(() => {
  stopProductionInterval();
});

watch(() => props.poi.id, () => {
  startProductionInterval();
});

watch(() => props.poi.resourceAmount, () => {
  updateProductionProgress();
});
</script>
