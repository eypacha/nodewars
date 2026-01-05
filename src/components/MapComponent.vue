<template>
  <div class="w-full h-[100vh] overflow-hidden relative">
    <ResourceHUD />
    <div id="map" class="w-full h-[calc(100vh+30px)] z-0"></div>
    <MarkerConfirmDialog 
      v-if="showMarkerDialog && markerScreenPosition" 
      :style="dialogStyle"
      @confirm="handleConfirmMarker" 
    />
    <BaseMarkerDialog
      v-if="showBaseMarkerDialog && markerScreenPosition && baseConfirmed"
      :style="dialogStyle"
      :is-scanning="isLoading"
      :is-attack-origin="isBaseAttackOrigin"
      @scan="handleScan"
      @upgrades="mapStore.openUpgradesPanel"
      @selectAsAttackOrigin="handleSelectBaseAsAttackOrigin"
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
      @close="handleClosePOIDialog"
      @attack="handleAttack"
      @extract="handleExtract"
      @convertToBarracks="handleConvertToBarracks"
      @scan="handleScanFromBarracks"
      @selectAsAttackOrigin="handleSelectAsAttackOrigin"
    />
    <UpgradesPanel
      v-if="showUpgradesPanel"
      @close="mapStore.closeUpgradesPanel"
    />
    <div 
      v-if="(isLoading && baseConfirmed && !selectedBarracksForAttack) || (isScanningFromBarracks && selectedBarracksForAttack) || (isLoading && isBaseAttackOrigin)" 
      class="radar-sweep"
      :style="radarSweepStyle"
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
        zIndex: 999,
      }"
    >
      ▲
    </div>
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
import { onMounted, watch, nextTick, computed, ref } from 'vue';
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
import { getPOIColor } from '@/services/overpassService';
import BaseMarker from './BaseMarker.vue';
import MarkerConfirmDialog from './MarkerConfirmDialog.vue';
import BaseMarkerDialog from './BaseMarkerDialog.vue';
import POIDialog from './POIDialog.vue';
import ResourceHUD from './ResourceHUD.vue';
import UpgradesPanel from './UpgradesPanel.vue';

const mapStore = useMapStore();
const poiStore = usePoiStore();
const gameStore = useGameStore();
const { center, zoom, marker, showMarkerDialog, baseConfirmed, showBaseMarkerDialog, showUpgradesPanel } = storeToRefs(mapStore);
const { radarLevel } = storeToRefs(gameStore);
const { selectedPOI, showPOIDialog, isLoading, pois } = storeToRefs(poiStore);
const isScanningFromBarracks = ref(false);
const selectedBarracksForAttack = ref(null); // Cuartel seleccionado para lanzar ataques
const isBaseAttackOrigin = ref(false); // Si la base está seleccionada como punto de ataque

// Inicializar composables principales
const { mapRef, initMap, flyTo, on } = useLeafletMap('map', center.value, zoom.value);
const { markerRef, createMarker, disableDragging, removeMarker, on: onMarker } = useMapMarker(mapRef);
const { radarRef, createRadar, updatePosition: updateRadarPosition, updateRadius, removeRadar, hasActiveRadar, getRadarData } = useAttackRadar(mapRef);
const { clearPOIMarkers } = usePointsOfInterest(mapRef);

// Composables para funcionalidades específicas
const { resourceParticles, startResourceCollection } = useResourceCollection(mapRef, markerRef);
const { attackTriangles, startAttack, cancelAttack } = useAttackAnimation(mapRef, markerRef);
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

// Posición del marcador base para calcular distancia
const baseMarkerPosition = computed(() => {
  if (!markerRef.value) return null;
  const latLng = markerRef.value.getLatLng();
  return { lat: latLng.lat, lng: latLng.lng };
});

// Radio actual del radar según el tipo de centro de ataque
const radarRadius = computed(() => {
  const radarData = getRadarData();
  if (!radarData) return 0;
  return radarData.radius;
});

