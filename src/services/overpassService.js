/**
 * Servicio para consultar puntos de interés usando Overpass API
 * Overpass API permite consultar datos de OpenStreetMap
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

/**
 * Construye una query Overpass QL para obtener POIs en un área circular
 * @param {number} lat - Latitud del centro
 * @param {number} lng - Longitud del centro
 * @param {number} radius - Radio en metros
 * @returns {string} Query en formato Overpass QL
 */
const buildOverpassQuery = (lat, lng, radius) => {
  // Consultar varios tipos de POIs populares
  // Buscar tanto nodes como ways para obtener más resultados
  return `
    [out:json][timeout:25];
    (
      node["amenity"~"restaurant|fast_food|supermarket|pharmacy|fuel|bank|police"](around:${radius},${lat},${lng});
      way["amenity"~"restaurant|fast_food|supermarket|pharmacy|fuel|bank|police"](around:${radius},${lat},${lng});
    );
    out center;
  `;

};

/**
 * Obtiene puntos de interés cercanos a una ubicación
 * @param {number} lat - Latitud del centro
 * @param {number} lng - Longitud del centro
 * @param {number} radius - Radio en metros
 * @returns {Promise<Array>} Array de POIs con sus datos
 */
export const fetchPointsOfInterest = async (lat, lng, radius) => {
  const query = buildOverpassQuery(lat, lng, radius);
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain'
    },
    body: query
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const data = await response.json();
  
  // Transformar los datos en un formato más manejable
  // Manejar tanto nodes (con lat/lon directos) como ways (con center)
  return data.elements.map((element) => {
    const lat = element.lat || element.center?.lat;
    const lng = element.lon || element.center?.lon;
    
    if (!lat || !lng) return null;
    
    const rawType = element.tags?.amenity || element.tags?.shop || element.tags?.tourism || element.tags?.leisure || 'unknown';
    const category = normalizePOICategory(rawType);
    
    return {
      id: element.id,
      lat,
      lng,
      type: rawType, // Mantener el tipo original para mostrar
      category: category, // Categoría normalizada para agrupación
      name: element.tags?.name || 'Sin nombre',
      tags: element.tags,
    };
  }).filter(Boolean);
};

/**
 * Filtra POIs que están dentro de un radio específico
 * @param {Array} pois - Array de POIs
 * @param {Object} center - Centro {lat, lng}
 * @param {number} radius - Radio en metros
 * @returns {Array} POIs filtrados
 */
export const filterPOIsInRadius = (pois, center, radius) => {
  return pois.filter((poi) => {
    const distance = calculateDistance([center.lat, center.lng], [poi.lat, poi.lng]);
    return distance <= radius;
  });
};

/**
 * Calcula la distancia entre dos puntos geográficos (Haversine)
 * @param {Array} coord1 - Primera coordenada [lat, lng]
 * @param {Array} coord2 - Segunda coordenada [lat, lng]
 * @returns {number} Distancia en metros
 */
const calculateDistance = (coord1, coord2) => {
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
 * Normaliza el tipo de POI a una categoría
 * @param {string} type - Tipo de POI
 * @returns {string} Categoría normalizada
 */
const normalizePOICategory = (type) => {
  // Agrupar fastfood, restaurant, supermarket en la categoría "food"
  if (type === 'restaurant' || type === 'fast_food' || type === 'supermarket') {
    return 'food';
  }
  // Police category stays as is
  if (type === 'police') {
    return 'police';
  }
  // Otros tipos mantienen su nombre
  return type;
};

/**
 * Categoriza un POI y devuelve un color representativo
 * @param {string} type - Tipo de POI (puede ser tipo original o categoría)
 * @returns {string} Color hexadecimal
 */
export const getPOIColor = (type) => {
  // Si ya es una categoría normalizada, usarla directamente
  // Si no, normalizarla
  const category = ['food', 'pharmacy', 'fuel', 'bank', 'police'].includes(type) 
    ? type 
    : normalizePOICategory(type);
  
  const colorMap = {
    food: '#FF8C42',      // Naranja para comida
    pharmacy: '#4CAF50',  // Verde para farmacia/medicina
    fuel: '#E74C3C',      // Rojo para combustible
    bank: '#FFD700',      // Amarillo/oro para banco/dinero
    police: '#1E90FF',    // Celeste para comisarías
  };

  return colorMap[category] || '#95a5a6'; // Gris por defecto para tipos desconocidos
};
