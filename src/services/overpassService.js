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
  return `
    [out:json][timeout:25];
    (
      node["amenity"~"restaurant|fast_food|supermarket"](around:${radius},${lat},${lng});
    );
    out body;
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
  try {
    const query = buildOverpassQuery(lat, lng, radius);
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      body: `data=${encodeURIComponent(query)}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Transformar los datos en un formato más manejable
    return data.elements.map((element) => ({
      id: element.id,
      lat: element.lat,
      lng: element.lon,
      type: element.tags?.amenity || element.tags?.shop || element.tags?.tourism || element.tags?.leisure || 'unknown',
      name: element.tags?.name || 'Sin nombre',
      tags: element.tags,
    }));
  } catch (error) {
    console.error('Error fetching POIs from Overpass API:', error);
    return [];
  }
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
 * Categoriza un POI y devuelve un color representativo
 * @param {string} type - Tipo de POI
 * @returns {string} Color hexadecimal
 */
export const getPOIColor = (type) => {
  const colorMap = {
    restaurant: '#ff6b6b',
    cafe: '#a55eea',
    bar: '#fd79a8',
    fast_food: '#fdcb6e',
    pub: '#e17055',
    supermarket: '#00b894',
    convenience: '#00cec9',
    mall: '#0984e3',
    attraction: '#feca57',
    museum: '#ff9ff3',
    hotel: '#48dbfb',
    viewpoint: '#54a0ff',
    park: '#26de81',
    playground: '#fed330',
    sports_centre: '#fc5c65',
    unknown: '#95afc0',
  };

  return colorMap[type] || colorMap.unknown;
};
