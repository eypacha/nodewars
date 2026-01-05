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
      @scan="handleScan"
    />
    <POIDialog
      v-if="showPOIDialog && selectedPOI && poiScreenPosition"
      :style="poiDialogStyle"
      :poi="selectedPOI"
      :base-position="baseMarkerPosition"
      @close="handleClosePOIDialog"
      @attack="handleAttack"
      @extract="handleExtract"
    />
    <div 
      v-if="isLoading && markerScreenPosition" 
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
import { onMounted, watch, nextTick, computed } from 'vue';
import { storeToRefs } from 'pinia';
import L from 'leaflet';
import { useMapStore } from '@/stores/mapStore';
import { usePoiStore } from '@/stores/poiStore';
import { useGameStore } from '@/stores/gameStore';
import { useLeafletMap } from '@/composables/useLeafletMap';
import { useMapMarker } from '@/composables/useMapMarker';
import { useRadar } from '@/composables/useRadar';
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

const mapStore = useMapStore();
const poiStore = usePoiStore();
const gameStore = useGameStore();
const { center, zoom, marker, showMarkerDialog, baseConfirmed, showBaseMarkerDialog } = storeToRefs(mapStore);
const { selectedPOI, showPOIDialog, isLoading, pois } = storeToRefs(poiStore);

// Inicializar composables principales
const { mapRef, initMap, flyTo, on } = useLeafletMap('map', center.value, zoom.value);
const { markerRef, createMarker, disableDragging, removeMarker, on: onMarker } = useMapMarker(mapRef);
const { radarRef, createRadar, updatePosition: updateRadarPosition, removeRadar } = useRadar(mapRef);
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

// Estilo de la animación del radar
const radarSweepStyle = computed(() => {
  if (!markerScreenPosition.value || !mapRef.value || !markerRef.value) return {};
  
  // Calcular el radio del radar en píxeles
  const radarConfig = getRadarConfig();
  const markerLatLng = markerRef.value.getLatLng();
  
  // Crear un punto a la distancia del radio del radar
  const earthRadius = 6371000; // Radio de la Tierra en metros
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
});

// Manejar confirmación del marcador
const handleConfirmMarker = () => {
  mapStore.confirmBase();
  disableDragging();
};

// Manejar ataque al POI
const handleAttack = () => {
  startAttack(selectedPOI.value);
};

// Manejar extracción manual de recursos
const handleExtract = () => {
  if (!selectedPOI.value || !selectedPOI.value.owned) return;
  const consumed = poiStore.consumeResource(selectedPOI.value.id);
  if (!consumed) return;
  const resourceType = selectedPOI.value.category || selectedPOI.value.type;
  const resourceColor = getPOIColor(resourceType);
  startResourceCollection(selectedPOI.value, resourceType, resourceColor);
};

// Manejar cierre del diálogo de POI
const handleClosePOIDialog = () => {
  closeDialog(removeConnectionLine, cancelAttack);
};

// Manejar scan desde el diálogo del marcador
const handleScan = async () => {
  if (!markerRef.value) return;
  
  const position = markerRef.value.getLatLng();
  const radarConfig = getRadarConfig();
  
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
  updateRadarPosition([position.lat, position.lng]);
  updateConnectionLine(selectedPOI.value);
};

const handleMarkerDrag = () => {
  updateMarkerScreenPosition();
  if (markerRef.value) {
    updateRadarPosition(markerRef.value.getLatLng());
  }
  updateConnectionLine(selectedPOI.value);
  updateOwnedConnectionLines(pois.value);
};

// Inicializar mapa
onMounted(() => {
  initMap();
  on('move', updateMarkerScreenPosition);
  on('zoom', updateMarkerScreenPosition);
  on('move', () => updatePOIScreenPosition(selectedPOI.value));
  on('zoom', () => updatePOIScreenPosition(selectedPOI.value));
  on('move', () => updateConnectionLine(selectedPOI.value));
  on('zoom', () => updateConnectionLine(selectedPOI.value));
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
  removeRadar();
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
    
    // Si la base está confirmada, añadir listener de click y crear radar
    if (baseConfirmed.value) {
      onMarker('click', handleMarkerClick);
      createRadar(newMarker);
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
    createRadar(position);
    
    // Añadir listener de click al marcador cuando está confirmado
    onMarker('click', handleMarkerClick);
    
    // No hacer scan automático - el usuario debe hacer clic en "Scan"
  } else {
    removeRadar();
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
      createConnectionLine(poi);
    });
  }
});

// Actualizar posición del diálogo de POI cuando el mapa se mueve
watch(showPOIDialog, (visible) => {
  if (visible) {
    updatePOIScreenPosition(selectedPOI.value);
    // Crear línea de conexión cuando se abre el diálogo
    nextTick(() => {
      createConnectionLine(selectedPOI.value);
    });
  } else {
    // Eliminar línea de conexión cuando se cierra el diálogo
    removeConnectionLine();
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