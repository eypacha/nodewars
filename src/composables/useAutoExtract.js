import { onBeforeUnmount } from 'vue';
import { storeToRefs } from 'pinia';
import { usePoiStore } from '@/stores/poiStore';
import { useGameStore } from '@/stores/gameStore';
import { useGameClockStore } from '@/stores/gameClockStore';
import { getPOIColor } from '@/constants/poiTypes';

export const useAutoExtract = ({ onAutoExtract } = {}) => {
  const poiStore = usePoiStore();
  const gameStore = useGameStore();
  const gameClockStore = useGameClockStore();
  const { pois, selectedPOI, showPOIDialog } = storeToRefs(poiStore);
  const AUTO_EXTRACT_TICK_MS = 500;
  let unsubscribeTick = null;
  let tickAccumulator = 0;

  const isBlockedByEnemyBarrack = (poi) => {
    if (!poi || !Array.isArray(pois.value)) return false;
    let current = poi;
    while (current?.conqueredFrom) {
      const barrack = pois.value.find((p) => p.id === current.conqueredFrom);
      if (!barrack) break;
      if (barrack.type === 'barrack' && !barrack.owned) return true;
      current = barrack;
    }
    return false;
  };

  const handleAutoExtractTick = () => {
    if (!pois.value.length) return;
    const selectedId = showPOIDialog.value ? selectedPOI.value?.id : null;

    pois.value.forEach((poi) => {
      if (!poi || poi.type === 'barrack') return;
      if (!poi.owned || !poi.autoExtract) return;

      poiStore.applyProductionForPOI(poi.id);

      const updated = poiStore.getPOIById(poi.id);
      if (!updated) return;
      if (selectedId && selectedId === updated.id) return;
      if (updated.resourceAmount < updated.resourceCapacity) return;
      if (isBlockedByEnemyBarrack(updated)) return;

      const consumed = poiStore.consumeResource(updated.id);
      if (!consumed) return;
      const resourceType = updated.category || updated.type;
      const resourceColor = getPOIColor(resourceType);

      if (typeof onAutoExtract === 'function') {
        onAutoExtract({ poi: updated, resourceType, resourceColor });
      } else {
        gameStore.addResource(resourceType);
      }
    });
  };

  const startAutoExtractLoop = () => {
    if (unsubscribeTick) return;
    tickAccumulator = 0;
    unsubscribeTick = gameClockStore.onTick(({ deltaMs }) => {
      if (!deltaMs) return;
      tickAccumulator += deltaMs;
      while (tickAccumulator >= AUTO_EXTRACT_TICK_MS) {
        handleAutoExtractTick();
        tickAccumulator -= AUTO_EXTRACT_TICK_MS;
      }
    });
  };

  const stopAutoExtractLoop = () => {
    if (!unsubscribeTick) return;
    unsubscribeTick();
    unsubscribeTick = null;
    tickAccumulator = 0;
  };

  startAutoExtractLoop();

  onBeforeUnmount(() => {
    stopAutoExtractLoop();
  });

  return {
    startAutoExtractLoop,
    stopAutoExtractLoop,
  };
};
