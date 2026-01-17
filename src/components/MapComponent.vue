<template>
  <div class="w-full h-[100vh] overflow-hidden relative">
    <div id="map" class="w-full h-[calc(100vh+30px)] z-0 bg-black"></div>
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
      :base-nodes-used="baseNodesUsed"
      :base-nodes-max="baseNodesMax"
      :is-heal-on-cooldown="isBaseHealOnCooldown"
      :heal-progress="baseHealProgress"
      :show-auto-heal="autoHealLevel > 0"
      :auto-heal-progress="autoHealProgress"
      :auto-heal-label="autoHealTimeLabel"
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
      @autoextract="handleAutoExtract"
      @open-poi-upgrades="handleOpenPoiUpgrades"
      @heal="handleHeal"
      @convertToBarracks="handleConvertToBarracks"
      @scan="handleScanFromBarracks"
      @stopScan="handleStopScan"
    />
    <UpgradePoiPanel
      v-if="showPoiUpgradesPanel && selectedPOI"
      :poi="selectedPOI"
      @close="poiStore.closePoiUpgradesPanel"
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
    <Teleport v-if="enemyPane && !showStartPopup && baseConfirmed" :to="enemyPane">
      <div 
        v-for="enemy in enemyMarkers" 
        :key="enemy.id"
        class="enemy-marker cursor-pointer pointer-events-auto text-[#ff0000] text-[24px] filter drop-shadow-[0_0_10px_rgba(255,0,0,0.9)] rounded-full w-8 h-8 flex items-center justify-center relative"
        :class="enemy.id === selectedEnemyId ? 'is-selected' : ''"
        :style="{
          position: 'absolute',
          left: `${enemy.x}px`,
          top: `${enemy.y}px`,
          transform: `translate(-50%, -50%) rotate(${enemy.rotation}deg)`,
        }"
      >
        <svg class="enemy-ring" viewBox="0 0 36 36" aria-hidden="true">
          <circle class="enemy-ring-bg" cx="18" cy="18" r="16"></circle>
          <circle
            class="enemy-ring-progress"
            cx="18"
            cy="18"
            r="16"
            :style="enemy.id === selectedEnemyId ? { strokeDashoffset: enemyRingOffset } : null"
          ></circle>
        </svg>
        ▲
      </div>
    </Teleport>
    <Teleport v-if="resourceParticlesPane" :to="resourceParticlesPane">
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
        }"
      ></div>
    </Teleport>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, watch, nextTick, computed, ref } from 'vue';
import { storeToRefs } from 'pinia';
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
import { BARRACKS_RADIUS_RATIO } from '@/constants/player';
import BaseMarker from './BaseMarker.vue';
import MarkerConfirmDialog from './MarkerConfirmDialog.vue';
import BaseMarkerDialog from './BaseMarkerDialog.vue';
import POIDialog from './POIDialog.vue';
import UpgradesPanel from './UpgradesPanel.vue';
import UpgradePoiPanel from './UpgradePoiPanel.vue';
import { computeRadarsMetrics } from '@/utils/mathUtils';
import { buildCoverageRadars, buildOwnedBarracksSignature } from '@/utils/mapCoverage';
import { useScanCoverage } from '@/composables/useScanCoverage';
import { useAttackOrigin } from '@/composables/useAttackOrigin';
import { provideMapContext } from '@/composables/useMapContext';
import { useEnemyFeature } from '@/composables/useEnemyFeature';
import { useBaseFeature } from '@/composables/useBaseFeature';
import { useAutoExtract } from '@/composables/useAutoExtract';
import { useAutoHeal } from '@/composables/useAutoHeal';

const mapStore = useMapStore();
// Bandera global para evitar bucles watcher <-> eventos Leaflet
let isProgrammaticMapMove = false;
const poiStore = usePoiStore();
const gameStore = useGameStore();
const { center, zoom, marker, activeDialog, baseConfirmed, showUpgradesPanel } = storeToRefs(mapStore);
const { radarLevel, resources, baseHealth, baseMaxHealth, showStartPopup, autoAttackLevel, autoHealLevel, isBaseCaptured } = storeToRefs(gameStore);
const baseNodesUsed = computed(() => (pois.value || []).filter((poi) => poi.owned && !poi.conqueredFrom).length);
const baseNodesMax = computed(() => gameStore.getMaxBaseNodes());
const { selectedPOI, showPOIDialog, showPoiUpgradesPanel, isLoading, pois } = storeToRefs(poiStore);
const selectedBarracksForAttack = ref(null); // Cuartel seleccionado para lanzar ataques
const isBaseAttackOrigin = ref(false); // Si la base está seleccionada como punto de ataque
const currentAttackOrigin = ref(null); // Punto de ataque activo (se actualiza cuando cambia)
const mapViewVersion = ref(0);
const resourceParticlesPane = ref(null);
const enemyPane = ref(null);

