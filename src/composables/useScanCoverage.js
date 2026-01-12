import { computed, ref } from 'vue';
import L from 'leaflet';

/**
 * Gestiona el estado de scans y las animaciones de radar
 */
export function useScanCoverage({
  mapRef,
  selectedPOI,
  mapViewVersion,
  closeDialog,
  removeConnectionLine,
  poiStore,
  mapStore,
}) {
  const scanContexts = ref(new Map());
  const scanAnimationTimeouts = ref(new Map());

  const activeScanContexts = computed(() => Array.from(scanContexts.value.values()));
  const isBaseScanActive = computed(() => scanContexts.value.has('base'));
  const isSelectedBarrackScanActive = computed(() => {
    const poi = selectedPOI.value;
    if (!poi || poi.type !== 'barrack') return false;
    return scanContexts.value.has(`barrack-${poi.id}`);
  });

  const getScanKey = (type, id = 'base') => (type === 'barrack' ? `barrack-${id}` : 'base');

  const addScanContext = (key, context) => {
    const mapCopy = new Map(scanContexts.value);
    mapCopy.set(key, { ...context, id: key });
    scanContexts.value = mapCopy;
  };

  const removeScanContext = (key) => {
    if (!scanContexts.value.has(key)) return;
    const mapCopy = new Map(scanContexts.value);
    mapCopy.delete(key);
    scanContexts.value = mapCopy;
  };

  const stopScanForKey = (key) => {
    poiStore.stopScan(key);
    const timeout = scanAnimationTimeouts.value.get(key);
    if (timeout) {
      clearTimeout(timeout);
    }
    const newTimeouts = new Map(scanAnimationTimeouts.value);
    newTimeouts.delete(key);
    scanAnimationTimeouts.value = newTimeouts;
    removeScanContext(key);
  };

  const runScan = async ({ type, position, radius, closeDialogs = true, originId = null }) => {
    const key = getScanKey(type, originId || 'base');

    if (closeDialogs) {
      closeDialog(removeConnectionLine);
      mapStore.closeAllDialogs();
    }

    addScanContext(key, { type, position, radius });
    console.log(`[scan] start ${key}`, position, radius);

    try {
      const result = await poiStore.fetchPOIs(position, radius, { stagger: true, staggerDelay: 250, originKey: key });

      if (result?.status === 'ok' || result?.status === 'stopped') {
        const timeoutId = setTimeout(() => {
          removeScanContext(key);
          const newTimeouts = new Map(scanAnimationTimeouts.value);
          newTimeouts.delete(key);
          scanAnimationTimeouts.value = newTimeouts;
        }, 300);
        const newTimeouts = new Map(scanAnimationTimeouts.value);
        newTimeouts.set(key, timeoutId);
        scanAnimationTimeouts.value = newTimeouts;
      }
    } catch (err) {
      console.error(`[scan] error ${key}`, err);
    }
  };

  const radarSweepStyles = computed(() => {
    mapViewVersion.value;
    if (!mapRef.value) return [];

    const earthRadius = 6371000;

    return activeScanContexts.value
      .map((ctx) => {
        const originLatLng = ctx.position;
        if (!originLatLng || !ctx.radius) return null;

        const screenPosition = mapRef.value.latLngToContainerPoint([
          originLatLng.lat,
          originLatLng.lng,
        ]);

        const latOffset = (ctx.radius / earthRadius) * (180 / Math.PI);
        const pointAtRadius = L.latLng(
          originLatLng.lat + latOffset,
          originLatLng.lng
        );
        const edgePoint = mapRef.value.latLngToContainerPoint(pointAtRadius);
        const centerPoint = mapRef.value.latLngToContainerPoint([
          originLatLng.lat,
          originLatLng.lng
        ]);
        const radiusInPixels = Math.abs(edgePoint.y - centerPoint.y);

        return {
          id: ctx.id,
          style: {
            position: 'absolute',
            left: `${screenPosition.x}px`,
            top: `${screenPosition.y}px`,
            zIndex: 999,
            '--radar-radius': `${radiusInPixels}px`,
          }
        };
      })
      .filter(Boolean);
  });

  return {
    activeScanContexts,
    isBaseScanActive,
    isSelectedBarrackScanActive,
    radarSweepStyles,
    runScan,
    stopScanForKey,
    getScanKey,
  };
}
