/**
 * Servicio de configuración del mapa
 * Contiene constantes y configuraciones centralizadas
 */

export const MAP_CONFIG = {
  // Configuración de tiles
  TILE_LAYER: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    options: {
      attribution: '',
      subdomains: 'abcd',
      maxZoom: 19,
    },
  },

  // Configuración del radar
  RADAR: {
    radius: 1000, // metros
    color: '#00bcff',
    fillOpacity: 0.1,
    weight: 2,
  },

  // Configuración del marcador
  MARKER: {
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    className: 'custom-marker',
  },

  // Configuración de animaciones
  ANIMATION: {
    flyTo: {
      animate: true,
      duration: 1.5,
    },
  },

  // Configuración inicial
  INITIAL: {
    center: [20, 0],
    zoom: 3,
  },

  // Configuración de puntos de interés (POI)
  POI: {
    radius: 6, // Radio del círculo en píxeles
    weight: 2,
    fillOpacity: 0.7,
    opacity: 1,
    className: 'poi-marker',
  },
};

/**
 * Obtener configuración del tile layer
 */
export const getTileLayerConfig = () => MAP_CONFIG.TILE_LAYER;

/**
 * Obtener configuración del radar
 */
export const getRadarConfig = () => MAP_CONFIG.RADAR;


/**
 * Obtener configuración de puntos de interés
 */
export const getPOIConfig = () => MAP_CONFIG.POI;
/**
 * Obtener configuración del marcador
 */
export const getMarkerConfig = () => MAP_CONFIG.MARKER;

/**
 * Obtener configuración de animaciones
 */
export const getAnimationConfig = () => MAP_CONFIG.ANIMATION;
