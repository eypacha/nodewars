/**
 * Composable para gestionar marcadores en el mapa
 * Maneja la creación, actualización y eventos de marcadores
 */
import { ref, createApp } from 'vue';
import L from 'leaflet';
import { getMarkerConfig } from '@/services/mapService';

export const useMapMarker = (mapRef) => {
  const markerRef = ref(null);

  /**
   * Crea un marcador en el mapa
   * @param {Array} position - Coordenadas [lat, lng]
   * @param {Object} markerComponent - Componente Vue para el marcador
   * @param {Object} options - Opciones adicionales
   * @returns {Object} Referencia al marcador
   */
  const createMarker = (position, markerComponent, options = {}) => {
    if (!mapRef.value) {
      console.error('Map not initialized');
      return null;
    }

    // Eliminar marcador anterior si existe
    removeMarker();

    // Crear el contenedor del marcador
    const container = document.createElement('div');
    const app = createApp(markerComponent, options.componentProps || {});
    app.mount(container);

    // Configuración del icono
    const markerConfig = getMarkerConfig();
    const customIcon = L.divIcon({
      html: container.innerHTML,
      className: markerConfig.className,
      iconSize: markerConfig.iconSize,
      iconAnchor: markerConfig.iconAnchor,
    });

    // Crear el marcador
    markerRef.value = L.marker(position, {
      icon: customIcon,
      draggable: options.draggable !== undefined ? options.draggable : true,
    }).addTo(mapRef.value);

    // Desmontar la app temporal
    app.unmount();

    return markerRef.value;
  };

  /**
   * Actualiza la posición del marcador
   * @param {Array} newPosition - Nuevas coordenadas [lat, lng]
   */
  const updatePosition = (newPosition) => {
    if (!markerRef.value) return;
    markerRef.value.setLatLng(newPosition);
  };

  /**
   * Obtiene la posición actual del marcador
   * @returns {Object} Coordenadas del marcador
   */
  const getPosition = () => {
    if (!markerRef.value) return null;
    return markerRef.value.getLatLng();
  };

  /**
   * Añade un evento al marcador
   * @param {string} eventName - Nombre del evento (drag, dragend, click, etc.)
   * @param {Function} handler - Función manejadora
   */
  const on = (eventName, handler) => {
    if (!markerRef.value) return;
    markerRef.value.on(eventName, handler);
  };

  /**
   * Elimina un evento del marcador
   * @param {string} eventName - Nombre del evento
   * @param {Function} handler - Función manejadora
   */
  const off = (eventName, handler) => {
    if (!markerRef.value) return;
    markerRef.value.off(eventName, handler);
  };

  /**
   * Habilita el arrastre del marcador
   */
  const enableDragging = () => {
    if (!markerRef.value || !markerRef.value.dragging) return;
    markerRef.value.dragging.enable();
  };

  /**
   * Deshabilita el arrastre del marcador
   */
  const disableDragging = () => {
    if (!markerRef.value || !markerRef.value.dragging) return;
    markerRef.value.dragging.disable();
  };

  /**
   * Elimina el marcador del mapa
   */
  const removeMarker = () => {
    if (markerRef.value) {
      markerRef.value.remove();
      markerRef.value = null;
    }
  };

  /**
   * Verifica si el marcador existe
   * @returns {boolean}
   */
  const hasMarker = () => {
    return markerRef.value !== null;
  };

  /**
   * Actualiza el icono del marcador manteniendo la posición
   * @param {Object} markerComponent - Componente Vue para el marcador
   * @param {Object} options - Opciones adicionales
   */
  const updateIcon = (markerComponent, options = {}) => {
    if (!markerRef.value) return;

    const container = document.createElement('div');
    const app = createApp(markerComponent, options.componentProps || {});
    app.mount(container);

    const markerConfig = getMarkerConfig();
    const customIcon = L.divIcon({
      html: container.innerHTML,
      className: markerConfig.className,
      iconSize: markerConfig.iconSize,
      iconAnchor: markerConfig.iconAnchor,
    });

    markerRef.value.setIcon(customIcon);
    app.unmount();
  };

  return {
    markerRef,
    createMarker,
    updatePosition,
    getPosition,
    on,
    off,
    enableDragging,
    disableDragging,
    removeMarker,
    hasMarker,
    updateIcon,
  };
};
