/**
 * Composable para gestionar el mapa de Leaflet
 * Maneja la inicialización, configuración y eventos básicos del mapa
 */
import { ref, onMounted, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getTileLayerConfig, getAnimationConfig } from '@/services/mapService';

export const useLeafletMap = (elementId, initialCenter, initialZoom) => {
  const mapRef = ref(null);
  const isMapReady = ref(false);

  /**
   * Inicializa el mapa de Leaflet
   */
  const initMap = () => {
    if (mapRef.value) return; // Ya está inicializado

    mapRef.value = L.map(elementId, {
      doubleClickZoom: false,
    }).setView(initialCenter, initialZoom);

    const tileConfig = getTileLayerConfig();
    L.tileLayer(tileConfig.url, tileConfig.options).addTo(mapRef.value);

    isMapReady.value = true;
  };

  /**
   * Vuela a una ubicación específica con animación
   * @param {Array} center - Coordenadas [lat, lng]
   * @param {number} zoom - Nivel de zoom
   */
  const flyTo = (center, zoom) => {
    if (!mapRef.value) return;
    const animConfig = getAnimationConfig();
    mapRef.value.flyTo(center, zoom, animConfig.flyTo);
  };

  /**
   * Cambia la vista del mapa sin animación
   * @param {Array} center - Coordenadas [lat, lng]
   * @param {number} zoom - Nivel de zoom
   */
  const setView = (center, zoom) => {
    if (!mapRef.value) return;
    mapRef.value.setView(center, zoom);
  };

  /**
   * Añade un evento al mapa
   * @param {string} eventName - Nombre del evento
   * @param {Function} handler - Función manejadora
   */
  const on = (eventName, handler) => {
    if (!mapRef.value) return;
    mapRef.value.on(eventName, handler);
  };

  /**
   * Elimina un evento del mapa
   * @param {string} eventName - Nombre del evento
   * @param {Function} handler - Función manejadora
   */
  const off = (eventName, handler) => {
    if (!mapRef.value) return;
    mapRef.value.off(eventName, handler);
  };

  /**
   * Convierte coordenadas geográficas a posición en pantalla
   * @param {Object} latLng - Coordenadas geográficas
   * @returns {Object} Posición en píxeles
   */
  const latLngToContainerPoint = (latLng) => {
    if (!mapRef.value) return null;
    return mapRef.value.latLngToContainerPoint(latLng);
  };

  /**
   * Obtiene el centro actual del mapa
   * @returns {Object} Centro del mapa
   */
  const getCenter = () => {
    if (!mapRef.value) return null;
    return mapRef.value.getCenter();
  };

  /**
   * Obtiene el zoom actual del mapa
   * @returns {number} Nivel de zoom
   */
  const getZoom = () => {
    if (!mapRef.value) return null;
    return mapRef.value.getZoom();
  };

  /**
   * Destruye el mapa
   */
  const destroy = () => {
    if (mapRef.value) {
      mapRef.value.remove();
      mapRef.value = null;
      isMapReady.value = false;
    }
  };

  return {
    mapRef,
    isMapReady,
    initMap,
    flyTo,
    setView,
    on,
    off,
    latLngToContainerPoint,
    getCenter,
    getZoom,
    destroy,
  };
};