// Inicializar composables principales
// Usar refs reactivos para que el mapa se inicialice con los valores restaurados
const { mapRef, initMap, flyTo, on } = useLeafletMap('map', center.value, zoom.value);
const { markerRef, createMarker, disableDragging, removeMarker, on: onMarker, updateIcon } = useMapMarker(mapRef);
const { radarRef, createRadar, renderAllBarracksRadars, updatePosition: updateRadarPosition, updateRadius, removeRadar, hasActiveRadar, getRadarData, getAttackCenter } = useAttackRadar(mapRef);
const { clearPOIMarkers } = usePointsOfInterest(mapRef);

// Composables para funcionalidades específicas
const { resourceParticles, startResourceCollection, startHealingDelivery, cancelResourceCollectionForBarrack } = useResourceCollection(mapRef, markerRef);
const { attackTriangles, startAttack } = useAttackAnimation(mapRef, markerRef, { radarLevel });
const { 
  createConnectionLine, 
  removeConnectionLine, 
  updateConnectionLine,
  createOwnedConnectionLines,
  updateOwnedConnectionLines,
  removeOwnedConnectionLines 
} = useConnectionLines(mapRef, markerRef);
const barrackOwnership = new Map();
const { 
  markerScreenPosition, 
  poiScreenPosition, 
  updateMarkerScreenPosition, 
  updatePOIScreenPosition,
  dialogStyle,
  poiDialogStyle 
} = useScreenPositions(mapRef, markerRef);
const { closePOIDialog: closeDialog, handleMapClick } = useMapDialogs();
const {
  baseMarkerPosition,
  getBaseAttackOrigin,
  getOwnedBarracks,
  getBarracksForRadar,
  refreshBaseCaptureVisuals,
  setActiveAttackOrigin,
  handleSelectAsAttackOrigin,
  handleSelectBaseAsAttackOrigin,
  attackOriginScreenPosition,
  updateAttackOriginScreenPosition,
} = useAttackOrigin({
  mapRef,
  markerRef,
  radarRef,
  renderAllBarracksRadars,
  createRadar,
  removeRadar,
  getAttackCenter,
  updateIcon,
  BaseMarker,
  radarLevel,
  baseConfirmed,
  isBaseCaptured,
  pois,
  gameStore,
  isBaseAttackOrigin,
  selectedBarracksForAttack,
  currentAttackOrigin,
});
const {
  isBaseScanActive,
  isSelectedBarrackScanActive,
  radarSweepStyles,
  runScan,
  stopScanForKey,
  getScanKey,
} = useScanCoverage({
  mapRef,
  selectedPOI,
  mapViewVersion,
  closeDialog,
  removeConnectionLine,
  poiStore,
  mapStore,
});

useAutoExtract({
  onAutoExtract: ({ poi, resourceType, resourceColor }) => {
    if (!mapRef.value || !markerRef.value) {
      gameStore.addResource(resourceType);
      return;
    }
    startResourceCollection(poi, resourceType, resourceColor, pois.value);
  },
});

const { autoHealProgress, timeToNextHeal } = useAutoHeal({
  baseConfirmed,
  autoHealLevel,
  baseHealth,
  baseMaxHealth,
  resources,
  isBaseCaptured,
  getCooldownMs: () => gameStore.getAutoHealCooldownMs(),
  onHeal: () => {
    if (!gameStore.consumeResource('pharmacy', 1)) return;
    gameStore.setBaseHealth(baseHealth.value + 1);
    const pharmacyPoi = pois.value.find(p => p.type === 'pharmacy' && p.conquered);
    if (pharmacyPoi) {
      startResourceCollection(pharmacyPoi, 'pharmacy', getPOIColor('pharmacy'), pois.value, () => {});
    }
  },
});

const autoHealTimeLabel = computed(() => {
  if (autoHealLevel.value <= 0) return '';
  const seconds = Math.max(0, Math.ceil(timeToNextHeal.value / 1000));
  return `${seconds}s`;
});

provideMapContext({
  mapRef,
  markerRef,
  radarRef,
  mapStore,
  poiStore,
  gameStore,
});

