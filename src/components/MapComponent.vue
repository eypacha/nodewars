<template>
  <div class="w-full h-[100vh] overflow-hidden relative">
    <div id="map" class="w-full h-[calc(100vh+30px)] z-0"></div>
    <MarkerConfirmDialog 
      v-if="activeDialog === 'markerConfirm' && markerScreenPosition" 
      :style="dialogStyle"
      @confirm="handleConfirmMarker" 
    />
    <BaseMarkerDialog
      v-if="activeDialog === 'baseMarker' && markerScreenPosition && baseConfirmed"
      :style="dialogStyle"
      :is-scanning="isBaseScanActive"
      :base-health="baseHealth"
      :base-max-health="baseMaxHealth"
      :is-heal-on-cooldown="isBaseHealOnCooldown"
      :heal-progress="baseHealProgress"
      :can-heal="resources.pharmacy > 0 && baseHealth < baseMaxHealth"
      @scan="handleScan"
      @stopScan="handleStopScan"
      @upgrades="handleOpenUpgrades"
      @heal="handleBaseHeal"
    />
    <POIDialog
      v-if="showPOIDialog && selectedPOI && poiScreenPosition"
      :style="poiDialogStyle"
      :poi="selectedPOI"
      :base-position="baseMarkerPosition"
      :selected-barracks-for-attack="selectedBarracksForAttack"
      :is-base-attack-origin="isBaseAttackOrigin"
      :radar-radius="radarRadius"
      :all-pois="pois"
      :is-scanning="isSelectedBarrackScanActive"
      :can-heal="resources.pharmacy > 0"
      @close="handleClosePOIDialog"
      @attack="handleAttack"
      @extract="handleExtract"
      @heal="handleHeal"
      @convertToBarracks="handleConvertToBarracks"
      @scan="handleScanFromBarracks"
      @stopScan="handleStopScan"
    />
    <UpgradesPanel
      v-if="showUpgradesPanel"
      @close="mapStore.closeUpgradesPanel"
    />
    <div 
      v-for="sweep in radarSweepStyles"
      :key="sweep.id"
      class="radar-sweep"
      :style="sweep.style"
    >
      <div class="sweep-line"></div>
    </div>
    <div 
      v-for="triangle in attackTriangles" 
      :key="triangle.id"
      class="attack-triangle"
      :style="{
        position: 'absolute',
        left: `${triangle.x}px`,
        top: `${triangle.y}px`,
        transform: `translate(-50%, -50%) rotate(${triangle.rotation}deg)`,
        zIndex: 800,
      }"
    >
      ▲
    </div>
    <template v-if="!showStartPopup && baseConfirmed">
      <div 
        v-for="enemy in enemyMarkers" 
        :key="enemy.id"
        class="enemy-triangle cursor-pointer"
        :style="{
          position: 'absolute',
          left: `${enemy.x}px`,
          top: `${enemy.y}px`,
          transform: `translate(-50%, -50%) rotate(${enemy.rotation}deg)`,
          zIndex: 800,
        }"
        @click.stop="handleEnemyClick(enemy.id)"
      >
        ▲
      </div>
      <EnemyAttackDialog
        v-if="selectedEnemyForAttack && enemyDialogStyle"
        :style="enemyDialogStyle"
        :is-on-cooldown="isEnemyAttackOnCooldown"
        :cooldown-progress="enemyAttackCooldownProgress"
        @attack="handleEnemyAttack"
      />
    </template>
    <div 
      v-for="particle in resourceParticles" 
      :key="particle.id"
      class="resource-particle"
      :style="{
        position: 'absolute',
        left: `${particle.x}px`,
        top: `${particle.y}px`,
        transform: 'translate(-50%, -50%)',
        backgroundColor: particle.resourceColor,
        zIndex: 998,
      }"
    ></div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, watch, nextTick, computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
import L from 'leaflet';
import { useMapStore } from '@/stores/mapStore';
import { usePoiStore } from '@/stores/poiStore';
import { useGameStore } from '@/stores/gameStore';
import { useLeafletMap } from '@/composables/useLeafletMap';
import { useMapMarker } from '@/composables/useMapMarker';
import { useAttackRadar } from '@/composables/useAttackRadar';
import { usePointsOfInterest } from '@/composables/usePointsOfInterest';
import { useAttackAnimation } from '@/composables/useAttackAnimation';
import { useResourceCollection } from '@/composables/useResourceCollection';
import { useConnectionLines } from '@/composables/useConnectionLines';
import { useScreenPositions } from '@/composables/useScreenPositions';
import { useMapDialogs } from '@/composables/useMapDialogs';
import { getRadarConfig } from '@/services/mapService';
import { getPOIColor } from '@/constants/poiTypes';
import { useEnemyStore } from '@/stores/enemyStore';
import BaseMarker from './BaseMarker.vue';
import MarkerConfirmDialog from './MarkerConfirmDialog.vue';
import BaseMarkerDialog from './BaseMarkerDialog.vue';
import POIDialog from './POIDialog.vue';
import EnemyAttackDialog from './EnemyAttackDialog.vue';
import UpgradesPanel from './UpgradesPanel.vue';
import { useEnemySpawn } from '@/composables/useEnemySpawn';
import { useEnemyMovement } from '@/composables/useEnemyMovement';
import { useProgressTimer } from '@/composables/useProgressTimer';
import { computeRadarsMetrics } from '@/utils/mathUtils';

