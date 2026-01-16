
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

# 🗺️ NodeWars

Juego de estrategia territorial basado en geolocalización — estado actual del proyecto

## Estado real (implementado)
- Mapa interactivo con geolocalización (Leaflet + OSM) y confirmación de la posición de la base.
- Radar expandible desde la base; el radio afecta qué POIs se pueden escanear y controlar.
- POIs reales detectados por escaneo: cada POI tiene recursos acumulables con una tasa de producción y capacidad.
- Extracción manual y automática (`autoExtract`) de recursos; los recursos se usan por tipo (food, pharmacy, fuel, bank, police).
- Conversión de POIs a `barrack` (cuartel) para extender cobertura, habilitar radares locales y nodos de ataque.
- Mejoras: radar, auto-attack, auto-heal, nodos de base y mejoras de producción en POIs.
- Oleadas de enemigos: spawn, movimiento hacia `base` o `barrack`, daño a estructuras y mecánicas de captura.
- Sistema de ataques y curaciones (manuales y automáticas), animaciones y feedback visual en el mapa.
- Persistencia local via IndexedDB (Dexie) para enemigos, POIs y estado de juego.

## Comportamientos y límites importantes
- Escaneos añaden POIs filtrados y limitados por categoría (máx. por scan). Los POIs tienen `productionRate`, `resourceAmount` y pueden auto-extraerse.
- Las conexiones desde la base o un cuartel limitan cuántos nodos pueden ser conquistados.
- Enemigos se generan por oleadas y se mueven hacia objetivos; al llegar, dañan o conquistan.
- El juego es actualmente single-player y offline (persistencia local); no hay servidor multijugador.

## No implementado / por mejorar
- IA enemiga avanzada (por ahora siguen objetivos directos y reglas simples de spawn).

## Tecnologías
- Vue 3 (Composition API)
- Leaflet + OpenStreetMap
- Pinia
- TailwindCSS + PrimeVue
- Dexie.js (IndexedDB)
- i18n

## Ejecutar localmente
```bash
yarn
yarn dev
```

---

NodeWars — Conquista y controla puntos en el mundo real. El prototipo ya soporta escaneo, control de POIs, oleadas enemigas y mejoras persistentes.
