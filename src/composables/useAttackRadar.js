/**
 * Composable unificado para gestionar el radar de ataque
 * Controla el radar del centro de ataque (base o cuartel)
 * Solo debe haber un radar visible al mismo tiempo
 */

import { ref } from 'vue';
import L from 'leaflet';
import { getRadarConfig } from '@/services/mapService';
import { computePointOnEdge } from '@/utils/mathUtils';

export const useAttackRadar = (mapRef) => {
  const radarRef = ref(null);
  const radialLineRef = ref(null);
  const radialLabelRef = ref(null);
  const zoomListenerRef = ref(null);
  const attackCenterRef = ref(null); // Centro de ataque actual (base o cuartel)
  const BASE_RADAR_COLOR = getRadarConfig().color;
  const ENEMY_RADAR_COLOR = '#ff4d4f';

  // Múltiples radares de barraca (inactivos)
  const barracksRadarRefs = ref([]); // [{circle, poiId}]

  // Radio del radar de cuartel (menor que el de la base)
  const BARRACKS_RADAR_RADIUS = 500; // metros

  /**
   * Obtiene la configuración del radar según el tipo de centro
   * @param {Object} center - Centro de ataque {lat, lng, type, level}
   * @returns {Object} Configuración del radar
   */
  const getRadarConfigForCenter = (center, isActive = true) => {
    if (!center) return null;

    if (center.type === 'barrack') {
      const color = center.isEnemy ? ENEMY_RADAR_COLOR : BASE_RADAR_COLOR;
      if (isActive) {
        // Radar de cuartel ACTIVO (más sólido)
        return {
          color,
          fillColor: color,
          fillOpacity: 0.2,
          radius: BARRACKS_RADAR_RADIUS,
          weight: 2,
        };
      } else {
        // Radar de cuartel INACTIVO (más tenue)
        return {
          color,
          fillColor: color,
          fillOpacity: 0.08,
          radius: BARRACKS_RADAR_RADIUS,
          weight: 1,
        };
      }
    } else if (center.type === 'base') {
      // Radar de base: usa el nivel del radar pero mantiene opacidad consistente con barracas
      const radarConfig = getRadarConfig(center.level);
      const ACTIVE_OPACITY = 0.2;
      const INACTIVE_OPACITY = 0.08;
      return {
        color: radarConfig.color,
        fillColor: radarConfig.color,
        fillOpacity: isActive ? ACTIVE_OPACITY : INACTIVE_OPACITY,
        radius: radarConfig.radius,
        weight: isActive ? radarConfig.weight : 1,
      };
    }

    return null;
  };

  const formatRadiusText = (radius) => {
    if (!radius) return '';
    if (radius < 1000) return `${Math.round(radius)} m`;
    return `${(radius / 1000).toFixed(1)} km`;
  };

  const renderLabel = (center, radius) => {
    if (!mapRef.value) return;

    const zoom = typeof mapRef.value.getZoom === 'function' ? mapRef.value.getZoom() : 0;
    if (zoom < 14) {
      if (radialLabelRef.value) {
        radialLabelRef.value.remove();
        radialLabelRef.value = null;
      }
      return;
    }

    const midPoint = computePointOnEdge({ lat: center.lat, lng: center.lng }, radius / 2, Math.PI / 2);
    const labelText = formatRadiusText(radius);
    const icon = L.divIcon({
      className: 'radar-radius-label',
      html: `<div style="color: white; font-size: 12px; font-weight: bold; text-shadow: 0 0 4px rgba(0,0,0,0.8); white-space: nowrap;">${labelText}</div>`,
      iconSize: [0, 0],
    });

    if (radialLabelRef.value) {
      radialLabelRef.value.setLatLng([midPoint.lat, midPoint.lng]);
      radialLabelRef.value.setIcon(icon);
    } else {
      radialLabelRef.value = L.marker([midPoint.lat, midPoint.lng], {
        interactive: false,
        bubblingMouseEvents: false,
        icon,
      }).addTo(mapRef.value);
    }
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
    const config = getRadarConfigForCenter(center, true);
    if (!config) return;

    // Crear el radar principal (activo)
    radarRef.value = L.circle([center.lat, center.lng], {
      color: config.color,
      fillColor: config.fillColor,
      fillOpacity: config.fillOpacity,
      radius: config.radius,
      weight: config.weight,
      interactive: false,
      bubblingMouseEvents: false,
    }).addTo(mapRef.value);

    // Línea radial punteada desde el centro hacia el borde derecho (este)
    const endPoint = computePointOnEdge({ lat: center.lat, lng: center.lng }, config.radius, Math.PI / 2);
    radialLineRef.value = L.polyline(
      [
        [center.lat, center.lng],
        [endPoint.lat, endPoint.lng],
      ],
      {
        color: config.color,
        weight: config.weight,
        opacity: 0.8,
        dashArray: '6 6',
        interactive: false,
        bubblingMouseEvents: false,
      }
    ).addTo(mapRef.value);

    renderLabel(center, config.radius);

    // Re-renderizar etiqueta al cambiar zoom
    const zoomHandler = () => {
      const currentCenter = radarRef.value?.getLatLng();
      if (!currentCenter || !radarRef.value) return;
      renderLabel({ lat: currentCenter.lat, lng: currentCenter.lng }, radarRef.value.getRadius());
    };
    mapRef.value.on('zoom', zoomHandler);
    zoomListenerRef.value = zoomHandler;
  };

  /**
   * Renderiza todos los radares de barracas (incluso inactivos)
   * @param {Array} barracksList - Array de POIs tipo barrack {lat, lng, id, radarActive}
   * @param {String|Number} activeId - id de la barraca activa (opcional)
   */
  const renderAllBarracksRadars = (barracksList, activeId = null, baseCenter = null) => {
    // Eliminar todos los radares previos
    barracksRadarRefs.value.forEach(obj => obj.circle.remove());
    barracksRadarRefs.value = [];
    if (!mapRef.value || !Array.isArray(barracksList)) return;

    // Radar pasivo de la base si existe y no es el activo
    if (baseCenter && activeId !== 'base') {
      const baseConfig = getRadarConfigForCenter(baseCenter, false);
      if (baseConfig) {
        const baseCircle = L.circle([baseCenter.lat, baseCenter.lng], {
          color: baseConfig.color,
          fillColor: baseConfig.fillColor,
          fillOpacity: baseConfig.fillOpacity,
          radius: baseConfig.radius,
          weight: baseConfig.weight,
          interactive: false,
          bubblingMouseEvents: false,
        }).addTo(mapRef.value);
        barracksRadarRefs.value.push({ circle: baseCircle, poiId: 'base-passive' });
      }
    }

    barracksList.forEach(barrack => {
      // No dibujar el radar activo aquí (lo hace createRadar)
      if (activeId && barrack.id === activeId) return;
      const config = getRadarConfigForCenter(barrack, false);
      const circle = L.circle([barrack.lat, barrack.lng], {
        color: config.color,
        fillColor: config.fillColor,
        fillOpacity: config.fillOpacity,
        radius: config.radius,
        weight: config.weight,
        interactive: false,
        bubblingMouseEvents: false,
      }).addTo(mapRef.value);
      barracksRadarRefs.value.push({ circle, poiId: barrack.id });
    });
  };

  /**
   * Actualiza la posición del radar
   * @param {Array} newCenter - Nuevas coordenadas [lat, lng]
   */
  const updatePosition = (newCenter) => {
    if (!radarRef.value) return;
    radarRef.value.setLatLng(newCenter);
    if (radialLineRef.value) {
      const radius = radarRef.value.getRadius();
      const endPoint = computePointOnEdge({ lat: newCenter.lat, lng: newCenter.lng }, radius, Math.PI / 2);
      radialLineRef.value.setLatLngs([
        [newCenter.lat, newCenter.lng],
        [endPoint.lat, endPoint.lng],
      ]);
    }
    renderLabel(newCenter, radarRef.value.getRadius());
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
      if (radialLineRef.value) {
        const center = radarRef.value.getLatLng();
        const endPoint = computePointOnEdge({ lat: center.lat, lng: center.lng }, newRadius, Math.PI / 2);
        radialLineRef.value.setLatLngs([
          [center.lat, center.lng],
          [endPoint.lat, endPoint.lng],
        ]);
      }
      const center = radarRef.value.getLatLng();
      renderLabel({ lat: center.lat, lng: center.lng }, newRadius);
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
    if (radialLineRef.value) {
      radialLineRef.value.remove();
      radialLineRef.value = null;
    }
    if (radialLabelRef.value) {
      radialLabelRef.value.remove();
      radialLabelRef.value = null;
    }
    attackCenterRef.value = null;
    // Eliminar todos los radares de barracas inactivos
    barracksRadarRefs.value.forEach(obj => obj.circle.remove());
    barracksRadarRefs.value = [];
    if (zoomListenerRef.value && mapRef.value) {
      mapRef.value.off('zoom', zoomListenerRef.value);
      zoomListenerRef.value = null;
    }
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
    if (radialLineRef.value) radialLineRef.value.remove();
    if (radialLabelRef.value) radialLabelRef.value.remove();
    if (zoomListenerRef.value && mapRef.value) {
      mapRef.value.off('zoom', zoomListenerRef.value);
      zoomListenerRef.value = null;
    }
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
    barracksRadarRefs,

    // Métodos
    createRadar,
    renderAllBarracksRadars,
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