const mapStore = useMapStore();
const enemyStore = useEnemyStore();
enemyStore.initialize();

// Bandera global para evitar bucles watcher <-> eventos Leaflet
let isProgrammaticMapMove = false;
const poiStore = usePoiStore();
const gameStore = useGameStore();
const { center, zoom, marker, activeDialog, baseConfirmed, showUpgradesPanel } = storeToRefs(mapStore);
const { radarLevel, resources, baseHealth, baseMaxHealth, showStartPopup } = storeToRefs(gameStore);
const { selectedPOI, showPOIDialog, isLoading, pois } = storeToRefs(poiStore);
const { enemies } = storeToRefs(enemyStore);
const selectedBarracksForAttack = ref(null); // Cuartel seleccionado para lanzar ataques
const isBaseAttackOrigin = ref(false); // Si la base está seleccionada como punto de ataque
const currentAttackOrigin = ref(null); // Punto de ataque activo (se actualiza cuando cambia)
const attackOriginScreenPosition = ref(null); // Posición en pantalla del punto de ataque
const scanContexts = ref(new Map()); // key -> { id, type, position, radius }
const scanAnimationTimeouts = ref(new Map());
const activeScanContexts = computed(() => Array.from(scanContexts.value.values()));
const isBaseScanActive = computed(() => scanContexts.value.has('base'));
const isSelectedBarrackScanActive = computed(() => {
  if (!selectedPOI.value || selectedPOI.value.type !== 'barrack') return false;
  return scanContexts.value.has(`barrack-${selectedPOI.value.id}`);
});

// Inicializar composables principales
// Usar refs reactivos para que el mapa se inicialice con los valores restaurados
const { mapRef, initMap, flyTo, on } = useLeafletMap('map', center.value, zoom.value);
const { markerRef, createMarker, disableDragging, removeMarker, on: onMarker } = useMapMarker(mapRef);
const { radarRef, createRadar, renderAllBarracksRadars, updatePosition: updateRadarPosition, updateRadius, removeRadar, hasActiveRadar, getRadarData } = useAttackRadar(mapRef);
const { clearPOIMarkers } = usePointsOfInterest(mapRef);

// Composables para funcionalidades específicas
const { resourceParticles, startResourceCollection, startHealingDelivery } = useResourceCollection(mapRef, markerRef);
const { attackTriangles, startAttack } = useAttackAnimation(mapRef, markerRef);
const { 
  createConnectionLine, 
  removeConnectionLine, 
  updateConnectionLine,
  createOwnedConnectionLines,
  updateOwnedConnectionLines,
  removeOwnedConnectionLines 
} = useConnectionLines(mapRef, markerRef);
const { 
  markerScreenPosition, 
  poiScreenPosition, 
  updateMarkerScreenPosition, 
  updatePOIScreenPosition,
  dialogStyle,
  poiDialogStyle 
} = useScreenPositions(mapRef, markerRef);
const { closePOIDialog: closeDialog, handleMapClick } = useMapDialogs();
const closeAllDialogs = () => {
  closeDialog(removeConnectionLine);
  selectedEnemyForAttack.value = null;
  enemyDialogStyle.value = null;
  mapStore.closeAllDialogs();
};
const closeDialogsKeepAttack = () => {
  closeDialog(removeConnectionLine);
  selectedEnemyForAttack.value = null;
  enemyDialogStyle.value = null;
  mapStore.closeAllDialogs();
};

// Posición del marcador base para calcular distancia
const baseMarkerPosition = computed(() => {
  if (!markerRef.value) return null;
  const latLng = markerRef.value.getLatLng();
  return { lat: latLng.lat, lng: latLng.lng };
});

