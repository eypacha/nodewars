import { inject, provide } from 'vue';

const MapContextKey = Symbol('MapContext');

export function provideMapContext(context) {
  provide(MapContextKey, context);
  return context;
}

export function useMapContext() {
  const ctx = inject(MapContextKey);
  if (!ctx) {
    throw new Error('MapContext no disponible');
  }
  return ctx;
}