// Punto de ataque activo (base o cuartel)
const currentAttackOrigin = computed(() => {
  if (selectedBarracksForAttack.value) {
    return selectedBarracksForAttack.value;
  }
  if (isBaseAttackOrigin.value && markerRef.value) {
    const latLng = markerRef.value.getLatLng();
    return {
      lat: latLng.lat,
      lng: latLng.lng,
      type: 'base',
    };
  }
  return null;
});

// Estilo de la animación del radar (base o cuartel)
const radarSweepStyle = computed(() => {
  if (!mapRef.value) return {};
  
  // Determinar si es cuartel
  const isBarracks = selectedBarracksForAttack.value !== null;
  
  if (isBarracks && selectedBarracksForAttack.value) {
    // Radar del cuartel
    const barracksLatLng = L.latLng(selectedBarracksForAttack.value.lat, selectedBarracksForAttack.value.lng);
    const screenPoint = mapRef.value.latLngToContainerPoint(barracksLatLng);
    
    // Radio del cuartel: 500 metros
    const earthRadius = 6371000;
    const barracksRadius = 500;
    const latOffset = (barracksRadius / earthRadius) * (180 / Math.PI);
    const pointAtRadius = L.latLng(selectedBarracksForAttack.value.lat + latOffset, selectedBarracksForAttack.value.lng);
    const edgePoint = mapRef.value.latLngToContainerPoint(pointAtRadius);
    const radiusInPixels = Math.abs(edgePoint.y - screenPoint.y);
    
    return {
      position: 'absolute',
      left: `${screenPoint.x}px`,
      top: `${screenPoint.y}px`,
      zIndex: 999,
      '--radar-radius': `${radiusInPixels}px`,
    };
  } else if (isBaseAttackOrigin.value && markerScreenPosition.value && markerRef.value) {
    // Radar de la base como punto de ataque
    const radarConfig = getRadarConfig(gameStore.radarLevel);
    const markerLatLng = markerRef.value.getLatLng();
    
    // Crear un punto a la distancia del radio del radar
    const earthRadius = 6371000;
    const lat = markerLatLng.lat;
    const lng = markerLatLng.lng;
    const radiusInMeters = radarConfig.radius;
    
    // Calcular un punto al norte a la distancia del radio
    const latOffset = (radiusInMeters / earthRadius) * (180 / Math.PI);
    const pointAtRadius = [lat + latOffset, lng];
    
    // Convertir a píxeles
    const centerPoint = mapRef.value.latLngToContainerPoint(markerLatLng);
    const edgePoint = mapRef.value.latLngToContainerPoint(pointAtRadius);
    const radiusInPixels = Math.abs(edgePoint.y - centerPoint.y);
    
    return {
      position: 'absolute',
      left: `${markerScreenPosition.value.x}px`,
      top: `${markerScreenPosition.value.y}px`,
      zIndex: 999,
      '--radar-radius': `${radiusInPixels}px`,
    };
  } else if (markerScreenPosition.value && markerRef.value && baseConfirmed.value && !isBaseAttackOrigin.value) {
    // Radar de la base (solo si no es punto de ataque)
    // Mostrar animación de escaneo pero sin ser punto de ataque
    const radarConfig = getRadarConfig(gameStore.radarLevel);
    const markerLatLng = markerRef.value.getLatLng();
    
    // Crear un punto a la distancia del radio del radar
    const earthRadius = 6371000;
    const lat = markerLatLng.lat;
    const lng = markerLatLng.lng;
    const radiusInMeters = radarConfig.radius;
    
    // Calcular un punto al norte a la distancia del radio
    const latOffset = (radiusInMeters / earthRadius) * (180 / Math.PI);
    const pointAtRadius = [lat + latOffset, lng];
    
    // Convertir a píxeles
    const centerPoint = mapRef.value.latLngToContainerPoint(markerLatLng);
    const edgePoint = mapRef.value.latLngToContainerPoint(pointAtRadius);
    const radiusInPixels = Math.abs(edgePoint.y - centerPoint.y);
    
    return {
      position: 'absolute',
      left: `${markerScreenPosition.value.x}px`,
      top: `${markerScreenPosition.value.y}px`,
      zIndex: 999,
      '--radar-radius': `${radiusInPixels}px`,
    };
  }
  
  return {};
});