const enemySpawner = useEnemySpawn({ baseMarkerPosition, pois, radarLevel });
const enemyMover = useEnemyMovement({
  getTargetPosition: (type, id) => {
    if (type === 'base') {
      return baseMarkerPosition.value;
    }
    if (type === 'barrack') {
      const target = (pois.value || []).find((p) => String(p.id) === String(id) && p.owned);
      if (target) return { lat: target.lat, lng: target.lng };
    }
    return null;
  },
  onBaseHit: () => {
    gameStore.setBaseHealth(baseHealth.value - 1);
  },
  onBarrackHit: (poiId) => {
    poiStore.damagePOI(poiId, 1, null, { attackedByEnemy: true });
  },
});
const baseHealCooldown = useProgressTimer(2000, { key: 'base-heal' });
const isBaseHealOnCooldown = baseHealCooldown.isRunning;
const baseHealProgress = baseHealCooldown.progress;
const handleBaseHeal = () => {
  if (isBaseHealOnCooldown.value) return;
  const healed = gameStore.consumeResource('pharmacy', 1);
  if (!healed) return;
  gameStore.setBaseHealth(baseHealth.value + 1);
  baseHealCooldown.start();
};

const selectedEnemyForAttack = ref(null);
const enemyDialogStyle = ref(null);
const ENEMY_ATTACK_COOLDOWN = 2000;
const enemyAttackCooldown = useProgressTimer(ENEMY_ATTACK_COOLDOWN, { key: 'enemy-attack' });
const isEnemyAttackOnCooldown = enemyAttackCooldown.isRunning;
const enemyAttackCooldownProgress = enemyAttackCooldown.progress;

const closeEnemyDialog = () => {
  selectedEnemyForAttack.value = null;
  enemyDialogStyle.value = null;
};

const updateEnemyDialogPosition = (enemy) => {
  if (!mapRef.value || !enemy) return;
  const point = mapRef.value.latLngToContainerPoint([enemy.lat, enemy.lng]);
  enemyDialogStyle.value = {
    position: 'absolute',
    left: `${point.x}px`,
    top: `${point.y}px`,
    transform: 'translate(-50%, -100%)',
    zIndex: 1500,
  };
};

const handleEnemyClick = (enemyId) => {
  const enemy = enemies.value.find((e) => e.id === enemyId);
  if (!enemy) return;
  closeDialogsKeepAttack();
  selectedEnemyForAttack.value = enemy;
  updateEnemyDialogPosition(enemy);
};

const handleEnemyAttack = () => {
  if (!selectedEnemyForAttack.value || enemyAttackCooldown.isRunning.value) return;
  const enemyId = selectedEnemyForAttack.value.id;
  const origin = currentAttackOrigin.value || null;
  startAttack({ lat: selectedEnemyForAttack.value.lat, lng: selectedEnemyForAttack.value.lng }, origin, {
    onHit: () => enemyStore.removeEnemy(enemyId),
    trackTarget: () => {
      const liveEnemy = enemies.value.find((e) => e.id === enemyId);
      if (!liveEnemy) return null;
      return { lat: liveEnemy.lat, lng: liveEnemy.lng };
    },
    interceptDistanceMeters: 5,
  });
  enemyAttackCooldown.start();
  closeEnemyDialog();
};

watch(enemies, (list) => {
  if (!selectedEnemyForAttack.value) return;
  const stillAlive = list.find((e) => e.id === selectedEnemyForAttack.value.id);
  if (!stillAlive) {
    closeEnemyDialog();
  } else {
    updateEnemyDialogPosition(stillAlive);
  }
});

// Radio actual del radar según el tipo de centro de ataque
const radarRadius = computed(() => {
  const radarData = getRadarData();
  if (!radarData) return 0;
  return radarData.radius;
});

const BARRACKS_RADAR_RADIUS = 500;

const getCoverageRadars = () => {
  const list = [];

  if (baseConfirmed.value && baseMarkerPosition.value) {
    const baseConfig = getRadarConfig(radarLevel.value);
    list.push({
      id: 'base',
      center: baseMarkerPosition.value,
      radius: baseConfig.radius,
    });
  }

  (pois.value || []).forEach((poi) => {
    if (poi.type !== 'barrack' || !poi.owned) return;
    list.push({
      id: `barrack-${poi.id}`,
      center: { lat: poi.lat, lng: poi.lng },
      radius: BARRACKS_RADAR_RADIUS,
    });
  });

  return list;
};

const getOwnedBarracksSignature = () => {
  if (!Array.isArray(pois.value)) return [];
  return pois.value
    .filter((poi) => poi.type === 'barrack' && poi.owned)
    .map((poi) => `${poi.id}:${poi.lat}:${poi.lng}`)
    .sort();
};

const updateCoverageMetrics = () => {
  const radars = getCoverageRadars();
  const { perimeterMeters, areaSquareMeters } = computeRadarsMetrics(radars);
  mapStore.setCoverageMetrics(perimeterMeters, areaSquareMeters);
};

