export const POI_TYPES = {
  food: {
    displayName: 'Supply Node',
    emoji: '🍽️',
    color: '#FF8C42',
    normalizeKeys: ['food', 'restaurant', 'fast_food', 'supermarket'],
  },
  pharmacy: {
    displayName: 'Med Unit',
    emoji: '💊',
    color: '#4CAF50',
    normalizeKeys: ['pharmacy'],
  },
  fuel: {
    displayName: 'Energy Depot',
    emoji: '⛽',
    color: '#ae0e89ff',
    normalizeKeys: ['fuel'],
  },
  bank: {
    displayName: 'Credit Core',
    emoji: '🏦',
    color: '#FFD700',
    normalizeKeys: ['bank'],
  },
  police: {
    displayName: 'Security',
    emoji: '👮',
    color: '#1E90FF',
    normalizeKeys: ['police'],
  },
  barrack: {
    displayName: 'Barracks',
    emoji: '🏰',
    color: '#9ca3af',
    normalizeKeys: ['barrack'],
  },
};

const DEFAULT_POI_TYPE = {
  displayName: 'POI',
  emoji: '📍',
  color: '#95a5a6',
  normalizeKeys: [],
};

const normalizationMap = Object.entries(POI_TYPES).reduce((map, [type, config]) => {
  (config.normalizeKeys || []).forEach((key) => {
    map[key] = type;
  });
  map[type] = type;
  return map;
}, {});

export const normalizePOICategory = (type = '') => normalizationMap[type] || type;

const getPOITypeConfig = (type) => {
  const normalized = normalizePOICategory(type);
  return POI_TYPES[normalized] || DEFAULT_POI_TYPE;
};

export const getPOIColor = (type) => getPOITypeConfig(type).color;

export const getPOIDisplayName = (type) => getPOITypeConfig(type).displayName || type;

export const getPOIEmoji = (type) => getPOITypeConfig(type).emoji;

export const RESOURCE_POI_TYPES = Object.keys(POI_TYPES).filter((type) => type !== 'barrack');