// Estilo para la animación del radar del cuartel (DEPRECATED - usar radarSweepStyle)
const barracksRadarSweepStyle = computed(() => {
  // Este computed se mantiene para compatibilidad pero usa radarSweepStyle
  return radarSweepStyle.value;
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

  // Manejar conversión a barrack
  const handleConvertToBarracks = () => {
    if (!selectedPOI.value) return;
    poiStore.convertToBarracks(selectedPOI.value.id);
  };
  // Manejar scan desde un cuartel
  const handleScanFromBarracks = async () => {
    if (!selectedPOI.value || selectedPOI.value.type !== 'barrack') return;
    
    const position = { lat: selectedPOI.value.lat, lng: selectedPOI.value.lng };
    const radarRadius = 500; // Usar el mismo radio que el radar del cuartel
    
    console.log('Scanning from barracks:', position, 'radius:', radarRadius);
    
    // Activar animación de scan del cuartel
    isScanningFromBarracks.value = true;
    
    // Hacer fetch de POIs desde el cuartel
    await poiStore.fetchPOIs(position, radarRadius);
    
    // Desactivar animación después de que la animación del sweep termine (2s)
    // La animación dura 2 segundos (sweep 2s linear infinite)
    setTimeout(() => {
      isScanningFromBarracks.value = false;
    }, 2000);
  };

  // Manejar selección de cuartel como punto de ataque
  const handleSelectAsAttackOrigin = (barracks) => {
    if (barracks && barracks.type === 'barrack' && barracks.owned) {
      // Toggle: si ya está seleccionado, deseleccionar; si no, seleccionar
      if (selectedBarracksForAttack.value && selectedBarracksForAttack.value.id === barracks.id) {
        selectedBarracksForAttack.value = null;
        removeRadar(); // Eliminar el radar del cuartel
      } else {
        selectedBarracksForAttack.value = barracks;
        // Crear radar para el cuartel seleccionado
        createRadar({
          lat: barracks.lat,
          lng: barracks.lng,
          type: 'barrack',
        });
      }
    }
  };

  // Manejar selección de base como punto de ataque
  const handleSelectBaseAsAttackOrigin = () => {
    if (isBaseAttackOrigin.value) {
      // Deseleccionar base
      isBaseAttackOrigin.value = false;
      removeRadar();
    } else {
      // Deseleccionar cuartel si hay uno seleccionado
      if (selectedBarracksForAttack.value) {
        selectedBarracksForAttack.value = null;
      }
      // Seleccionar base
      isBaseAttackOrigin.value = true;
      if (markerRef.value) {
        const position = markerRef.value.getLatLng();
        createRadar({
          lat: position.lat,
          lng: position.lng,
          type: 'base',
          level: gameStore.radarLevel,
        });
      }
    }
  };
  
// Manejar cierre del diálogo de POI
const handleClosePOIDialog = () => {
  closeDialog(removeConnectionLine, cancelAttack);
};

// Manejar scan desde el diálogo del marcador
const handleScan = async () => {
  if (!markerRef.value) return;
  
  const position = markerRef.value.getLatLng();
  const radarConfig = getRadarConfig(gameStore.radarLevel);
  
  // Cargar puntos de interés dentro del radio del radar
  await poiStore.fetchPOIs(
    { lat: position.lat, lng: position.lng },
    radarConfig.radius
  );
  
  mapStore.closeBaseMarkerDialog();
};

// Manejar clic en el marcador cuando está confirmado
const handleMarkerClick = (e) => {
  // Prevenir que el evento se propague al mapa
  if (e) {
    L.DomEvent.stopPropagation(e);
  }
  if (baseConfirmed.value) {
    mapStore.openBaseMarkerDialog();
    updateMarkerScreenPosition();
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

// Inicializar mapa
onMounted(() => {
  initMap();
  on('move', updateMarkerScreenPosition);
  on('zoom', updateMarkerScreenPosition);
  on('move', () => updatePOIScreenPosition(selectedPOI.value));
  on('zoom', () => updatePOIScreenPosition(selectedPOI.value));
  on('move', () => updateConnectionLine(selectedPOI.value, currentAttackOrigin.value));
  on('zoom', () => updateConnectionLine(selectedPOI.value, currentAttackOrigin.value));
  on('move', () => updateOwnedConnectionLines(pois.value));
  on('zoom', () => updateOwnedConnectionLines(pois.value));
  // Agregar listener para cerrar diálogo al hacer clic en el mapa
  if (mapRef.value) {
    mapRef.value.on('click', handleMapClick);
  }
});

// Observar cambios de centro y zoom
watch([center, zoom], ([newCenter, newZoom]) => {
  flyTo(newCenter, newZoom);
});

// Observar cambios del marcador
watch(marker, async (newMarker) => {
  removeMarker();
  // No eliminar el radar aquí, se gestiona en el watcher de baseConfirmed
  removeConnectionLine();
  
  if (mapRef.value && newMarker) {
    // Crear el marcador
    createMarker(newMarker, BaseMarker, {
      draggable: true,
      componentProps: { showDialog: false },
    });
    
    // Añadir eventos al marcador
    onMarker('dragend', handleMarkerDragEnd);
    onMarker('drag', handleMarkerDrag);
    
    // Si la base está confirmada, crear radar y añadir listener de click
    if (baseConfirmed.value) {
      createRadar({
        lat: newMarker[0],
        lng: newMarker[1],
        type: 'base',
        level: gameStore.radarLevel,
      });
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
    // Crear radar para la base
    createRadar({
      lat: position.lat,
      lng: position.lng,
      type: 'base',
      level: gameStore.radarLevel,
    });
    
    // Añadir listener de click al marcador cuando está confirmado
    onMarker('click', handleMarkerClick);
    
    // No hacer scan automático - el usuario debe hacer clic en "Scan"
  } else {
    // Solo eliminar radar si no hay cuartel seleccionado
    if (!selectedBarracksForAttack.value) {
      removeRadar();
    }
    removeConnectionLine();
    // Limpiar POIs cuando se oculta el radar
    poiStore.clearPOIs();
    clearPOIMarkers();
  }
});

// Observar visibilidad del diálogo
watch(showMarkerDialog, (visible) => {
  if (visible) {
    updateMarkerScreenPosition();
  }
});

// Observar visibilidad del diálogo del marcador base
watch(showBaseMarkerDialog, (visible) => {
  if (visible) {
    updateMarkerScreenPosition();
  }
});

// Observar cambios en el POI seleccionado
watch(selectedPOI, (poi) => {
  if (poi) {
    updatePOIScreenPosition(poi);
    // Actualizar línea de conexión cuando se selecciona un nuevo POI
    nextTick(() => {
      createConnectionLine(poi, currentAttackOrigin.value);
    });
  }
});

// Actualizar posición del diálogo de POI cuando el mapa se mueve
watch(showPOIDialog, (visible) => {
  if (visible) {
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

// Observar cambios en los POIs para actualizar líneas owned
watch(pois, (newPois) => {
  if (mapRef.value && markerRef.value) {
    createOwnedConnectionLines(newPois);
  }
}, { deep: true });
</script>

<style scoped>
/* Estilos para los marcadores POI */
:deep(.poi-marker) {
  cursor: pointer;
  transition: all 0.2s ease;
}

:deep(.poi-marker:hover) {
  filter: brightness(1.2);
}

/* Estilos para el triángulo de ataque */
.attack-triangle {
  pointer-events: none;
  color: white;
  font-size: 24px;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
  filter: drop-shadow(0 0 5px white);
}

/* Estilos para las partículas de recurso */
.resource-particle {
  pointer-events: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

/* Estilos para la animación del radar */
/* Animación de barrido del radar */
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