// Función para actualizar la posición en pantalla del punto de ataque
const updateAttackOriginScreenPosition = () => {
  if (!mapRef.value || !currentAttackOrigin.value) {
    attackOriginScreenPosition.value = null;
    return;
  }
  
  const point = mapRef.value.latLngToContainerPoint([
    currentAttackOrigin.value.lat, 
    currentAttackOrigin.value.lng
  ]);
  
  attackOriginScreenPosition.value = {
    x: point.x,
    y: point.y
  };
};

const mapViewVersion = ref(0);

const radarSweepStyles = computed(() => {
  // Dependencia para recalcular en cada movimiento/zoom
  mapViewVersion.value;
  if (!mapRef.value) return [];

  const earthRadius = 6371000;

  return activeScanContexts.value.map((ctx) => {
    const originLatLng = ctx.position;
    if (!originLatLng || !ctx.radius) return null;

    const screenPosition = mapRef.value.latLngToContainerPoint([
      originLatLng.lat,
      originLatLng.lng,
    ]);

    const latOffset = (ctx.radius / earthRadius) * (180 / Math.PI);
    const pointAtRadius = L.latLng(
      originLatLng.lat + latOffset,
      originLatLng.lng
    );
    const edgePoint = mapRef.value.latLngToContainerPoint(pointAtRadius);
    const centerPoint = mapRef.value.latLngToContainerPoint([
      originLatLng.lat,
      originLatLng.lng
    ]);
    const radiusInPixels = Math.abs(edgePoint.y - centerPoint.y);

    return {
      id: ctx.id,
      style: {
        position: 'absolute',
        left: `${screenPosition.x}px`,
        top: `${screenPosition.y}px`,
        zIndex: 999,
        '--radar-radius': `${radiusInPixels}px`,
      }
    };
  }).filter(Boolean);
});

const enemyMarkers = computed(() => {
  mapViewVersion.value;
  if (!mapRef.value || showStartPopup.value || !baseConfirmed.value) return [];

  return enemies.value.map((enemy) => {
    const point = mapRef.value.latLngToContainerPoint([enemy.lat, enemy.lng]);
    return {
      id: enemy.id,
      x: point.x,
      y: point.y,
      rotation: enemy.heading ?? 0,
    };
  });
});

// Manejar confirmación del marcador
const handleConfirmMarker = () => {
  mapStore.confirmBase();
  disableDragging();
};

// Manejar ataque al POI
const handleAttack = () => {
  // Determinar el origen del ataque
  let attackOrigin = null;
  if (isBaseAttackOrigin.value && markerRef.value) {
    const latLng = markerRef.value.getLatLng();
    attackOrigin = { lat: latLng.lat, lng: latLng.lng };
  } else if (selectedBarracksForAttack.value) {
    attackOrigin = selectedBarracksForAttack.value;
  }
  startAttack(selectedPOI.value, attackOrigin);
  closeEnemyDialog();
};

const getScanKey = (type, id = 'base') => {
  return type === 'barrack' ? `barrack-${id}` : 'base';
};

const addScanContext = (key, context) => {
  const mapCopy = new Map(scanContexts.value);
  mapCopy.set(key, { ...context, id: key });
  scanContexts.value = mapCopy;
};

const removeScanContext = (key) => {
  if (!scanContexts.value.has(key)) return;
  const mapCopy = new Map(scanContexts.value);
  mapCopy.delete(key);
  scanContexts.value = mapCopy;
};

const stopScanForKey = (key) => {
  poiStore.stopScan(key);
  const timeout = scanAnimationTimeouts.value.get(key);
  if (timeout) {
    clearTimeout(timeout);
  }
  const newTimeouts = new Map(scanAnimationTimeouts.value);
  newTimeouts.delete(key);
  scanAnimationTimeouts.value = newTimeouts;
  removeScanContext(key);
};

const runScan = async ({ type, position, radius, closeDialogs = true, originId = null }) => {
  const key = getScanKey(type, originId || 'base');

  // Opcionalmente cerrar diálogos
  if (closeDialogs) {
    closeDialog(removeConnectionLine);
    mapStore.closeAllDialogs();
  }

  // Registrar contexto de animación
  addScanContext(key, { type, position, radius });
  console.log(`[scan] start ${key}`, position, radius);

  try {
    const result = await poiStore.fetchPOIs(position, radius, { stagger: true, staggerDelay: 250, originKey: key });

    if (result?.status === 'ok' || result?.status === 'stopped') {
      const timeoutId = setTimeout(() => {
        removeScanContext(key);
        const newTimeouts = new Map(scanAnimationTimeouts.value);
        newTimeouts.delete(key);
        scanAnimationTimeouts.value = newTimeouts;
      }, 300);
      const newTimeouts = new Map(scanAnimationTimeouts.value);
      newTimeouts.set(key, timeoutId);
      scanAnimationTimeouts.value = newTimeouts;
    }
  } catch (err) {
    console.error(`[scan] error ${key}`, err);
  }
};

