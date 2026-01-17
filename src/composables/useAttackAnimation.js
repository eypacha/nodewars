/**
 * Composable para gestionar la animación de ataque
 * Maneja la animación de múltiples triángulos desde la base hasta los POIs
 */
import { ref } from 'vue';
import L from 'leaflet';
import { usePoiStore } from '@/stores/poiStore';
import { getRadarConfig } from '@/services/mapService';
import { useGameClockStore } from '@/stores/gameClockStore';

export const useAttackAnimation = (mapRef, markerRef, { radarLevel } = {}) => {
  const attackTriangles = ref([]);
  let nextAttackId = 0;
  const poiStore = usePoiStore();
  const gameClockStore = useGameClockStore();
  let unsubscribeTick = null;
  const REMOVE_DELAY_MS = 100;

  const startTicking = () => {
    if (unsubscribeTick) return;
    unsubscribeTick = gameClockStore.onTick(({ nowMs }) => {
      if (!attackTriangles.value.length) return;
      const toRemove = [];

      attackTriangles.value.forEach((attack) => {
        if (attack.completedAt != null) {
          if (nowMs >= attack.completedAt + REMOVE_DELAY_MS) {
            toRemove.push(attack.id);
          }
          return;
        }

        const elapsed = nowMs - attack.startTime;
        const progress = Math.min(elapsed / attack.duration, 1);

        if (attack.trackTarget) {
          const dynamicTarget = attack.trackTarget();
          if (dynamicTarget && dynamicTarget.lat != null && dynamicTarget.lng != null) {
            attack.endLatLng = [dynamicTarget.lat, dynamicTarget.lng];
          }
        }

        const endLatLng = attack.endLatLng;
        const currentLat = attack.startLatLng.lat + (endLatLng[0] - attack.startLatLng.lat) * progress;
        const currentLng = attack.startLatLng.lng + (endLatLng[1] - attack.startLatLng.lng) * progress;
        const currentPoint = mapRef.value.latLngToContainerPoint([currentLat, currentLng]);
        const endPoint = mapRef.value.latLngToContainerPoint(endLatLng);

        const attackIndex = attackTriangles.value.findIndex(a => a.id === attack.id);
        if (attackIndex !== -1) {
          attackTriangles.value[attackIndex].x = currentPoint.x;
          attackTriangles.value[attackIndex].y = currentPoint.y;
          attackTriangles.value[attackIndex].rotation = ((Math.atan2(endPoint.y - currentPoint.y, endPoint.x - currentPoint.x) * 180) / Math.PI) + 90;
        }

        const distanceToTarget = L.latLng([currentLat, currentLng]).distanceTo(L.latLng(endLatLng));
        if (progress < 1 && distanceToTarget > attack.interceptDistanceMeters) return;

        if (attack.onHit) {
          attack.onHit();
        } else if (attack.targetId != null) {
          const attackOriginId = attack.attackOriginId ?? null;
          poiStore.damagePOI(attack.targetId, 1, attackOriginId);
        }

        attack.completedAt = nowMs;
      });

      if (toRemove.length) {
        attackTriangles.value = attackTriangles.value.filter((attack) => !toRemove.includes(attack.id));
      }
    });
  };

  const stopTicking = () => {
    if (!unsubscribeTick) return;
    unsubscribeTick();
    unsubscribeTick = null;
  };

  /**
   * Inicia la animación de ataque hacia un POI
   * @param {Object} targetPOI - POI objetivo con lat y lng
   * @param {Object} attackOrigin - Cuartel desde el que atacar (opcional, usa base si no se proporciona)
   */
  const startAttack = (target, attackOrigin = null, options = {}) => {
    if (!markerRef.value || !target || !mapRef.value) return;

    const { onHit, trackTarget, interceptDistanceMeters = 30, isAuto = false, type = 'attack' } = options;

    const attackId = nextAttackId++;

    // Usar cuartel como origen si se proporciona, sino usar la base
    const startLatLng = attackOrigin 
      ? L.latLng([attackOrigin.lat, attackOrigin.lng])
      : markerRef.value.getLatLng();
    let endLatLng = [target.lat, target.lng];
    
    // Calcular distancia real en metros
    const distanceInMeters = L.latLng(startLatLng).distanceTo(L.latLng(endLatLng));
    
    const baseSpeed = 100; // m/s
    const baseRadius = getRadarConfig(1).radius;
    const barrackRadius = attackOrigin?.barrackRadarRadius ?? attackOrigin?.radarRadius ?? null;
    const level = radarLevel?.value ?? 1;
    const currentRadius = barrackRadius ?? getRadarConfig(level).radius;
    const speed = baseSpeed * (currentRadius / baseRadius);
    const duration = (distanceInMeters / speed) * 1000; // Duración en milisegundos
    
    // Calcular ángulo de rotación
    const startPoint = mapRef.value.latLngToContainerPoint(startLatLng);
    let endPoint = mapRef.value.latLngToContainerPoint(endLatLng);
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const rotation = (Math.atan2(dy, dx) * 180 / Math.PI) + 90; // +90 para que apunte hacia arriba por defecto
    
    const startTime = gameClockStore.now();
    
    // Crear objeto de ataque
    const attack = {
      id: attackId,
      x: startPoint.x,
      y: startPoint.y,
      rotation: rotation,
      isAuto,
      type,
      startLatLng,
      endLatLng,
      startTime,
      duration,
      onHit,
      trackTarget,
      interceptDistanceMeters,
      targetId: target.id,
      attackOriginId: attackOrigin ? attackOrigin.id : null,
      completedAt: null,
    };
    
    attackTriangles.value.push(attack);
    startTicking();
  };

  /**
   * Cancela todas las animaciones de ataque activas
   */
  const cancelAttack = () => {
    attackTriangles.value = [];
    stopTicking();
  };

  return {
    attackTriangles,
    startAttack,
    cancelAttack,
  };
};
