/**
 * Composable para gestionar la animación de recolección de recursos
 * Maneja la animación de puntitos que viajan desde un POI hacia la base
 */
import { ref } from 'vue';
import L from 'leaflet';
import { useGameStore } from '@/stores/gameStore';

export const useResourceCollection = (mapRef, markerRef) => {
  const resourceParticles = ref([]);
  let nextParticleId = 0;
  const gameStore = useGameStore();

  /**
   * Inicia la animación de recolección de un recurso
   * @param {Object} sourcePOI - POI desde donde viene el recurso
   * @param {string} resourceType - Tipo de recurso (food, pharmacy, fuel, bank)
   * @param {string} resourceColor - Color hex del recurso
   */
  const startResourceCollection = (sourcePOI, resourceType, resourceColor) => {
    if (!markerRef.value || !sourcePOI || !mapRef.value) return;
    
    const particleId = nextParticleId++;
    const startLatLng = [sourcePOI.lat, sourcePOI.lng];
    const endLatLng = markerRef.value.getLatLng();
    
    // Calcular distancia real en metros
    const distanceInMeters = L.latLng(startLatLng).distanceTo(L.latLng(endLatLng));
    
    // Velocidad constante: 150 metros por segundo (un poco más rápido que el ataque)
    const speed = 150; // m/s
    const duration = (distanceInMeters / speed) * 1000; // Duración en milisegundos
    
    const startTime = performance.now();
    
    // Convertir a puntos de pantalla para obtener posición inicial
    const startPoint = mapRef.value.latLngToContainerPoint(startLatLng);
    
    // Crear objeto de partícula de recurso
    const particle = {
      id: particleId,
      x: startPoint.x,
      y: startPoint.y,
      animationFrame: null,
      startLatLng,
      endLatLng,
      startTime,
      duration,
      resourceType,
      resourceColor,
    };
    
    resourceParticles.value.push(particle);
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Interpolación lineal de las coordenadas geográficas
      const currentLat = startLatLng[0] + (endLatLng.lat - startLatLng[0]) * progress;
      const currentLng = startLatLng[1] + (endLatLng.lng - startLatLng[1]) * progress;
      
      // Convertir a coordenadas de pantalla
      const currentPoint = mapRef.value.latLngToContainerPoint([currentLat, currentLng]);
      
      // Actualizar posición de la partícula
      const particleIndex = resourceParticles.value.findIndex(p => p.id === particleId);
      if (particleIndex !== -1) {
        resourceParticles.value[particleIndex].x = currentPoint.x;
        resourceParticles.value[particleIndex].y = currentPoint.y;
      }
      
      if (progress < 1) {
        particle.animationFrame = requestAnimationFrame(animate);
      } else {
        // Animación completada - agregar el recurso al gameStore
        gameStore.addResource(resourceType);
        
        // Eliminar la partícula después de un breve delay
        setTimeout(() => {
          const index = resourceParticles.value.findIndex(p => p.id === particleId);
          if (index !== -1) {
            resourceParticles.value.splice(index, 1);
          }
        }, 100);
      }
    };
    
    particle.animationFrame = requestAnimationFrame(animate);
  };

  /**
   * Cancela todas las animaciones de recolección activas
   */
  const cancelResourceCollection = () => {
    resourceParticles.value.forEach(particle => {
      if (particle.animationFrame) {
        cancelAnimationFrame(particle.animationFrame);
      }
    });
    resourceParticles.value = [];
  };

  return {
    resourceParticles,
    startResourceCollection,
    cancelResourceCollection,
  };
};