// Manejar extracción manual de recursos
const handleExtract = () => {
  if (!selectedPOI.value || !selectedPOI.value.owned) return;
  const consumed = poiStore.consumeResource(selectedPOI.value.id);
  if (!consumed) return;
  const resourceType = selectedPOI.value.category || selectedPOI.value.type;
  const resourceColor = getPOIColor(resourceType);
  startResourceCollection(selectedPOI.value, resourceType, resourceColor, pois.value);
};

const handleHeal = () => {
  if (!selectedPOI.value || !selectedPOI.value.owned) return;
  const target = selectedPOI.value;
  if (target.health >= target.maxHealth) return;

  const resourceType = 'pharmacy';
  const hasMed = gameStore.consumeResource(resourceType);
  if (!hasMed) {
    console.log('⚠️ No hay recursos médicos disponibles en la base');
    return;
  }

  const healAmount = 1;
  const resourceColor = getPOIColor(resourceType);
  startHealingDelivery(target, resourceColor, pois.value, () => {
    poiStore.healPOI(target.id, healAmount);
  });
};

// Manejar conversión a barrack
const handleConvertToBarracks = () => {
  if (!selectedPOI.value) return;
  poiStore.convertToBarracks(selectedPOI.value.id);
  // Seleccionar la barraca como punto de ataque para mostrar el botón de scan
  handleSelectAsAttackOrigin(selectedPOI.value);
};

const getBaseAttackOrigin = () => {
  if (!markerRef.value) return null;
  const latLng = markerRef.value.getLatLng();
  return {
    lat: latLng.lat,
    lng: latLng.lng,
    type: 'base',
    level: gameStore.radarLevel,
  };
};

const getOwnedBarracks = () => (pois.value || []).filter((p) => p.type === 'barrack' && p.owned);
const getBarracksForRadar = () =>
  (pois.value || [])
    .filter((p) => p.type === 'barrack')
    .map((p) => ({ ...p, isEnemy: !p.owned }));

const setActiveAttackOrigin = (origin) => {
  if (!origin) return;

  const barracksForRadar = getBarracksForRadar();
  const baseCenter = baseMarkerPosition.value
    ? { lat: baseMarkerPosition.value.lat, lng: baseMarkerPosition.value.lng, type: 'base', level: radarLevel.value }
    : null;

  if (origin.type === 'barrack') {
    isBaseAttackOrigin.value = false;
    selectedBarracksForAttack.value = origin;
    createRadar({ lat: origin.lat, lng: origin.lng, type: 'barrack' });
    renderAllBarracksRadars(barracksForRadar, origin.id, baseCenter);
  } else if (origin.type === 'base') {
    selectedBarracksForAttack.value = null;
    isBaseAttackOrigin.value = true;
    createRadar(origin);
    renderAllBarracksRadars(barracksForRadar, 'base', baseCenter);
  }
};

// Manejar selección de cuartel como punto de ataque
const handleSelectAsAttackOrigin = (barracks) => {
  if (barracks && barracks.type === 'barrack' && barracks.owned) {
    // Toggle: si ya está seleccionado, volver a la base; si no, seleccionar cuartel
    if (selectedBarracksForAttack.value && selectedBarracksForAttack.value.id === barracks.id) {
      // Deseleccionar cuartel y volver a la base como punto de ataque
      const baseOrigin = getBaseAttackOrigin();
      if (baseOrigin) {
        setActiveAttackOrigin(baseOrigin);
      }
    } else {
      // Seleccionar cuartel (y deseleccionar base)
      setActiveAttackOrigin(barracks);
    }
    closeEnemyDialog();
  }
};

// Manejar selección de base como punto de ataque
const handleSelectBaseAsAttackOrigin = () => {
  // La base siempre puede establecerse como punto de ataque (deseleccionando cuartel si hay uno)
  const baseOrigin = getBaseAttackOrigin();
  if (baseOrigin) {
    setActiveAttackOrigin(baseOrigin);
  }
  closeEnemyDialog();
};
  
// Manejar cierre del diálogo de POI
const handleClosePOIDialog = () => {
  closeDialog(removeConnectionLine);
  mapStore.closeAllDialogs();
  selectedEnemyForAttack.value = null;
  enemyDialogStyle.value = null;
};

const handleScanFromBarracks = async () => {
  if (!selectedPOI.value || selectedPOI.value.type !== 'barrack') return;
  const barrackPOI = selectedPOI.value;
  const position = { lat: barrackPOI.lat, lng: barrackPOI.lng };
  const radarRadius = 500;

  await runScan({
    type: 'barrack',
    position,
    radius: radarRadius,
    originId: barrackPOI.id,
  });
};

