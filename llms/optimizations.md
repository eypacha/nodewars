# Optimización futura: spawn uniforme en la unión de radares

Este documento es una guía para que otros agentes implementen optimizaciones del cálculo de borde de unión cuando haya muchos radares (>50). No realizar ahora; solo describe la estrategia.

## Objetivo
Reducir el coste del cálculo de arcos disponibles y de la selección uniforme en el borde de la unión de múltiples círculos (radares), que hoy es O(n²) por spawn.

## Filtrado espacial (reducir comparaciones)
- **Idea**: solo comparar cada radar con los que estén dentro de un radio relevante (por ejemplo `radioPropio + radioMáximo`).
- **Estructura**: cuadrícula uniforme o quadtree. Para simplicidad, usar cuadrícula 2D en coordenadas proyectadas/locales.
- **Tamaño de celda**: igual o ligeramente mayor al radio máximo de radar; así, los solapes solo pueden estar en la celda o vecinas inmediatas.
- **Índice**: `Map<cellId, radarIds[]>` donde `cellId` se obtiene discretizando `lat/lng` o X/Y (si se usa una proyección simple).
- **Consulta**: para cada radar, visitar celdas vecinas (3x3 alrededor) y reunir candidatos; compararlos para calcular solapes/intervalos.
- **Complejidad**: en zonas densas sigue habiendo comparaciones, pero se evita el O(n²) global cuando los radares se distribuyen en el mapa.

## Cacheo de arcos (evitar recomputar)
- **Clave de caché por radar**: usar `{id, lat, lng, radius}` redondeados a centímetros/metros para evitar ruido.
- **Dependencias**: los arcos de un radar dependen de todos los demás que solapan. Se puede almacenar también una `sceneVersion` global que cambie al mover/añadir/quitar un radar.
- **Estrategia mínima**:
  - Mantener `versionGlobal` que se incrementa cuando cambia la lista de radares o su radio/posición.
  - Guardar `cache[radar.id] = { version: versionGlobal, arcs }`.
  - En `computeAvailableArcs(radar, radars)`, si la versión coincide, devolver `arcs` cacheados; si no, recalcular y actualizar caché.
- **Estrategia refinada**:
  - Además de `versionGlobal`, guardar una huella de los vecinos relevantes (por ejemplo `neighborHash` a partir de los IDs y radios de los que están a distancia < `r1 + r2`).
  - Solo invalidar cuando cambie un vecino relevante o el propio radar.
- **Salida cacheable**: lista de arcos `{ start, end, length, radar }`. Asegurarse de copiar o congelar para no mutar en el consumo.

## Selección uniforme con caché/índice
- Una vez reunidos todos los arcos (usando caché + filtrado espacial), sumar longitudes y hacer la selección acumulada como ahora.
- Si el conjunto de arcos total no cambia entre spawns, también puede cachearse `totalLength` y la lista linealizada de arcos.

## Consideraciones numéricas
- Mantener `EPSILON` pequeño (1e-6) para fusiones de intervalos; el filtrado espacial no debe introducir falsos negativos de solape.
- Normalizar ángulos a `[0, 2π)` tras operaciones de desplazamiento/solape.

## Activación
- Solo activar estas optimizaciones cuando el número de radares supere un umbral (p.ej. 40-50) para no añadir complejidad innecesaria en escenarios chicos.
