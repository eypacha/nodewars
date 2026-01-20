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
import POIMarker from '@/components/POIMarker.vue';

export const usePointsOfInterest = (mapRef) => {
  const poiStore = usePoiStore();
  const { pois, selectedPOI, showPOIDialog } = storeToRefs(poiStore);
  
  const poiMarkers = ref([]);

  const getMarkerEntryById = (poiId) => poiMarkers.value.find(({ id }) => id === poiId);

  const createAutoExtractRing = (poi, config) => {
    if (!mapRef.value) return null;
    return L.circleMarker([poi.lat, poi.lng], {
      radius: config.radius + 4,
      color: poi.color,
      weight: 1,
      opacity: 1,
      fillOpacity: 0,
      className: config.className,
      interactive: false,
      bubblingMouseEvents: false,
    }).addTo(mapRef.value);
  };

  const applyAutoExtractStyle = (entry, poi) => {
    if (!entry || !poi) return;

    if (poi.type === 'barrack') return;

    const config = getPOIConfig();
    // For circleMarkers we can use setStyle; for div-based markers update DOM styles
    if (entry.marker?.setStyle) {
      entry.marker.setStyle({
        weight: config.weight,
        color: poi.color,
      });
    } else if (entry.marker?.getElement) {
      const el = entry.marker.getElement();
      if (el) {
        el.style.borderColor = poi.color;
        const svg = el.querySelector('svg');
        if (svg) svg.style.color = poi.color;
      }
    }

    const hasAutoExtract = !!poi.autoExtract;
    if (hasAutoExtract && !entry.ringMarker) {
      entry.ringMarker = createAutoExtractRing(poi, config);
    } else if (!hasAutoExtract && entry.ringMarker) {
      entry.ringMarker.remove();
      entry.ringMarker = null;
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

    // Crear un marcador visual para cada POI
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
          zIndexOffset: 100,
        }).addTo(mapRef.value);

        app.unmount();
      } else {
        // POI normal - usar componente POIMarker (SVG placeholder)
        const container = document.createElement('div');
        const app = createApp(POIMarker, {
          iconColor: poi.color,
          background: '#000',
          border: poi.color,
        });
        app.mount(container);

        const customIcon = L.divIcon({
          html: container.innerHTML,
          className: 'poi-marker',
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        marker = L.marker([poi.lat, poi.lng], {
          icon: customIcon,
          zIndexOffset: 50,
        }).addTo(mapRef.value);

        // Hover handled by CSS (.poi-marker) to preserve Leaflet positioning

        app.unmount();
      }

      // Añadir evento de click para mostrar el diálogo
      marker.on('click', (e) => {
        // Prevenir que el evento se propague al mapa
        L.DomEvent.stopPropagation(e);
        poiStore.selectPOI(poi.id);
      });

      const entry = {
        id: poi.id,
        marker,
        ringMarker: null,
      };

      if (poi.type !== 'barrack' && poi.autoExtract) {
        entry.ringMarker = createAutoExtractRing(poi, config);
      }

      poiMarkers.value.push(entry);
    });

    // Reaplicar estilo de selección al recrear marcadores
    if (selectedPOI.value) {
      const entry = getMarkerEntryById(selectedPOI.value.id);
      applyAutoExtractStyle(entry, selectedPOI.value);
    }
    
    console.log('✅ Created', poiMarkers.value.length, 'POI markers on map');
  };

  /**
   * Elimina todos los marcadores POI del mapa
   */
  const clearPOIMarkers = () => {
    poiMarkers.value.forEach(({ marker, ringMarker }) => {
      marker.remove();
      if (ringMarker) ringMarker.remove();
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
      const prevEntry = getMarkerEntryById(prevPoi.id);
      applyAutoExtractStyle(prevEntry, prevPoi);
    }
    if (poi) {
      const entry = getMarkerEntryById(poi.id);
      applyAutoExtractStyle(entry, poi);
    }
  });

  watch(showPOIDialog, (visible) => {
    if (!visible && selectedPOI.value) {
      const entry = getMarkerEntryById(selectedPOI.value.id);
      applyAutoExtractStyle(entry, selectedPOI.value);
    }
  });

  /**
   * Obtiene un marcador por ID de POI
   * @param {number} poiId - ID del POI
   * @returns {Object} Marcador de Leaflet
   */
  const getMarkerById = (poiId) => {
    const found = getMarkerEntryById(poiId);
    return found?.marker;
  };

  /**
   * Resalta un POI específico
   * @param {number} poiId - ID del POI
   */
  const highlightPOI = (poiId) => {
    const marker = getMarkerById(poiId);
      if (marker) {
      if (marker.setStyle) {
        marker.setStyle({ radius: 10, weight: 4 });
      } else if (marker.getElement) {
        const el = marker.getElement();
        if (el) {
          el.style.transform = 'translate(-50%, -50%) scale(1.35)';
          el.style.zIndex = 9999;
          el.style.filter = 'drop-shadow(0 0 6px rgba(255,255,255,0.6))';
        }
      }
      if (marker.openTooltip) marker.openTooltip();
    }
  };

  /**
   * Quita el resaltado de un POI
   * @param {number} poiId - ID del POI
   */
  const unhighlightPOI = (poiId) => {
    const entry = getMarkerEntryById(poiId);
    const config = getPOIConfig();
    const poi = pois.value.find((item) => item.id === poiId);
    if (entry?.marker) {
      if (!poi) {
        if (entry.marker.setStyle) {
          entry.marker.setStyle({ radius: config.radius, weight: config.weight });
        } else if (entry.marker.getElement) {
          const el = entry.marker.getElement();
          if (el) {
              el.style.transform = 'translate(-50%, -50%)';
              el.style.zIndex = '';
              el.style.filter = '';
            }
        }
        if (entry.marker.closeTooltip) entry.marker.closeTooltip();
        return;
      }
      if (entry.marker.setStyle) {
        entry.marker.setStyle({ radius: config.radius, weight: config.weight, color: poi.color });
      } else if (entry.marker.getElement) {
        const el = entry.marker.getElement();
        if (el) {
          el.style.transform = 'translate(-50%, -50%)';
          el.style.zIndex = '';
          el.style.filter = '';
          el.style.borderColor = poi.color;
          const svg = el.querySelector('svg');
          if (svg) svg.style.color = poi.color;
        }
      }
      if (entry.marker.closeTooltip) entry.marker.closeTooltip();
      applyAutoExtractStyle(entry, poi);
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