// Manejar scan desde el diálogo del marcador
const handleScan = async () => {
  if (!markerRef.value) return;

  // Cerrar el diálogo de la base al INICIAR el escaneo
  mapStore.closeBaseMarkerDialog();

  const position = markerRef.value.getLatLng();
  const radarConfig = getRadarConfig(gameStore.radarLevel);

  await runScan({
    type: 'base',
    position: { lat: position.lat, lng: position.lng },
    radius: radarConfig.radius,
    closeDialogs: false,
  });
};

// Manejar detención de scan
const handleStopScan = () => {
  if (selectedPOI.value && selectedPOI.value.type === 'barrack') {
    const key = getScanKey('barrack', selectedPOI.value.id);
    stopScanForKey(key);
  } else {
    stopScanForKey('base');
  }
};

// Manejar apertura del panel de upgrades
const handleOpenUpgrades = () => {
  // Cerrar diálogo de POI si está abierto
  if (showPOIDialog.value) {
    poiStore.closePOIDialog();
  }
  closeEnemyDialog();
  mapStore.openUpgradesPanel();
};

// Manejar clic en el marcador cuando está confirmado
const handleMarkerClick = (e) => {
  // Prevenir que el evento se propague al mapa
  if (e) {
    L.DomEvent.stopPropagation(e);
  }
  if (!baseConfirmed.value) return;

  const baseAlreadySelected = isBaseAttackOrigin.value && !selectedBarracksForAttack.value;

  // Cerrar diálogo de POI si está abierto
  if (showPOIDialog.value) {
    poiStore.closePOIDialog();
  }
  closeEnemyDialog();

  if (baseAlreadySelected) {
    mapStore.openBaseMarkerDialog();
    updateMarkerScreenPosition();
  } else {
    mapStore.closeBaseMarkerDialog();
    // Activar la base como origen de ataque en el primer clic
    handleSelectBaseAsAttackOrigin();
  }
};

// Manejar arrastre del marcador
const handleMarkerDragEnd = () => {
  const position = markerRef.value.getLatLng();
  mapStore.updateMarkerPosition([position.lat, position.lng]);
  updateMarkerScreenPosition();
  
  // Actualizar posición del radar solo si es la base la que está activa
  if (baseConfirmed.value && !selectedBarracksForAttack.value) {
    updateRadarPosition([position.lat, position.lng]);
  }
  
  updateConnectionLine(selectedPOI.value, currentAttackOrigin.value);
};

const handleMarkerDrag = () => {
  updateMarkerScreenPosition();
  if (markerRef.value && baseConfirmed.value && !selectedBarracksForAttack.value) {
    updateRadarPosition(markerRef.value.getLatLng());
  }
  updateConnectionLine(selectedPOI.value, currentAttackOrigin.value);
  updateOwnedConnectionLines(pois.value);
};

// Watchers para actualizar el punto de ataque actual
watch(selectedBarracksForAttack, (newBarracks) => {
  currentAttackOrigin.value = newBarracks;
});

watch(isBaseAttackOrigin, (isBase) => {
  if (isBase && markerRef.value) {
    const latLng = markerRef.value.getLatLng();
    currentAttackOrigin.value = {
      lat: latLng.lat,
      lng: latLng.lng,
      type: 'base',
    };
  } else if (!isBase && !selectedBarracksForAttack.value) {
    currentAttackOrigin.value = null;
  }
});

watch(baseConfirmed, (confirmed) => {
  if (confirmed) {
    enemySpawner.startEnemySpawnLoop();
    enemyMover.start();
  } else {
    enemySpawner.stopEnemySpawnLoop();
    enemyMover.stop();
  }
}, { immediate: true });

// Inicializar mapa
onMounted(() => {
  initMap();
  on('move', updateMarkerScreenPosition);
  on('zoom', updateMarkerScreenPosition);
  on('move', () => updatePOIScreenPosition(selectedPOI.value));
  on('zoom', () => updatePOIScreenPosition(selectedPOI.value));
  on('move', updateAttackOriginScreenPosition);
  on('zoom', updateAttackOriginScreenPosition);
  on('move', () => {
    if (selectedEnemyForAttack.value) {
      updateEnemyDialogPosition(selectedEnemyForAttack.value);
    }
  });
  on('zoom', () => {
    if (selectedEnemyForAttack.value) {
      updateEnemyDialogPosition(selectedEnemyForAttack.value);
    }
  });
  on('move', () => updateConnectionLine(selectedPOI.value, currentAttackOrigin.value));
  on('zoom', () => updateConnectionLine(selectedPOI.value, currentAttackOrigin.value));
  on('move', () => updateOwnedConnectionLines(pois.value));
  on('zoom', () => updateOwnedConnectionLines(pois.value));
  on('move', () => { mapViewVersion.value += 1; });
  on('zoom', () => { mapViewVersion.value += 1; });
  // Sincronizar centro y zoom del mapa con el store
  if (mapRef.value) {
    mapRef.value.on('moveend', () => {
      if (!isProgrammaticMapMove) {
        const c = mapRef.value.getCenter();
        mapStore.setCenter([c.lat, c.lng]);
        mapStore.saveMapState();
      }
    });
    mapRef.value.on('zoomend', () => {
      if (!isProgrammaticMapMove) {
        mapStore.setZoom(mapRef.value.getZoom());
        mapStore.saveMapState();
      }
    });
    mapRef.value.on('click', handleMapClick);
    mapRef.value.on('click', closeEnemyDialog);
  }
});

