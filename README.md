
# 🗺️ NodeWars

**Juego de estrategia territorial basado en geolocalización real**

## 🎮 Mecánicas Actuales

- **Geolocalización y Mapa**: El juego usa tu ubicación GPS real y muestra tu entorno en un mapa interactivo (Leaflet + OpenStreetMap).
- **Base Principal**: Eliges tu base inicial, que es tu centro de operaciones y punto de control.
- **Radar y Mejoras**: Tu base tiene un radar con radio de acción mejorable (usando recursos tipo banco). El radio aumenta con cada mejora.
- **Recursos y POIs**: Los puntos de interés (POIs) reales (comida, farmacia, combustible, banco, policía) aparecen en el mapa según tu ubicación. Solo puedes recolectar recursos si el POI está dentro del radio de tu base o cuarteles.
- **Recolección de Recursos**: Cada POI puede ser recolectado una vez y otorga 1 recurso. Los recursos sirven para mejorar el radar y curar la base.
- **Cuarteles**: Puedes convertir POIs en cuarteles para expandir tu radio de acción y recolectar recursos en otras zonas.
- **Oleadas de Enemigos**: El juego genera oleadas de enemigos cada cierto tiempo (timer visible en el HUD). Los enemigos se mueven hacia tu base o cuarteles.
- **Ataques y Defensa**: Puedes atacar enemigos manualmente desde la base o cuarteles. Si un enemigo llega a la base, le resta salud.
- **Salud de la Base**: La base tiene salud y puede ser curada usando recursos de farmacia.
- **Panel de Mejoras**: Puedes invertir recursos para mejorar el radar desde un panel dedicado.
- **HUD**: Muestra recursos, área y perímetro de cobertura, y el timer de la próxima oleada.
- **Animaciones y Visuales**: Animaciones de radar, ataque, partículas de recursos y líneas de conexión entre estructuras.
- **Popups y Diálogos**: Interfaz para confirmar ubicaciones, mostrar información de POIs, ataques, upgrades y game over.

## 🚧 No implementado (aún o no visible en el código):

- Multijugador o interacción entre jugadores.
- Sistema de misiones, logros o progresión avanzada.
- IA enemiga compleja (los enemigos solo se mueven hacia el objetivo más cercano).
- Personalización de estructuras o unidades.

## 🛠️ Tecnologías

- Vue 3 (Composition API)
- Leaflet + OpenStreetMap
- Pinia (estado)
- PrimeVue (UI)
- TailwindCSS (estilos)
- Dexie.js (IndexedDB)
- i18n (multi-idioma)

## 💻 Instalación y uso

```bash
npm install
npm run dev
```

---

**NodeWars**: Conquista tu ciudad, domina el territorio. El mundo real es tu campo de batalla. 🗺️⚔️
