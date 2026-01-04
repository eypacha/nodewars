/**
 * Composable para gestionar el radar en el mapa
 * Maneja la creación, actualización y visualización del radar
 */
import { ref } from 'vue';
import L from 'leaflet';
import { getRadarConfig } from '@/services/mapService';

export const useRadar = (mapRef) => {
  const radarRef = ref(null);

  /**
   * Crea un círculo de radar en el mapa
   * @param {Array} center - Coordenadas del centro [lat, lng]
   * @param {Object} customConfig - Configuración personalizada (opcional)
   * @returns {Object} Referencia al radar
   */
  const createRadar = (center, customConfig = {}) => {
    if (!mapRef.value) {
      console.error('Map not initialized');
      return null;
    }

    // Eliminar radar anterior si existe
    removeRadar();

    // Obtener configuración del radar
    const radarConfig = getRadarConfig();
    const config = { ...radarConfig, ...customConfig };

    // Crear el círculo del radar
    radarRef.value = L.circle(center, {
      color: config.color,
      fillColor: config.color,
      fillOpacity: config.fillOpacity,
      radius: config.radius,
      weight: config.weight,
    }).addTo(mapRef.value);

    return radarRef.value;
  };

  /**
   * Actualiza la posición del radar
   * @param {Array} newCenter - Nuevas coordenadas del centro [lat, lng]
   */
  const updatePosition = (newCenter) => {
    if (!radarRef.value) return;
    radarRef.value.setLatLng(newCenter);
  };

  /**
   * Actualiza el radio del radar
   * @param {number} newRadius - Nuevo radio en metros
   */
  const updateRadius = (newRadius) => {
    if (!radarRef.value) return;
    radarRef.value.setRadius(newRadius);
  };

  /**
   * Actualiza el estilo del radar
   * @param {Object} style - Nuevo estilo (color, fillOpacity, etc.)
   */
  const updateStyle = (style) => {
    if (!radarRef.value) return;
    radarRef.value.setStyle(style);
  };

  /**
   * Obtiene la posición actual del radar
   * @returns {Object} Coordenadas del centro
   */
  const getPosition = () => {
    if (!radarRef.value) return null;
    return radarRef.value.getLatLng();
  };

  /**
   * Obtiene el radio actual del radar
   * @returns {number} Radio en metros
   */
  const getRadius = () => {
    if (!radarRef.value) return null;
    return radarRef.value.getRadius();
  };

  /**
   * Muestra el radar
   */
  const show = () => {
    if (!radarRef.value) return;
    radarRef.value.addTo(mapRef.value);
  };

  /**
   * Oculta el radar
   */
  const hide = () => {
    if (!radarRef.value) return;
    radarRef.value.removeFrom(mapRef.value);
  };

  /**
   * Elimina el radar del mapa
   */
  const removeRadar = () => {
    if (radarRef.value) {
      radarRef.value.remove();
      radarRef.value = null;
    }
  };

  /**
   * Verifica si el radar existe
   * @returns {boolean}
   */
  const hasRadar = () => {
    return radarRef.value !== null;
  };

  /**
   * Añade un evento al radar
   * @param {string} eventName - Nombre del evento
   * @param {Function} handler - Función manejadora
   */
  const on = (eventName, handler) => {
    if (!radarRef.value) return;
    radarRef.value.on(eventName, handler);
  };

  /**
   * Elimina un evento del radar
   * @param {string} eventName - Nombre del evento
   * @param {Function} handler - Función manejadora
   */
  const off = (eventName, handler) => {
    if (!radarRef.value) return;
    radarRef.value.off(eventName, handler);
  };

  return {
    radarRef,
    createRadar,
    updatePosition,
    updateRadius,
    updateStyle,
    getPosition,
    getRadius,
    show,
    hide,
    removeRadar,
    hasRadar,
    on,
    off,
  };
};