onBeforeUnmount(() => {
  enemySpawner.stopEnemySpawnLoop();
  enemyMover.stop();
});

// Observar cambios de centro y zoom
watch([center, zoom], ([newCenter, newZoom]) => {
  if (!mapRef.value) return;
  const current = mapRef.value.getCenter();
  const currentZoom = mapRef.value.getZoom();
  // Solo mover si hay diferencia real
  if (
    Math.abs(current.lat - newCenter[0]) > 1e-6 ||
    Math.abs(current.lng - newCenter[1]) > 1e-6 ||
    currentZoom !== newZoom
  ) {
    isProgrammaticMapMove = true;
    flyTo(newCenter, newZoom);
    setTimeout(() => { isProgrammaticMapMove = false; }, 500);
  }
});

// Observar cambios del marcador
watch(marker, async (newMarker) => {
  removeMarker();
  // No eliminar el radar aquí, se gestiona en el watcher de baseConfirmed
  removeConnectionLine();
  
  if (mapRef.value && newMarker) {
    // Crear el marcador - solo draggable si NO está confirmado
    createMarker(newMarker, BaseMarker, {
      draggable: !baseConfirmed.value,
      componentProps: { showDialog: false },
    });
    
    // Añadir eventos al marcador solo si no está confirmado
    if (!baseConfirmed.value) {
      onMarker('dragend', handleMarkerDragEnd);
      onMarker('drag', handleMarkerDrag);
    }
    
    // Si la base está confirmada, crear radar y añadir listener de click
    if (baseConfirmed.value) {
      createRadar({
        lat: newMarker[0],
        lng: newMarker[1],
        type: 'base',
        level: gameStore.radarLevel,
      });
      // Actualizar el punto de ataque si la base es el origen
      if (isBaseAttackOrigin.value) {
        currentAttackOrigin.value = {
          lat: newMarker[0],
          lng: newMarker[1],
          type: 'base',
        };
      }
      onMarker('click', handleMarkerClick);
    }
    
    // Actualizar posición del diálogo
    await nextTick();
    updateMarkerScreenPosition();
  }
});

// Observar confirmación de la base
watch(baseConfirmed, async (confirmed) => {
  if (confirmed && markerRef.value) {
    const position = markerRef.value.getLatLng();
    // Establecer la base como punto de ataque por defecto
    const baseOrigin = getBaseAttackOrigin();
    if (baseOrigin) {
      setActiveAttackOrigin(baseOrigin);
    }
    // Añadir listener de click al marcador cuando está confirmado
    onMarker('click', handleMarkerClick);
    // Actualizar radares de barracas inactivos
    const barracks = getBarracksForRadar();
    const baseCenter = {
      lat: position.lat,
      lng: position.lng,
      type: 'base',
      level: gameStore.radarLevel,
    };
    renderAllBarracksRadars(barracks, 'base', baseCenter);
    // No hacer scan automático - el usuario debe hacer clic en "Scan"
  } else {
    // Resetear estado
    isBaseAttackOrigin.value = false;
    selectedBarracksForAttack.value = null;
    removeRadar();
    removeConnectionLine();
    // Limpiar POIs cuando se oculta el radar
    poiStore.clearPOIs();
    clearPOIMarkers();
    // Limpiar radares de barracas inactivos
    renderAllBarracksRadars([], null, null);
  }
});

// Observar visibilidad del diálogo de confirmación de marcador
watch(activeDialog, (dialog) => {
  if (dialog === 'markerConfirm' || dialog === 'baseMarker') {
    updateMarkerScreenPosition();
  }
});

// Observar cambios en el punto de ataque actual
watch(currentAttackOrigin, () => {
  // Actualizar posición en pantalla del punto de ataque
  updateAttackOriginScreenPosition();
  
  // Si hay un POI seleccionado, actualizar su línea de conexión
  if (selectedPOI.value && showPOIDialog.value) {
    removeConnectionLine();
    nextTick(() => {
      createConnectionLine(selectedPOI.value, currentAttackOrigin.value);
    });
  }
});

