<template>
  <div class="w-full h-[100vh] overflow-hidden relative">
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
      @close="handleClosePOIDialog"
    />
    <div 
      v-if="isLoading && markerScreenPosition" 
      class="radar-sweep"
      :style="radarSweepStyle"
    >
      <div class="sweep-line"></div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, watch, ref, nextTick, computed } from 'vue';
import { storeToRefs } from 'pinia';
import L from 'leaflet';
import { useMapStore } from '@/stores/mapStore';
import { usePoiStore } from '@/stores/poiStore';
import { useLeafletMap } from '@/composables/useLeafletMap';
import { useMapMarker } from '@/composables/useMapMarker';
import { useRadar } from '@/composables/useRadar';
import { usePointsOfInterest } from '@/composables/usePointsOfInterest';
import { getScreenPosition, createOverlayStyle } from '@/utils/mapHelpers';
import { getRadarConfig } from '@/services/mapService';
import BaseMarker from './BaseMarker.vue';
import MarkerConfirmDialog from './MarkerConfirmDialog.vue';
import BaseMarkerDialog from './BaseMarkerDialog.vue';
import POIDialog from './POIDialog.vue';

const mapStore = useMapStore();
const poiStore = usePoiStore();
const { center, zoom, marker, showMarkerDialog, baseConfirmed, showBaseMarkerDialog } = storeToRefs(mapStore);
const { selectedPOI, showPOIDialog, isLoading } = storeToRefs(poiStore);

// Inicializar composables
const { mapRef, initMap, flyTo, on } = useLeafletMap('map', center.value, zoom.value);
const { markerRef, createMarker, disableDragging, removeMarker, on: onMarker } = useMapMarker(mapRef);
const { radarRef, createRadar, updatePosition: updateRadarPosition, removeRadar } = useRadar(mapRef);
const { clearPOIMarkers } = usePointsOfInterest(mapRef);

const markerScreenPosition = ref(null);
const poiScreenPosition = ref(null);
const connectionLineRef = ref(null);

// Calcular posición en pantalla del marcador
const updateMarkerScreenPosition = () => {
  if (!mapRef.value || !markerRef.value) return;
  markerScreenPosition.value = getScreenPosition(mapRef.value, markerRef.value.getLatLng());
};

// Calcular posición en pantalla del POI seleccionado
const updatePOIScreenPosition = () => {
  if (!mapRef.value || !selectedPOI.value) return;
  poiScreenPosition.value = getScreenPosition(mapRef.value, [selectedPOI.value.lat, selectedPOI.value.lng]);
};

// Estilo del diálogo de confirmación
const dialogStyle = computed(() => {
  if (!markerScreenPosition.value) return {};
  return createOverlayStyle(markerScreenPosition.value);
});

// Estilo del diálogo de POI
const poiDialogStyle = computed(() => {
  if (!poiScreenPosition.value) return {};
  return createOverlayStyle(poiScreenPosition.value);
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

// Manejar cierre del diálogo de POI
const handleClosePOIDialog = () => {
  poiStore.closePOIDialog();
  removeConnectionLine();
};

// Crear línea de conexión entre el marcador base y el POI seleccionado
const createConnectionLine = () => {
  if (!mapRef.value || !markerRef.value || !selectedPOI.value) return;
  
  // Eliminar línea anterior si existe
  removeConnectionLine();
  
  const markerPosition = markerRef.value.getLatLng();
  const poiPosition = [selectedPOI.value.lat, selectedPOI.value.lng];
  const radarConfig = getRadarConfig();
  
  // Crear línea punteada con el color del radar
  connectionLineRef.value = L.polyline(
    [[markerPosition.lat, markerPosition.lng], poiPosition],
    {
      color: radarConfig.color,
      weight: 2,
      opacity: 0.6,
      dashArray: '10, 5',
      className: 'poi-connection-line'
    }
  ).addTo(mapRef.value);
};

// Eliminar línea de conexión
const removeConnectionLine = () => {
  if (connectionLineRef.value) {
    connectionLineRef.value.remove();
    connectionLineRef.value = null;
  }
};

// Actualizar línea de conexión cuando el mapa se mueve o hace zoom
const updateConnectionLine = () => {
  if (showPOIDialog.value && connectionLineRef.value && markerRef.value && selectedPOI.value) {
    const markerPosition = markerRef.value.getLatLng();
    const poiPosition = [selectedPOI.value.lat, selectedPOI.value.lng];
    connectionLineRef.value.setLatLngs([[markerPosition.lat, markerPosition.lng], poiPosition]);
  }
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
  updateConnectionLine();
};

const handleMarkerDrag = () => {
  updateMarkerScreenPosition();
  if (markerRef.value) {
    updateRadarPosition(markerRef.value.getLatLng());
  }
  updateConnectionLine();
};

// Inicializar mapa
onMounted(() => {
  initMap();
  on('move', updateMarkerScreenPosition);
  on('zoom', updateMarkerScreenPosition);
  on('move', updatePOIScreenPosition);
  on('zoom', updatePOIScreenPosition);
  on('move', updateConnectionLine);
  on('zoom', updateConnectionLine);
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
    updatePOIScreenPosition();
    // Actualizar línea de conexión cuando se selecciona un nuevo POI
    nextTick(() => {
      createConnectionLine();
    });
  }
});

// Actualizar posición del diálogo de POI cuando el mapa se mueve
watch(showPOIDialog, (visible) => {
  if (visible) {
    updatePOIScreenPosition();
    // Crear línea de conexión cuando se abre el diálogo
    nextTick(() => {
      createConnectionLine();
    });
  } else {
    // Eliminar línea de conexión cuando se cierra el diálogo
    removeConnectionLine();
  }
});

// Cerrar diálogos al hacer clic en el mapa
const handleMapClick = (e) => {
  // Cerrar el diálogo de POI si está abierto
  if (showPOIDialog.value) {
    // El evento de clic en el mapa se dispara, pero necesitamos verificar que no fue en un POI
    // Los marcadores POI tienen su propio handler que se ejecuta primero
    // Así que si llegamos aquí y el diálogo está abierto, fue un clic en el mapa vacío
    poiStore.closePOIDialog();
  }
  // Cerrar el diálogo de la base si está abierto
  if (showBaseMarkerDialog.value) {
    mapStore.closeBaseMarkerDialog();
  }
};
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