const {
  enemyMarkers,
  selectedEnemyId,
  isEnemyAttackOnCooldown,
  enemyAttackCooldownProgress,
  handleEnemyClick,
  closeEnemyDialog,
} = useEnemyFeature({
  mapRef,
  onMapEvent: on,
  mapViewVersion,
  baseConfirmed,
  showStartPopup,
  baseMarkerPosition,
  pois,
  radarLevel,
  gameStore,
  poiStore,
  baseHealth,
  autoAttackLevel,
  currentAttackOrigin,
  startAttack,
  startHealAnimation: (target, onHit) => startHealingDelivery(target, getPOIColor('pharmacy'), pois.value, onHit),
  markerRef,
  closeDialog,
  removeConnectionLine,
  mapStore,
});

const enemyRingOffset = computed(() => {
  if (!selectedEnemyId.value) return 100;
  if (isEnemyAttackOnCooldown.value) {
    return 100 - enemyAttackCooldownProgress.value;
  }
  return 0;
});

const {
  isBaseHealOnCooldown,
  baseHealProgress,
  handleBaseHeal,
  handleConfirmMarker,
  handleMarkerClick,
  handleMarkerDragEnd,
  handleMarkerDrag,
} = useBaseFeature({
  mapStore,
  poiStore,
  gameStore,
  markerRef,
  baseConfirmed,
  isBaseAttackOrigin,
  selectedBarracksForAttack,
  currentAttackOrigin,
  selectedPOI,
  showPOIDialog,
  baseHealth,
  disableDragging,
  updateMarkerScreenPosition,
  updateRadarPosition,
  updateConnectionLine,
  updateOwnedConnectionLines,
  handleSelectBaseAsAttackOrigin,
  closeEnemyDialog,
  pois,
  isBaseCaptured,
});

// Radio actual del radar según el tipo de centro de ataque
const radarRadius = computed(() => {
  const radarData = getRadarData();
  if (!radarData) return 0;
  return radarData.radius;
});