// Observar cambios en el POI seleccionado
watch(selectedPOI, (poi, prevPoi) => {
  if (poi) {
    closeEnemyDialog();
    updatePOIScreenPosition(poi);
    // Limpiar línea anterior
    removeConnectionLine();
    // Crear nueva línea de conexión cuando se selecciona un nuevo POI
    nextTick(() => {
      createConnectionLine(poi, currentAttackOrigin.value);
    });
    
    // Si es una barraca propia y no está ya activa, activarla automáticamente
    if (
      poi.type === 'barrack' &&
      poi.owned &&
      (!selectedBarracksForAttack.value || selectedBarracksForAttack.value.id !== poi.id)
    ) {
      handleSelectAsAttackOrigin(poi);
    }
  }
});

// Actualizar posición del diálogo de POI cuando el mapa se mueve
watch(showPOIDialog, (visible) => {
  if (visible) {
    closeEnemyDialog();
    updatePOIScreenPosition(selectedPOI.value);
    // Crear línea de conexión cuando se abre el diálogo
    nextTick(() => {
      createConnectionLine(selectedPOI.value, currentAttackOrigin.value);
    });
  } else {
    // Eliminar línea de conexión cuando se cierra el diálogo
    removeConnectionLine();
  }
});

// Observar cambios en el nivel del radar para actualizar su radio (solo si es base)
watch(radarLevel, (newLevel) => {
  if (radarRef.value && baseConfirmed.value && !selectedBarracksForAttack.value) {
    // Solo actualizar si el radar activo es la base
    const radarConfig = getRadarConfig(newLevel);
    updateRadius(radarConfig.radius);
  }
});

watch(
  [baseMarkerPosition, radarLevel, getOwnedBarracksSignature, baseConfirmed],
  updateCoverageMetrics,
  { immediate: true, deep: true }
);

// Observar cambios en los POIs para actualizar líneas owned y radares de barracas
watch(pois, (newPois) => {
  if (mapRef.value && markerRef.value) {
    createOwnedConnectionLines(newPois);
  }
  // Mostrar todos los radares de barracas (menos el activo)
  const barracks = getBarracksForRadar();
  let activeId = null;
  const baseCenter = baseConfirmed.value && markerRef.value ? {
    lat: markerRef.value.getLatLng().lat,
    lng: markerRef.value.getLatLng().lng,
    type: 'base',
    level: gameStore.radarLevel,
  } : null;
  if (selectedBarracksForAttack.value) {
    activeId = selectedBarracksForAttack.value.id;
  } else if (baseCenter) {
    activeId = 'base';
  }
  renderAllBarracksRadars(barracks, activeId, baseCenter);
}, { deep: true });

// Observar cambios en la barraca activa para actualizar los radares inactivos
watch(selectedBarracksForAttack, (newBarrack) => {
  const barracks = getBarracksForRadar();
  let activeId = null;
  const baseCenter = baseConfirmed.value && markerRef.value ? {
    lat: markerRef.value.getLatLng().lat,
    lng: markerRef.value.getLatLng().lng,
    type: 'base',
    level: gameStore.radarLevel,
  } : null;
  if (newBarrack) {
    activeId = newBarrack.id;
  } else if (baseCenter) {
    activeId = 'base';
  }
  renderAllBarracksRadars(barracks, activeId, baseCenter);
});
</script>

<style scoped>
.fade-enter-active {
  transition: opacity 0.5s;
}
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
.fade-enter-to, .fade-leave-from {
  opacity: 1;
}
:deep(.poi-marker) {
  cursor: pointer;
  transition: all 0.2s ease;
}

:deep(.poi-marker:hover) {
  filter: brightness(1.2);
}

.attack-triangle {
  pointer-events: none;
  color: white;
  font-size: 24px;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
  filter: drop-shadow(0 0 5px white);
}

.enemy-triangle {
  pointer-events: auto;
  cursor: pointer;
  color: #ff0000;
  font-size: 24px;
  filter: drop-shadow(0 0 10px rgba(255, 0, 0, 0.9));
}

.resource-particle {
  pointer-events: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.radar-sweep {
  pointer-events: none;
}

.sweep-line {
  position: absolute;
  width: 3px;
  height: var(--radar-radius, 500px);
  background: linear-gradient(to top, rgba(0, 188, 255, 0) 0%, rgba(0, 188, 255, 0.8) 50%, rgba(0, 188, 255, 0) 100%);
  transform-origin: bottom center;
  animation: sweep 2s linear infinite;
  filter: blur(1px);
  box-shadow: 0 0 10px rgba(0, 188, 255, 0.5);
  left: -1.5px;
  bottom: 0;
}

@keyframes sweep {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
