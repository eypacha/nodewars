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
  const getRenderPoint = (latLng) => {
    if (!mapRef.value) return null;
    const pane = mapRef.value.getPane?.('resourceParticles');
    if (pane) {
      return mapRef.value.latLngToLayerPoint(latLng);
    }
    return mapRef.value.latLngToContainerPoint(latLng);
  };

  /**
   * Construye la cadena de suministro desde un POI hasta la base
   * @param {Object} poi - POI inicial
   * @param {Array} allPois - Array de todos los POIs para resolver cadenas
   * @returns {Array} Array de puntos a los que viajar en orden
   */
  const buildSupplyChain = (poi, allPois) => {
    const chain = [];
    let current = poi;
    
    // Agregar el punto inicial (el POI)
    chain.push([current.lat, current.lng]);
    
    // Seguir la cadena hasta la base
    while (current.conqueredFrom) {
      const barracks = allPois.find(p => p.id === current.conqueredFrom);
      if (barracks) {
        chain.push([barracks.lat, barracks.lng]);
        current = barracks;
      } else {
        break;
      }
    }
    
    // Agregar la base al final
    return chain;
  };

  /**
   * Crea una partícula que viaja de un punto a otro
   * @param {L.LatLng} startLatLng - Punto inicial
   * @param {L.LatLng} endLatLng - Punto final
   * @param {string} resourceType - Tipo de recurso
   * @param {string} resourceColor - Color del recurso
   * @param {boolean} isLastLeg - Si es el último tramo hacia la base
   */
  const createResourceParticle = (startLatLng, endLatLng, resourceType, resourceColor, isLastLeg = false, onArrive = null) => {
    const particleId = nextParticleId++;
    
    // Calcular distancia real en metros
    const distanceInMeters = L.latLng(startLatLng).distanceTo(L.latLng(endLatLng));
    
    // Velocidad constante: 150 metros por segundo
    const speed = 150; // m/s
    const duration = (distanceInMeters / speed) * 1000; // Duración en milisegundos
    
    const startTime = performance.now();
    const startPoint = getRenderPoint(startLatLng);
    
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
      isLastLeg,
    };
    
    resourceParticles.value.push(particle);
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Interpolación lineal de las coordenadas geográficas
      const currentLat = startLatLng.lat + (endLatLng.lat - startLatLng.lat) * progress;
      const currentLng = startLatLng.lng + (endLatLng.lng - startLatLng.lng) * progress;
      
      // Convertir a coordenadas de pantalla
      const currentPoint = getRenderPoint([currentLat, currentLng]);
      
      // Actualizar posición de la partícula
      const particleIndex = resourceParticles.value.findIndex(p => p.id === particleId);
      if (particleIndex !== -1) {
        resourceParticles.value[particleIndex].x = currentPoint.x;
        resourceParticles.value[particleIndex].y = currentPoint.y;
      }
      
      if (progress < 1) {
        particle.animationFrame = requestAnimationFrame(animate);
      } else {
        // Si es el último tramo, ejecutar callback o agregar recurso al gameStore
        if (isLastLeg) {
          if (typeof onArrive === 'function') {
            onArrive();
          } else {
            gameStore.addResource(resourceType);
          }
        }
        
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
   * Inicia la animación de recolección de un recurso con cadena de suministro
   * @param {Object} sourcePOI - POI desde donde viene el recurso
   * @param {string} resourceType - Tipo de recurso (food, pharmacy, fuel, bank)
   * @param {string} resourceColor - Color hex del recurso
   * @param {Array} allPois - Array de todos los POIs para resolver la cadena de suministro
   */
  const startResourceCollection = (sourcePOI, resourceType, resourceColor, allPois = []) => {
    if (!markerRef.value || !sourcePOI || !mapRef.value) return;
    
    const basePosition = markerRef.value.getLatLng();
    
    // Construir la cadena de suministro
    const chain = buildSupplyChain(sourcePOI, allPois);
    
    // Agregar la base al final si no está ya
    const lastPoint = chain[chain.length - 1];
    if (lastPoint[0] !== basePosition.lat || lastPoint[1] !== basePosition.lng) {
      chain.push([basePosition.lat, basePosition.lng]);
    }
    
    // Crear partículas que viajen por cada tramo de la cadena
    let delay = 0;
    for (let i = 0; i < chain.length - 1; i++) {
      const startPoint = chain[i];
      const endPoint = chain[i + 1];
      const isLastLeg = (i === chain.length - 2); // Es el último tramo si es el anterior a la base
      
      // Stagger las partículas para que salgan en cascada
      setTimeout(() => {
        createResourceParticle(
          L.latLng(startPoint),
          L.latLng(endPoint),
          resourceType,
          resourceColor,
          isLastLeg,
          () => gameStore.addResource(resourceType)
        );
      }, delay);
      
      // Calcular el delay para el siguiente tramo
      const distanceInMeters = L.latLng(startPoint).distanceTo(L.latLng(endPoint));
      const speed = 150; // m/s
      const duration = (distanceInMeters / speed) * 1000;
      delay += duration + 100; // Agregar un pequeño offset entre partículas
    }
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

  /**
   * Envía un recurso desde la base hacia un POI conquistado (para curar/reabastecer)
   * @param {Object} targetPOI - POI objetivo
   * @param {string} resourceColor - Color del recurso
   * @param {Array} allPois - Array de todos los POIs
   * @param {Function} onArrive - Callback al llegar al último tramo
   */
  const startHealingDelivery = (targetPOI, resourceColor, allPois = [], onArrive = null) => {
    if (!markerRef.value || !targetPOI || !mapRef.value) return;
    const basePosition = markerRef.value.getLatLng();

    // Cadena desde el objetivo a la base y luego invertida (base -> objetivo)
    let chain = buildSupplyChain(targetPOI, allPois);
    const lastPoint = chain[chain.length - 1];
    if (lastPoint[0] !== basePosition.lat || lastPoint[1] !== basePosition.lng) {
      chain.push([basePosition.lat, basePosition.lng]);
    }
    chain = chain.reverse();

    let delay = 0;
    for (let i = 0; i < chain.length - 1; i++) {
      const startPoint = chain[i];
      const endPoint = chain[i + 1];
      const isLastLeg = (i === chain.length - 2);

      setTimeout(() => {
        createResourceParticle(
          L.latLng(startPoint),
          L.latLng(endPoint),
          'pharmacy',
          resourceColor,
          isLastLeg,
          isLastLeg ? onArrive : null
        );
      }, delay);

      const distanceInMeters = L.latLng(startPoint).distanceTo(L.latLng(endPoint));
      const speed = 150; // m/s
      const duration = (distanceInMeters / speed) * 1000;
      delay += duration + 100;
    }
  };

  return {
    resourceParticles,
    startResourceCollection,
    startHealingDelivery,
    cancelResourceCollection,
  };
};