const updateCoverageMetrics = () => {
  const radars = buildCoverageRadars({
    baseConfirmed: baseConfirmed.value,
    basePosition: baseMarkerPosition.value,
    radarLevel: radarLevel.value,
    pois: pois.value,
  });
  const { perimeterMeters, areaSquareMeters } = computeRadarsMetrics(radars);
  mapStore.setCoverageMetrics(perimeterMeters, areaSquareMeters);
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

// Manejar extracción manual de recursos
const handleExtract = () => {
  if (!selectedPOI.value || !selectedPOI.value.owned) return;
  const consumed = poiStore.consumeResource(selectedPOI.value.id);
  if (!consumed) return;
  const resourceType = selectedPOI.value.category || selectedPOI.value.type;
  const resourceColor = getPOIColor(resourceType);
  startResourceCollection(selectedPOI.value, resourceType, resourceColor, pois.value);
};

const handleAutoExtract = () => {
  handleExtract();
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
  closeEnemyDialog();
};
  
// Manejar cierre del diálogo de POI
const handleClosePOIDialog = () => {
  closeDialog(removeConnectionLine);
  mapStore.closeAllDialogs();
  closeEnemyDialog();
};

const findEnemyMarkerAtPoint = (point) => {
  const maxDistance = 14;
  const maxDistanceSq = maxDistance * maxDistance;
  let closest = null;
  let closestSq = maxDistanceSq;

  enemyMarkers.value.forEach((enemy) => {
    const dx = enemy.x - point.x;
    const dy = enemy.y - point.y;
    const distSq = dx * dx + dy * dy;
    if (distSq <= closestSq) {
      closestSq = distSq;
      closest = enemy;
    }
  });

  return closest;
};

const handleMapClickWithEnemy = (event) => {
  if (mapRef.value && baseConfirmed.value && !showStartPopup.value) {
    const point = mapRef.value.latLngToLayerPoint(event.latlng);
    const enemy = findEnemyMarkerAtPoint(point);
    if (enemy) {
      handleEnemyClick(enemy.id);
      return;
    }
  }
  closeEnemyDialog();
  handleMapClick();
};

const handleScanFromBarracks = async () => {
  if (!selectedPOI.value || selectedPOI.value.type !== 'barrack') return;
  const barrackPOI = selectedPOI.value;
  const position = { lat: barrackPOI.lat, lng: barrackPOI.lng };
  const baseRadius = getRadarConfig(gameStore.radarLevel).radius;
  const radarRadius = barrackPOI.barrackRadarRadius ?? (baseRadius * BARRACKS_RADIUS_RATIO);

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
  poiStore.closePoiUpgradesPanel();
  closeEnemyDialog();
  mapStore.openUpgradesPanel();
};

const handleOpenPoiUpgrades = () => {
  if (showUpgradesPanel.value) {
    mapStore.closeUpgradesPanel();
  }
  if (showPOIDialog.value) {
    poiStore.hidePOIDialog();
  }
  closeEnemyDialog();
  poiStore.openPoiUpgradesPanel();
};

// Inicializar mapa
onMounted(() => {
  initMap();
  const setupResourceParticlesPane = () => {
    if (!mapRef.value || resourceParticlesPane.value) return;
    const pane = mapRef.value.createPane('resourceParticles');
    pane.style.zIndex = 450;
    pane.style.pointerEvents = 'none';
    resourceParticlesPane.value = pane;
  };
  const setupEnemyPane = () => {
    if (!mapRef.value || enemyPane.value) return;
    const pane = mapRef.value.createPane('enemyPane');
    pane.style.zIndex = 550;
    pane.style.pointerEvents = 'none';
    enemyPane.value = pane;
  };
  setupResourceParticlesPane();
  setupEnemyPane();
  watch(mapRef, setupResourceParticlesPane);
  watch(mapRef, setupEnemyPane);
  on('move', updateMarkerScreenPosition);
  on('zoom', updateMarkerScreenPosition);
  on('move', () => updatePOIScreenPosition(selectedPOI.value));
  on('zoom', () => updatePOIScreenPosition(selectedPOI.value));
  on('move', updateAttackOriginScreenPosition);
  on('zoom', updateAttackOriginScreenPosition);
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
    mapRef.value.on('click', handleMapClickWithEnemy);
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
      componentProps: { isEnemy: isBaseCaptured.value },
      zIndexOffset: 1000,
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
        isEnemy: isBaseCaptured.value,
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

watch([isBaseCaptured, markerRef, radarRef], () => {
  refreshBaseCaptureVisuals();
}, { immediate: true });

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
      isEnemy: isBaseCaptured.value,
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
      closeEnemyDialog();
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
  [
    baseMarkerPosition,
    radarLevel,
    () => buildOwnedBarracksSignature(pois.value),
    baseConfirmed,
  ],
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
    isEnemy: isBaseCaptured.value,
  } : null;
  if (selectedBarracksForAttack.value) {
    activeId = selectedBarracksForAttack.value.id;
  } else if (baseCenter) {
    activeId = 'base';
  }
  renderAllBarracksRadars(barracks, activeId, baseCenter);

  newPois.forEach((poi) => {
    if (poi.type !== 'barrack') return;
    const prevOwned = barrackOwnership.get(poi.id);
    if (prevOwned === true && poi.owned === false) {
      cancelResourceCollectionForBarrack(poi.id);
    }
    barrackOwnership.set(poi.id, poi.owned);
  });
}, { deep: true });


watch(
  () => selectedBarracksForAttack.value ? selectedBarracksForAttack.value.owned : null,
  (isOwned) => {
    if (isOwned === false && selectedBarracksForAttack.value) {
      const baseOrigin = getBaseAttackOrigin();
      if (baseOrigin) {
        setActiveAttackOrigin(baseOrigin);
      } else {
        selectedBarracksForAttack.value = null;
        isBaseAttackOrigin.value = false;
        removeRadar();
      }
    }
  }
);

// Observar cambios en la barraca activa para actualizar los radares inactivos
watch(selectedBarracksForAttack, (newBarrack) => {
  const barracks = getBarracksForRadar();
  let activeId = null;
  const baseCenter = baseConfirmed.value && markerRef.value ? {
    lat: markerRef.value.getLatLng().lat,
    lng: markerRef.value.getLatLng().lng,
    type: 'base',
    level: gameStore.radarLevel,
    isEnemy: isBaseCaptured.value,
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

.enemy-ring {
  position: absolute;
  inset: -6px;
  transform: rotate(-90deg);
  opacity: 0;
}

.enemy-ring-bg {
  fill: none;
  stroke: rgba(255, 255, 255, 0.15);
  stroke-width: 2;
}

.enemy-ring-progress {
  fill: none;
  stroke: white;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-dasharray: 100 100;
  stroke-dashoffset: 100;
  transition: stroke-dashoffset 0.1s linear;
}

.enemy-marker.is-selected .enemy-ring {
  opacity: 1;
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
