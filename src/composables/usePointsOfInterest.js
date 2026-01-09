/**
 * Composable para gestionar puntos de interés en el mapa
 * Maneja la creación, actualización y visualización de POIs
 */
import { ref, watch, createApp } from 'vue';
import L from 'leaflet';
import { storeToRefs } from 'pinia';
import { usePoiStore } from '@/stores/poiStore';
import { getPOIConfig } from '@/services/mapService';
import BarracksMarker from '@/components/BarracksMarker.vue';

export const usePointsOfInterest = (mapRef) => {
  const poiStore = usePoiStore();
  const { pois, selectedPOI, showPOIDialog } = storeToRefs(poiStore);
  
  const poiMarkers = ref([]);

  const applySelectionStyle = (marker, poi, isSelected) => {
    if (!marker || !poi) return;

    if (poi.type === 'barrack') return;

    if (marker.setStyle) {
      const config = getPOIConfig();
      marker.setStyle({
        weight: isSelected ? config.weight + 2 : config.weight,
        color: isSelected ? '#ffffff' : poi.color,
      });
    }
  };

  /**
   * Crea marcadores visuales para todos los POIs
   */
  const createPOIMarkers = () => {
    console.log('🗺️ createPOIMarkers called, POIs count:', pois.value.length);
    // Limpiar marcadores anteriores
    clearPOIMarkers();

    if (!mapRef.value) {
      console.log('⚠️ mapRef not available');
      return;
    }

    const config = getPOIConfig();

    // Crear un marcador circular para cada POI
    pois.value.forEach((poi) => {
      let marker;
      
      // Si el POI es un barrack, usar BarracksMarker
      if (poi.type === 'barrack') {
        const container = document.createElement('div');
        const app = createApp(BarracksMarker, { isEnemy: !poi.owned });
        app.mount(container);

        const customIcon = L.divIcon({
          html: container.innerHTML,
          className: 'barracks-marker-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        marker = L.marker([poi.lat, poi.lng], {
          icon: customIcon,
        }).addTo(mapRef.value);

        app.unmount();
      } else {
        // POI normal - usar círculo
        marker = L.circleMarker([poi.lat, poi.lng], {
          radius: config.radius,
          fillColor: poi.color,
          color: poi.color,
          weight: config.weight,
          opacity: config.opacity,
          fillOpacity: config.fillOpacity,
          className: config.className,
        }).addTo(mapRef.value);

        // Cambiar cursor al pasar sobre el POI (solo para círculos)
        marker.on('mouseover', function() {
          this.setStyle({
            radius: config.radius * 1.5,
            weight: config.weight + 1,
          });
        });

        marker.on('mouseout', function() {
          this.setStyle({
            radius: config.radius,
            weight: config.weight,
          });
        });
      }

      // Añadir evento de click para mostrar el diálogo
      marker.on('click', (e) => {
        // Prevenir que el evento se propague al mapa
        L.DomEvent.stopPropagation(e);
        poiStore.selectPOI(poi.id);
      });

      poiMarkers.value.push({
        id: poi.id,
        marker,
      });
    });

    // Reaplicar estilo de selección al recrear marcadores
    if (selectedPOI.value) {
      const marker = getMarkerById(selectedPOI.value.id);
      applySelectionStyle(marker, selectedPOI.value, true);
    }
    
    console.log('✅ Created', poiMarkers.value.length, 'POI markers on map');
  };

  /**
   * Elimina todos los marcadores POI del mapa
   */
  const clearPOIMarkers = () => {
    poiMarkers.value.forEach(({ marker }) => {
      marker.remove();
    });
    poiMarkers.value = [];
  };

  /**
   * Actualiza los marcadores cuando cambian los POIs en el store
   */
  watch(pois, (newPois) => {
    console.log('👀 POIs watcher triggered, count:', newPois.length);
    createPOIMarkers();
  }, { deep: true });

  watch(selectedPOI, (poi, prevPoi) => {
    if (prevPoi) {
      const prevMarker = getMarkerById(prevPoi.id);
      applySelectionStyle(prevMarker, prevPoi, false);
    }
    if (poi) {
      const marker = getMarkerById(poi.id);
      applySelectionStyle(marker, poi, true);
    }
  });

  watch(showPOIDialog, (visible) => {
    if (!visible && selectedPOI.value) {
      const marker = getMarkerById(selectedPOI.value.id);
      applySelectionStyle(marker, selectedPOI.value, true);
    }
  });

  /**
   * Obtiene un marcador por ID de POI
   * @param {number} poiId - ID del POI
   * @returns {Object} Marcador de Leaflet
   */
  const getMarkerById = (poiId) => {
    const found = poiMarkers.value.find(({ id }) => id === poiId);
    return found?.marker;
  };

  /**
   * Resalta un POI específico
   * @param {number} poiId - ID del POI
   */
  const highlightPOI = (poiId) => {
    const marker = getMarkerById(poiId);
    if (marker) {
      marker.setStyle({
        radius: 10,
        weight: 4,
      });
      marker.openTooltip();
    }
  };

  /**
   * Quita el resaltado de un POI
   * @param {number} poiId - ID del POI
   */
  const unhighlightPOI = (poiId) => {
    const marker = getMarkerById(poiId);
    const config = getPOIConfig();
    if (marker) {
      marker.setStyle({
        radius: config.radius,
        weight: config.weight,
      });
      marker.closeTooltip();
    }
  };

  /**
   * Centra el mapa en un POI específico
   * @param {number} poiId - ID del POI
   * @param {number} zoom - Nivel de zoom (opcional)
   */
  const focusOnPOI = (poiId, zoom) => {
    const marker = getMarkerById(poiId);
    if (marker && mapRef.value) {
      const latLng = marker.getLatLng();
      if (zoom) {
        mapRef.value.setView(latLng, zoom);
      } else {
        mapRef.value.panTo(latLng);
      }
      marker.openTooltip();
    }
  };

  return {
    poiMarkers,
    createPOIMarkers,
    clearPOIMarkers,
    getMarkerById,
    highlightPOI,
    unhighlightPOI,
    focusOnPOI,
  };
};
