<template>
  <DialogShell :border-color="dialogPOIColor" class="mb-2 w-60">
    <template #badge>
      <span 
          class="absolute -top-6 -right-[2px] inline-block px-2 py-1 text-xs"
          :style="{ backgroundColor: dialogPOIColor, color: 'white' }"
        >
          <span class="emoji">{{ getPOIEmoji(poi.type) }}</span>  
        {{ getPOIDisplayName(poi.type) }}
        </span>
    </template>
      <div>
        <h3 class="text-white text-sm font-bold mb-2">{{ poi.name }}</h3>
        <p v-if="formattedDistance" class="text-white text-xs mb-2 opacity-75">
          {{ formattedDistance }}<span v-if="!poi.owned && !isInRange" class="text-red-400"> {{ $t('poi.outOfRange') }}</span>
        </p>

        <!-- Resources bar -->
        <LabeledProgressBar
          v-if="poi.type !== 'barrack' && poi.owned"
          class="mb-2"
          :left-label="$t('poi.resources')"
          :right-label="`${poi.resourceAmount} / ${poi.resourceCapacity}`"
          :progress="resourcePercentage"
          :bar-color="dialogPOIColor"
          size="large"
        />
        
        <!-- Health bar (todos los POIs con vida) -->
        <LabeledProgressBar
          v-if="!poi.owned || poi.type == 'barrack'"
          class="mb-2"
          :left-label="$t('poi.health')"
          :right-label="`${poi.health} / ${poi.maxHealth}`"
          :progress="healthPercentage"
          :bar-color="healthBarColor"
        />

        <div v-if="poi.type !== 'barrack' && poi.owned" class="mb-2">
          <LabeledProgressBar
            :left-label="$t('poi.production')"
            :right-label="productionLabel"
            :progress="productionProgress"
            bar-color="white"
          />
        </div>
      </div>
      <ProgressButton
        v-if="!poi.owned"
        class="mt-3 transition-opacity"
        :label="$t('poi.attack')"
        :disabled="isOnCooldown || !isInRange"
        :show-progress="isOnCooldown"
        :progress="cooldownProgress"
        @click="handleAttack"
      />
      <div v-else>
        <ProgressButton
          v-if="poi.type !== 'barrack' && !isBlockedByEnemyBarrack"
          class="mt-3"
          :label="poi.resourceAmount ? $t('poi.extract') : $t('poi.noResources')"
          :disabled="isExtractOnCooldown || !poi.resourceAmount"
          :show-progress="isExtractOnCooldown"
          :progress="extractCooldownProgress"
          @click="handleExtract"
        />
        <BaseButton
          v-if="poi.type !== 'barrack' && !isBlockedByEnemyBarrack"
          class="mx-auto mt-2"
          block
          full-width
          :label="poi.autoExtract ? $t('poi.autoExtractEnabled') : $t('poi.autoExtract')"
          @click="handleToggleAutoExtract"
        />
        <ProgressButton
          v-if="poi.type === 'barrack' && poi.owned && !isBlockedByEnemyBarrack"
          class="mt-2"
          :label="$t('poi.heal')"
          :disabled="isHealOnCooldown || poi.health >= poi.maxHealth || !canHeal"
          :show-progress="isHealOnCooldown"
          :progress="healCooldownProgress"
          @click="handleHeal"
        />
        <ProgressButton
          v-if="poi.type !== 'barrack' && !isBlockedByEnemyBarrack"
          class="mt-2"
          :label="isConverting ? $t('poi.converting') : $t('poi.convertToBarracks')"
          :disabled="isConverting"
          :show-progress="isConverting"
          :progress="convertingProgress"
          @click="handleConvertToBarracks"
        />
        <BaseButton
          v-if="poi.type === 'barrack' && isActive"
          class="mx-auto mt-3"
          block
          full-width
          :label="isScanning ? $t('poi.stopScan') : $t('poi.scan')"
          @click="isScanning ? $emit('stopScan') : handleScan()"
        />
      </div>
  </DialogShell>
</template>

