/**
 * Utilidades y funciones auxiliares para el mapa
 */

/**
 * Calcula la posición en pantalla de un punto geográfico
 * @param {Object} map - Instancia del mapa de Leaflet
 * @param {Object} latLng - Coordenadas geográficas
 * @returns {Object} Posición en píxeles {x, y}
 */
export const getScreenPosition = (map, latLng) => {
  if (!map || !latLng) return null;
  const point = map.latLngToContainerPoint(latLng);
  return { x: point.x, y: point.y };
};

/**
 * Crea el estilo para posicionar un elemento sobre el mapa
 * @param {Object} position - Posición en pantalla {x, y}
 * @param {Object} options - Opciones de posicionamiento
 * @returns {Object} Objeto de estilos CSS
 */
export const createOverlayStyle = (position, options = {}) => {
  const {
    offsetX = 0,
    offsetY = -50,
    transform = 'translate(-50%, -100%)',
    zIndex = 1000,
  } = options;

  return {
    position: 'absolute',
    left: `${position.x + offsetX}px`,
    top: `${position.y + offsetY}px`,
    transform,
    zIndex,
  };
};

/**
 * Valida que las coordenadas sean válidas
 * @param {Array} coords - Coordenadas [lat, lng]
 * @returns {boolean}
 */
export const isValidCoordinates = (coords) => {
  if (!Array.isArray(coords) || coords.length !== 2) return false;
  const [lat, lng] = coords;
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

/**
 * Calcula la distancia entre dos puntos geográficos (en metros)
 * Usando la fórmula de Haversine
 * @param {Array} coord1 - Primera coordenada [lat, lng]
 * @param {Array} coord2 - Segunda coordenada [lat, lng]
 * @returns {number} Distancia en metros
 */
export const calculateDistance = (coord1, coord2) => {
  const R = 6371e3; // Radio de la Tierra en metros
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;

  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Formatea las coordenadas para mostrarlas
 * @param {Array} coords - Coordenadas [lat, lng]
 * @param {number} precision - Número de decimales
 * @returns {string}
 */
export const formatCoordinates = (coords, precision = 6) => {
  if (!isValidCoordinates(coords)) return 'Invalid coordinates';
  const [lat, lng] = coords;
  return `${lat.toFixed(precision)}, ${lng.toFixed(precision)}`;
};
