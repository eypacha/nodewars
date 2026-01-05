/**
 * Composable unificado para gestionar el radar de ataque
 * Controla el radar del centro de ataque (base o cuartel)
 * Solo debe haber un radar visible al mismo tiempo
 */
import { ref, computed } from 'vue';
import L from 'leaflet';
import { getRadarConfig } from '@/services/mapService';

export const useAttackRadar = (mapRef) => {
  const radarRef = ref(null);
  const attackCenterRef = ref(null); // Centro de ataque actual (base o cuartel)

  // Radio del radar de cuartel (menor que el de la base)
  const BARRACKS_RADAR_RADIUS = 500; // metros

  /**
   * Obtiene la configuración del radar según el tipo de centro
   * @param {Object} center - Centro de ataque {lat, lng, type, level}
   * @returns {Object} Configuración del radar
   */
  const getRadarConfigForCenter = (center) => {
    if (!center) return null;

    if (center.type === 'barrack') {
      // Radar de cuartel: radio fijo de 500m
      return {
        color: '#00bcff',
        fillColor: '#00bcff',
        fillOpacity: 0.08,
        radius: BARRACKS_RADAR_RADIUS,
        weight: 2,
      };
    } else if (center.type === 'base') {
      // Radar de base: usa el nivel del radar
      const radarConfig = getRadarConfig(center.level);
      return {
        color: radarConfig.color,
        fillColor: radarConfig.color,
        fillOpacity: radarConfig.fillOpacity,
        radius: radarConfig.radius,
        weight: radarConfig.weight,
      };
    }

    return null;
  };

  /**
   * Crea o actualiza el radar del centro de ataque
   * @param {Object} center - Centro de ataque {lat, lng, type, level}
   */
  const createRadar = (center) => {
    if (!mapRef.value || !center) return;

    // Eliminar radar anterior
    removeRadar();

    // Guardar referencia al centro actual
    attackCenterRef.value = center;

    // Obtener configuración
    const config = getRadarConfigForCenter(center);
    if (!config) return;

    // Crear el radar
    radarRef.value = L.circle([center.lat, center.lng], {
      color: config.color,
      fillColor: config.fillColor,
      fillOpacity: config.fillOpacity,
      radius: config.radius,
      weight: config.weight,
    }).addTo(mapRef.value);
  };

  /**
   * Actualiza la posición del radar
   * @param {Array} newCenter - Nuevas coordenadas [lat, lng]
   */
  const updatePosition = (newCenter) => {
    if (!radarRef.value) return;
    radarRef.value.setLatLng(newCenter);
  };

  /**
   * Actualiza el radio del radar (cuando se mejora el nivel)
   * @param {number} newRadius - Nuevo radio en metros
   */
  const updateRadius = (newRadius) => {
    if (!radarRef.value || !attackCenterRef.value) return;
    
    // Solo actualizar si es la base (el cuartel siempre tiene radio fijo)
    if (attackCenterRef.value.type === 'base') {
      radarRef.value.setRadius(newRadius);
    }
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
   * Obtiene el centro de ataque actual
   * @returns {Object} Centro de ataque
   */
  const getAttackCenter = () => {
    return attackCenterRef.value;
  };

  /**
   * Verifica si hay un centro de ataque activo
   * @returns {boolean}
   */
  const hasActiveRadar = () => {
    return radarRef.value !== null && attackCenterRef.value !== null;
  };

  /**
   * Elimina el radar
   */
  const removeRadar = () => {
    if (radarRef.value) {
      radarRef.value.remove();
      radarRef.value = null;
    }
    attackCenterRef.value = null;
  };

  /**
   * Muestra el radar
   */
  const show = () => {
    if (!radarRef.value || !mapRef.value) return;
    radarRef.value.addTo(mapRef.value);
  };

  /**
   * Oculta el radar
   */
  const hide = () => {
    if (!radarRef.value) return;
    radarRef.value.remove();
  };

  /**
   * Obtiene los datos del radar actual para cálculos
   * @returns {Object} {position: {lat, lng}, radius}
   */
  const getRadarData = () => {
    if (!radarRef.value) return null;
    return {
      position: radarRef.value.getLatLng(),
      radius: radarRef.value.getRadius(),
    };
  };

  return {
    // Estado
    radarRef,
    attackCenterRef,

    // Métodos
    createRadar,
    updatePosition,
    updateRadius,
    removeRadar,
    show,
    hide,
    getRadius,
    getAttackCenter,
    hasActiveRadar,
    getRadarData,
    getRadarConfigForCenter,
  };
};
