import { watch } from 'vue';
import L from 'leaflet';
import { useProgressTimer } from '@/composables/useProgressTimer';

export function useBaseFeature({
  mapStore,
  poiStore,
  gameStore,
  markerRef,
  baseConfirmed,
  isBaseAttackOrigin,
  selectedBarracksForAttack,
  currentAttackOrigin,
  selectedPOI,
  showPOIDialog,
  baseHealth,
  disableDragging,
  updateMarkerScreenPosition,
  updateRadarPosition,
  updateConnectionLine,
  updateOwnedConnectionLines,
  handleSelectBaseAsAttackOrigin,
  closeEnemyDialog,
  pois,
  isBaseCaptured,
}) {
  const baseHealCooldown = useProgressTimer(2000, { key: 'base-heal' });
  const isBaseHealOnCooldown = baseHealCooldown.isRunning;
  const baseHealProgress = baseHealCooldown.progress;

  const handleBaseHeal = () => {
    if (isBaseHealOnCooldown.value) return;
    const healed = gameStore.consumeResource('pharmacy', 1);
    if (!healed) return;
    gameStore.setBaseHealth(baseHealth.value + 1);
    baseHealCooldown.start();
  };

  const handleConfirmMarker = () => {
    mapStore.confirmBase();
    disableDragging();
    // Abrir diálogo del marcador de base inmediatamente después de confirmar
    mapStore.openBaseMarkerDialog();
    // Asegurar que la posición del diálogo esté sincronizada con el marcador
    if (updateMarkerScreenPosition) updateMarkerScreenPosition();
  };

  const handleMarkerClick = (e) => {
    if (e) {
      L.DomEvent.stopPropagation(e);
    }
    if (!baseConfirmed.value) return;

    const baseAlreadySelected = isBaseAttackOrigin.value && !selectedBarracksForAttack.value;

    if (showPOIDialog.value) {
      poiStore.closePOIDialog();
    }
    closeEnemyDialog();

    if (baseAlreadySelected) {
      mapStore.openBaseMarkerDialog();
      updateMarkerScreenPosition();
    } else {
      mapStore.closeBaseMarkerDialog();
      handleSelectBaseAsAttackOrigin();
    }
  };

  const handleMarkerDragEnd = () => {
    const position = markerRef.value.getLatLng();
    mapStore.updateMarkerPosition([position.lat, position.lng]);
    updateMarkerScreenPosition();

    if (baseConfirmed.value && !selectedBarracksForAttack.value) {
      updateRadarPosition([position.lat, position.lng]);
    }

    updateConnectionLine(selectedPOI.value, currentAttackOrigin.value);
  };

  const handleMarkerDrag = () => {
    updateMarkerScreenPosition();
    if (markerRef.value && baseConfirmed.value && !selectedBarracksForAttack.value) {
      updateRadarPosition(markerRef.value.getLatLng());
    }
    updateConnectionLine(selectedPOI.value, currentAttackOrigin.value);
    updateOwnedConnectionLines(pois.value);
  };

  watch(selectedBarracksForAttack, (newBarracks) => {
    currentAttackOrigin.value = newBarracks;
  });

  watch(isBaseAttackOrigin, (isBase) => {
    if (isBase && markerRef.value) {
      const latLng = markerRef.value.getLatLng();
      currentAttackOrigin.value = {
        lat: latLng.lat,
        lng: latLng.lng,
        type: 'base',
        isEnemy: isBaseCaptured.value,
      };
    } else if (!isBase && !selectedBarracksForAttack.value) {
      currentAttackOrigin.value = null;
    }
  });

  return {
    isBaseHealOnCooldown,
    baseHealProgress,
    handleBaseHeal,
    handleConfirmMarker,
    handleMarkerClick,
    handleMarkerDragEnd,
    handleMarkerDrag,
  };
}

