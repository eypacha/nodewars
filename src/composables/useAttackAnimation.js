/**
 * Composable para gestionar la animación de ataque
 * Maneja la animación del triángulo desde la base hasta el POI
 */
import { ref, computed } from 'vue';
import L from 'leaflet';

export const useAttackAnimation = (mapRef, markerRef) => {
  const attackTriangle = ref(null);
  const attackAnimationFrame = ref(null);

  /**
   * Estilo del triángulo de ataque
   */
  const attackTriangleStyle = computed(() => {
    if (!attackTriangle.value) return {};
    return {
      position: 'absolute',
      left: `${attackTriangle.value.x}px`,
      top: `${attackTriangle.value.y}px`,
      transform: `translate(-50%, -50%) rotate(${attackTriangle.value.rotation}deg)`,
      zIndex: 999,
    };
  });

  /**
   * Inicia la animación de ataque hacia un POI
   * @param {Object} targetPOI - POI objetivo con lat y lng
   */
  const startAttack = (targetPOI) => {
    if (!markerRef.value || !targetPOI || !mapRef.value) return;
    
    // Cancelar animación anterior si existe
    if (attackAnimationFrame.value) {
      cancelAnimationFrame(attackAnimationFrame.value);
    }
    
    const startLatLng = markerRef.value.getLatLng();
    const endLatLng = [targetPOI.lat, targetPOI.lng];
    
    // Calcular distancia real en metros
    const distanceInMeters = L.latLng(startLatLng).distanceTo(L.latLng(endLatLng));
    
    // Velocidad constante: 100 metros por segundo
    const speed = 100; // m/s
    const duration = (distanceInMeters / speed) * 1000; // Duración en milisegundos
    
    // Calcular ángulo de rotación
    const startPoint = mapRef.value.latLngToContainerPoint(startLatLng);
    const endPoint = mapRef.value.latLngToContainerPoint(endLatLng);
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    const rotation = (Math.atan2(dy, dx) * 180 / Math.PI) + 90; // +90 para que apunte hacia arriba por defecto
    
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Interpolación lineal de las coordenadas geográficas
      const currentLat = startLatLng.lat + (endLatLng[0] - startLatLng.lat) * progress;
      const currentLng = startLatLng.lng + (endLatLng[1] - startLatLng.lng) * progress;
      
      // Convertir a coordenadas de pantalla
      const currentPoint = mapRef.value.latLngToContainerPoint([currentLat, currentLng]);
      
      // Actualizar posición del triángulo
      attackTriangle.value = {
        x: currentPoint.x,
        y: currentPoint.y,
        rotation: rotation,
      };
      
      if (progress < 1) {
        attackAnimationFrame.value = requestAnimationFrame(animate);
      } else {
        // Animación completada
        setTimeout(() => {
          attackTriangle.value = null;
        }, 100);
      }
    };
    
    attackAnimationFrame.value = requestAnimationFrame(animate);
  };

  /**
   * Cancela la animación de ataque actual
   */
  const cancelAttack = () => {
    if (attackAnimationFrame.value) {
      cancelAnimationFrame(attackAnimationFrame.value);
      attackTriangle.value = null;
    }
  };

  return {
    attackTriangle,
    attackTriangleStyle,
    startAttack,
    cancelAttack,
  };
};
