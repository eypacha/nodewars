/**
 * Composable para gestionar la animación de recolección de recursos
 * Maneja la animación de puntitos que viajan desde un POI hacia la base
 */
import { ref } from 'vue';
import L from 'leaflet';
import { useGameStore } from '@/stores/gameStore';
import { useGameClockStore } from '@/stores/gameClockStore';

export const useResourceCollection = (mapRef, markerRef) => {
  const resourceParticles = ref([]);
  let nextParticleId = 0;
  let nextSpawnId = 0;
  const pendingSpawns = ref([]);
  const gameStore = useGameStore();
  const gameClockStore = useGameClockStore();
  const REMOVE_DELAY_MS = 100;
  let unsubscribeTick = null;
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
    const chainIds = [];
    let current = poi;
    
    // Agregar el punto inicial (el POI)
    chain.push([current.lat, current.lng]);
    if (current.id != null) {
      chainIds.push(current.id);
    }
    
    // Seguir la cadena hasta la base
    while (current.conqueredFrom) {
      const barracks = allPois.find(p => p.id === current.conqueredFrom);
      if (barracks) {
        chain.push([barracks.lat, barracks.lng]);
        if (barracks.id != null) {
          chainIds.push(barracks.id);
        }
        current = barracks;
      } else {
        break;
      }
    }
    
    // Agregar la base al final
    return { points: chain, ids: chainIds };
  };

  const startTicking = () => {
    if (unsubscribeTick) return;
    unsubscribeTick = gameClockStore.onTick(({ nowMs, deltaMs }) => {
      if (!deltaMs) return;
      processPendingSpawns(nowMs);
      updateParticles(nowMs);
      if (!pendingSpawns.value.length && !resourceParticles.value.length) {
        stopTicking();
      }
    });
  };

  const stopTicking = () => {
    if (!unsubscribeTick) return;
    unsubscribeTick();
    unsubscribeTick = null;
  };

  const processPendingSpawns = (nowMs) => {
    if (!pendingSpawns.value.length) return;
    const remaining = [];
    pendingSpawns.value.forEach((spawn) => {
      if (spawn.at <= nowMs) {
        spawn.fn();
      } else {
        remaining.push(spawn);
      }
    });
    pendingSpawns.value = remaining;
  };

  const updateParticles = (nowMs) => {
    if (!resourceParticles.value.length) return;
    const toRemove = [];
    resourceParticles.value.forEach((particle) => {
      if (particle.completedAt != null) {
        if (nowMs >= particle.completedAt + REMOVE_DELAY_MS) {
          toRemove.push(particle.id);
        }
        return;
      }

      const elapsed = nowMs - particle.startTime;
      const progress = Math.min(elapsed / particle.duration, 1);
      const currentLat = particle.startLatLng.lat + (particle.endLatLng.lat - particle.startLatLng.lat) * progress;
      const currentLng = particle.startLatLng.lng + (particle.endLatLng.lng - particle.startLatLng.lng) * progress;
      const currentPoint = getRenderPoint(L.latLng([currentLat, currentLng]));
      if (!currentPoint) return;

      const particleIndex = resourceParticles.value.findIndex(p => p.id === particle.id);
      if (particleIndex !== -1) {
        resourceParticles.value[particleIndex].x = currentPoint.x;
        resourceParticles.value[particleIndex].y = currentPoint.y;
      }

      if (progress < 1) return;

      if (particle.isLastLeg) {
        if (typeof particle.onArrive === 'function') {
          particle.onArrive();
        } else {
          gameStore.addResource(particle.resourceType);
        }
      }
      particle.onArrive = null;
      particle.completedAt = nowMs;
    });

    if (toRemove.length) {
      resourceParticles.value = resourceParticles.value.filter((particle) => !toRemove.includes(particle.id));
    }
  };

  const scheduleSpawnInGame = (delayMs, fn, pathIds = []) => {
    const at = gameClockStore.now() + Math.max(0, delayMs);
    const spawnId = nextSpawnId++;
    pendingSpawns.value.push({ id: spawnId, at, fn, pathIds });
    startTicking();
    return spawnId;
  };

  /**
   * Crea una partícula que viaja de un punto a otro
   * @param {L.LatLng} startLatLng - Punto inicial
   * @param {L.LatLng} endLatLng - Punto final
   * @param {string} resourceType - Tipo de recurso
   * @param {string} resourceColor - Color del recurso
   * @param {boolean} isLastLeg - Si es el último tramo hacia la base
   */
  const createResourceParticle = (startLatLng, endLatLng, resourceType, resourceColor, isLastLeg = false, onArrive = null, pathIds = []) => {
    const particleId = nextParticleId++;
    
    // Calcular distancia real en metros
    const distanceInMeters = L.latLng(startLatLng).distanceTo(L.latLng(endLatLng));
    
    // Velocidad constante: 150 metros por segundo
    const speed = 150; // m/s
    const duration = (distanceInMeters / speed) * 1000; // Duración en milisegundos
    
    const startTime = gameClockStore.now();
    const startPoint = getRenderPoint(startLatLng);
    if (!startPoint) return;
    
    const particle = {
      id: particleId,
      x: startPoint.x,
      y: startPoint.y,
      pathIds,
      startLatLng,
      endLatLng,
      startTime,
      duration,
      resourceType,
      resourceColor,
      isLastLeg,
      onArrive,
      completedAt: null,
    };
    
    resourceParticles.value.push(particle);
    startTicking();
  };

  /**
   * Inicia la animación de recolección de un recurso con cadena de suministro
   * @param {Object} sourcePOI - POI desde donde viene el recurso
   * @param {string} resourceType - Tipo de recurso (food, pharmacy, fuel, bank)
   * @param {string} resourceColor - Color hex del recurso
   * @param {Array} allPois - Array de todos los POIs para resolver la cadena de suministro
   */
  // `onArriveOverride` allows callers to override the default behavior
  // (which adds the resource to the gameStore). This is useful for
  // cosmetic-only animations like auto-heal where the resource was
  // already consumed and we don't want to add it back to the store.
  const startResourceCollection = (sourcePOI, resourceType, resourceColor, allPois = [], onArriveOverride = null) => {
    if (!markerRef.value || !sourcePOI || !mapRef.value) return;
    
    const basePosition = markerRef.value.getLatLng();
    
    // Construir la cadena de suministro
    const { points: chain, ids: chainIds } = buildSupplyChain(sourcePOI, allPois);
    
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
      scheduleSpawnInGame(delay, () => {
        createResourceParticle(
          L.latLng(startPoint),
          L.latLng(endPoint),
          resourceType,
          resourceColor,
          isLastLeg,
          isLastLeg ? (onArriveOverride ?? (() => gameStore.addResource(resourceType))) : null,
          chainIds
        );
      }, chainIds);
      
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
    pendingSpawns.value = [];
    resourceParticles.value = [];
    stopTicking();
  };

  const cancelResourceCollectionForBarrack = (barrackId) => {
    if (barrackId == null) return;
    pendingSpawns.value = pendingSpawns.value.filter((spawn) => {
      if (spawn.pathIds?.includes(barrackId)) {
        return false;
      }
      return true;
    });

    resourceParticles.value = resourceParticles.value.filter((particle) => {
      if (particle.pathIds?.includes(barrackId)) {
        return false;
      }
      return true;
    });
    if (!pendingSpawns.value.length && !resourceParticles.value.length) {
      stopTicking();
    }
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
    const { points: chainPoints, ids: chainIds } = buildSupplyChain(targetPOI, allPois);
    let chain = chainPoints;
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

      scheduleSpawnInGame(delay, () => {
        createResourceParticle(
          L.latLng(startPoint),
          L.latLng(endPoint),
          'pharmacy',
          resourceColor,
          isLastLeg,
          isLastLeg ? onArrive : null,
          chainIds
        );
      }, chainIds);

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
    cancelResourceCollectionForBarrack,
  };
};
