/**
 * Composable para gestionar la animación de ataque
 * Maneja la animación de múltiples triángulos desde la base hasta los POIs
 */
import { ref } from 'vue';
import L from 'leaflet';
import { usePoiStore } from '@/stores/poiStore';

export const useAttackAnimation = (mapRef, markerRef) => {
  const attackTriangles = ref([]);
  let nextAttackId = 0;
  const poiStore = usePoiStore();

  /**
   * Inicia la animación de ataque hacia un POI
   * @param {Object} targetPOI - POI objetivo con lat y lng
   * @param {Object} attackOrigin - Cuartel desde el que atacar (opcional, usa base si no se proporciona)
   */
  const startAttack = (target, attackOrigin = null, options = {}) => {
    if (!markerRef.value || !target || !mapRef.value) return;

    const { onHit, trackTarget, interceptDistanceMeters = 30, isAuto = false } = options;

    const attackId = nextAttackId++;

    // Usar cuartel como origen si se proporciona, sino usar la base
    const startLatLng = attackOrigin 
      ? L.latLng([attackOrigin.lat, attackOrigin.lng])
      : markerRef.value.getLatLng();
    let endLatLng = [target.lat, target.lng];
    
    // Calcular distancia real en metros
    const distanceInMeters = L.latLng(startLatLng).distanceTo(L.latLng(endLatLng));
    
    // Velocidad constante: 100 metros por segundo
    const speed = 100; // m/s
    const duration = (distanceInMeters / speed) * 1000; // Duración en milisegundos
    
    // Calcular ángulo de rotación
    const startPoint = mapRef.value.latLngToContainerPoint(startLatLng);
    let endPoint = mapRef.value.latLngToContainerPoint(endLatLng);
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const rotation = (Math.atan2(dy, dx) * 180 / Math.PI) + 90; // +90 para que apunte hacia arriba por defecto
    
    const startTime = performance.now();
    
    // Crear objeto de ataque
    const attack = {
      id: attackId,
      x: startPoint.x,
      y: startPoint.y,
      rotation: rotation,
      isAuto,
      animationFrame: null,
      startLatLng,
      endLatLng,
      startTime,
      duration,
    };
    
    attackTriangles.value.push(attack);
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Actualizar objetivo dinámico si se proporciona
      if (trackTarget) {
        const dynamicTarget = trackTarget();
        if (dynamicTarget && dynamicTarget.lat != null && dynamicTarget.lng != null) {
          endLatLng = [dynamicTarget.lat, dynamicTarget.lng];
          endPoint = mapRef.value.latLngToContainerPoint(endLatLng);
        }
      }

      // Interpolación lineal de las coordenadas geográficas
      const currentLat = startLatLng.lat + (endLatLng[0] - startLatLng.lat) * progress;
      const currentLng = startLatLng.lng + (endLatLng[1] - startLatLng.lng) * progress;
      
      // Convertir a coordenadas de pantalla
      const currentPoint = mapRef.value.latLngToContainerPoint([currentLat, currentLng]);
      
      // Actualizar posición del triángulo
      const attackIndex = attackTriangles.value.findIndex(a => a.id === attackId);
      if (attackIndex !== -1) {
        attackTriangles.value[attackIndex].x = currentPoint.x;
        attackTriangles.value[attackIndex].y = currentPoint.y;
        attackTriangles.value[attackIndex].rotation = ((Math.atan2(endPoint.y - currentPoint.y, endPoint.x - currentPoint.x) * 180) / Math.PI) + 90;
      }

      const distanceToTarget = L.latLng([currentLat, currentLng]).distanceTo(L.latLng(endLatLng));

      if (progress < 1 && distanceToTarget > interceptDistanceMeters) {
        attack.animationFrame = requestAnimationFrame(animate);
      } else {
        // Animación completada o interceptada - ejecutar callback o dañar POI
        if (onHit) {
          onHit();
        } else if (target.id != null) {
          const attackOriginId = attackOrigin ? attackOrigin.id : null;
          poiStore.damagePOI(target.id, 1, attackOriginId);
        }
        
        // Eliminar el ataque después de un breve delay
        setTimeout(() => {
          const index = attackTriangles.value.findIndex(a => a.id === attackId);
          if (index !== -1) {
            attackTriangles.value.splice(index, 1);
          }
        }, 100);
      }
    };
    
    attack.animationFrame = requestAnimationFrame(animate);
  };

  /**
   * Cancela todas las animaciones de ataque activas
   */
  const cancelAttack = () => {
    attackTriangles.value.forEach(attack => {
      if (attack.animationFrame) {
        cancelAnimationFrame(attack.animationFrame);
      }
    });
    attackTriangles.value = [];
  };

  return {
    attackTriangles,
    startAttack,
    cancelAttack,
  };
};