<script setup>
import { computed, ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { calculateDistance } from '@/utils/mapHelpers';
import { BARRACKS_RADAR_RADIUS } from '@/constants/player';
import { getPOIEmoji, getPOIDisplayName } from '@/constants/poiTypes';
import { getRadarConfig } from '@/services/mapService';
import { usePoiStore } from '@/stores/poiStore';
import LabeledProgressBar from '@/components/UI/LabeledProgressBar.vue';
import ProgressButton from '@/components/UI/ProgressButton.vue';
import DialogShell from '@/components/UI/DialogShell.vue';
import BaseButton from '@/components/UI/BaseButton.vue';
import { useProgressTimer } from '@/composables/useProgressTimer';

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

const emit = defineEmits(['close', 'attack', 'extract', 'autoextract', 'convertToBarracks', 'scan', 'stopScan', 'selectAsAttackOrigin', 'heal']);
const poiStore = usePoiStore();
const productionProgress = ref(0);
const timeToNextProduction = ref(0);
const atCapacity = ref(false);
const autoExtractRequested = ref(false);
let productionInterval = null;
const baseRadarColor = getRadarConfig().color;
const dialogPOIColor = computed(() => {
  if (!props.poi) return baseRadarColor;
  return props.poi.type === 'barrack' ? baseRadarColor : props.poi.color;
});
const CONVERT_DURATION = 2000;
const convertCooldown = useProgressTimer(CONVERT_DURATION, {
  onComplete: () => emit('convertToBarracks'),
  key: `poi-${props.poi.id}-convert`,
});
const isConverting = convertCooldown.isRunning;
const convertingProgress = convertCooldown.progress;

const handleConvertToBarracks = () => {
  if (convertCooldown.isRunning.value) return;
  convertCooldown.start();
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
const COOLDOWN_DURATION = 2000; // 2 segundos en milisegundos
const EXTRACT_COOLDOWN_DURATION = 2000;
const HEAL_COOLDOWN_DURATION = 2000;

const attackCooldown = useProgressTimer(COOLDOWN_DURATION, { key: `poi-${props.poi.id}-attack` });
const extractCooldown = useProgressTimer(EXTRACT_COOLDOWN_DURATION, { key: `poi-${props.poi.id}-extract` });
const healCooldown = useProgressTimer(HEAL_COOLDOWN_DURATION, { key: `poi-${props.poi.id}-heal` });
const isOnCooldown = attackCooldown.isRunning;
const cooldownProgress = attackCooldown.progress;
const isExtractOnCooldown = extractCooldown.isRunning;
const extractCooldownProgress = extractCooldown.progress;
const isHealOnCooldown = healCooldown.isRunning;
const healCooldownProgress = healCooldown.progress;

// Manejar click en Attack con cooldown
const handleAttack = () => {
  if (attackCooldown.isRunning.value) return;
  emit('attack');
  attackCooldown.start();
};

const handleExtract = () => {
  if (extractCooldown.isRunning.value) return;
  emit('extract');
  extractCooldown.start();
};

const handleHeal = () => {
  if (healCooldown.isRunning.value) return;
  emit('heal');
  healCooldown.start();
};

const handleToggleAutoExtract = () => {
  if (!props.poi || props.poi.type === 'barrack') return;
  poiStore.setAutoExtract(props.poi.id, !props.poi.autoExtract);
};

const updateProductionProgress = () => {
  if (!props.poi || props.poi.type === 'barrack') {
    productionProgress.value = 0;
    timeToNextProduction.value = 0;
    atCapacity.value = false;
    autoExtractRequested.value = false;
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
  productionProgress.value = isFull ? 0 : Math.min((elapsed / rate) * 100, 100);
  timeToNextProduction.value = isFull ? 0 : Math.max(rate - (elapsed % rate), 0);

  if (
    isFull &&
    updatedPOI.autoExtract &&
    updatedPOI.owned &&
    !isBlockedByEnemyBarrack.value &&
    !autoExtractRequested.value
  ) {
    autoExtractRequested.value = true;
    emit('autoextract');
  }
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

const isBlockedByEnemyBarrack = computed(() => {
  if (!props.poi || !Array.isArray(props.allPois)) return false;
  let current = props.poi;
  while (current?.conqueredFrom) {
    const barrack = props.allPois.find((p) => p.id === current.conqueredFrom);
    if (!barrack) break;
    if (barrack.type === 'barrack' && !barrack.owned) return true;
    current = barrack;
  }
  return false;
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
  return '#22c55e';
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
  if (!props.poi || props.poi.resourceAmount < props.poi.resourceCapacity) {
    autoExtractRequested.value = false;
  }
});
</script>
