import { useGameStore } from '@/stores/gameStore';
import { useMapStore } from '@/stores/mapStore';

export function useGeolocation() {
  const gameStore = useGameStore();
  const mapStore = useMapStore();

  const requestLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        gameStore.showLocationError();
        reject(new Error('Geolocalización no soportada'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const location = [latitude, longitude];
          
          // Actualizar estado del mapa
          mapStore.centerOnLocation(location, 16);
          
          // Mostrar marcador después de la animación
          setTimeout(() => {
            mapStore.setMarker(location);
          }, 1700);
          
          resolve(location);
        },
        (error) => {
          console.warn('Error al obtener ubicación:', error);
          gameStore.showLocationError();
          reject(error);
        }
      );
    });
  };

  return {
    requestLocation,
  };
}
