import { computed, ref } from 'vue';
import { getRadarConfig } from '@/services/mapService';
import { ENEMY_COLOR } from '@/constants/colors';

export function useAttackOrigin({
  mapRef,
  markerRef,
  radarRef,
  renderAllBarracksRadars,
  createRadar,
  removeRadar,
  getAttackCenter,
  updateIcon,
  BaseMarker,
  radarLevel,
  baseConfirmed,
  isBaseCaptured,
  pois,
  gameStore,
  isBaseAttackOrigin,
  selectedBarracksForAttack,
  currentAttackOrigin,
}) {
  const attackOriginScreenPosition = ref(null);

  const baseMarkerPosition = computed(() => {
    if (!markerRef.value) return null;
    const latLng = markerRef.value.getLatLng();
    return { lat: latLng.lat, lng: latLng.lng };
  });

  const getBaseAttackOrigin = () => {
    if (!markerRef.value) return null;
    const latLng = markerRef.value.getLatLng();
    return {
      lat: latLng.lat,
      lng: latLng.lng,
      type: 'base',
      level: gameStore.radarLevel,
      isEnemy: isBaseCaptured.value,
    };
  };

  const getOwnedBarracks = () => (pois.value || []).filter((p) => p.type === 'barrack' && p.owned);
  const getBarracksForRadar = () =>
    (pois.value || [])
      .filter((p) => p.type === 'barrack')
      .map((p) => ({
        ...p,
        isEnemy: isBaseCaptured.value ? true : !p.owned,
        radarRadius: p.barrackRadarRadius,
      }));

  const refreshBaseCaptureVisuals = () => {
    const captured = isBaseCaptured.value;

    if (markerRef.value) {
      updateIcon(BaseMarker, { componentProps: { isEnemy: captured } });
    }

    const attackCenter = getAttackCenter();
    if (radarRef.value && attackCenter?.type === 'base') {
      const radarColor = captured ? ENEMY_COLOR : getRadarConfig(radarLevel.value).color;
      radarRef.value.setStyle({ color: radarColor, fillColor: radarColor });
    }

    const barracks = getBarracksForRadar();
    const baseCenter = baseConfirmed.value && markerRef.value ? {
      lat: markerRef.value.getLatLng().lat,
      lng: markerRef.value.getLatLng().lng,
      type: 'base',
      level: radarLevel.value,
      isEnemy: captured,
    } : null;
    let activeId = null;
    if (selectedBarracksForAttack.value) {
      activeId = selectedBarracksForAttack.value.id;
    } else if (baseCenter) {
      activeId = 'base';
    }
    renderAllBarracksRadars(barracks, activeId, baseCenter);
  };

  const setActiveAttackOrigin = (origin) => {
    if (!origin) return;

    const barracksForRadar = getBarracksForRadar();
    const baseCenter = baseMarkerPosition.value
      ? { lat: baseMarkerPosition.value.lat, lng: baseMarkerPosition.value.lng, type: 'base', level: radarLevel.value, isEnemy: isBaseCaptured.value }
      : null;

    if (origin.type === 'barrack') {
      isBaseAttackOrigin.value = false;
      selectedBarracksForAttack.value = origin;
      createRadar({
        lat: origin.lat,
        lng: origin.lng,
        type: 'barrack',
        radarRadius: origin.barrackRadarRadius,
        isEnemy: isBaseCaptured.value ? true : !origin.owned,
      });
      renderAllBarracksRadars(barracksForRadar, origin.id, baseCenter);
    } else if (origin.type === 'base') {
      selectedBarracksForAttack.value = null;
      isBaseAttackOrigin.value = true;
      createRadar(origin);
      renderAllBarracksRadars(barracksForRadar, 'base', baseCenter);
    }
  };

  const handleSelectAsAttackOrigin = (barracks) => {
    if (barracks && barracks.type === 'barrack' && barracks.owned) {
      if (selectedBarracksForAttack.value && selectedBarracksForAttack.value.id === barracks.id) {
        const baseOrigin = getBaseAttackOrigin();
        if (baseOrigin) {
          setActiveAttackOrigin(baseOrigin);
        }
      } else {
        setActiveAttackOrigin(barracks);
      }
    }
  };

  const handleSelectBaseAsAttackOrigin = () => {
    const baseOrigin = getBaseAttackOrigin();
    if (baseOrigin) {
      setActiveAttackOrigin(baseOrigin);
    }
  };

  const updateAttackOriginScreenPosition = () => {
    if (!mapRef.value || !currentAttackOrigin.value) {
      attackOriginScreenPosition.value = null;
      return;
    }

    const origin = currentAttackOrigin.value;
    const point = mapRef.value.latLngToContainerPoint([
      origin.lat,
      origin.lng
    ]);

    attackOriginScreenPosition.value = {
      x: point.x,
      y: point.y
    };
  };

  return {
    baseMarkerPosition,
    getBaseAttackOrigin,
    getOwnedBarracks,
    getBarracksForRadar,
    refreshBaseCaptureVisuals,
    setActiveAttackOrigin,
    handleSelectAsAttackOrigin,
    handleSelectBaseAsAttackOrigin,
    attackOriginScreenPosition,
    updateAttackOriginScreenPosition,
  };
}
