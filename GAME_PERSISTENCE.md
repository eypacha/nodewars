# Sistema de Persistencia del Juego

## Descripción

NodeWars utiliza **Dexie.js** (wrapper de IndexedDB) para implementar persistencia del juego en el navegador. El sistema guarda automáticamente el progreso basándose en eventos clave del juego.

## Características

### 🎮 Guardado Automático

El juego se guarda automáticamente cuando ocurren los siguientes eventos, como por ejemplo.

1. **Confirmación de la base**: Cuando el jugador confirma la ubicación de su base
2. **Descubrimiento de recursos**: luego cargar nuevos POIs a la vista.
3. **Mejora del radar**: Cuando se aumenta el nivel del radar
etc

### 📱 Pantalla de Inicio

- **Botón "Start"**: Inicia una nueva partida (elimina la partida guardada anterior)
- **Botón "Continue"**: Se muestra solo si existe una partida guardada, carga el progreso y hace zoom a la base

### 💾 Datos Guardados

El sistema persiste:
- 📍 Posición del centro del mapa
- 🔍 Nivel de zoom
- 📌 Ubicación del marcador de la base
- ✅ Estado de confirmación de la base
- 🎯 Recursos (food, pharmacy, fuel, bank, police)
- 📡 Nivel del radar

## Arquitectura

### Archivos Principales

```
src/
├── services/
│   └── gameDatabase.js       # Configuración de Dexie y operaciones CRUD
├── composables/
│   └── useGamePersistence.js # Lógica de guardado automático y carga
└── views/
    └── HomeView.vue          # Integración del sistema de persistencia
```

### Flujo de Guardado

```
Evento del juego → Watch en useGamePersistence → saveGame() → Dexie → IndexedDB
```

### Flujo de Carga

```
Click en "Continue" → loadGame() → Dexie → restoreGameState() → Actualización de stores
```

## Uso en Desarrollo

### Verificar partida guardada

Abre la consola del navegador:
```javascript
// Verificar si hay partida guardada
await window.db.gameState.toArray()
```

### Eliminar partida guardada manualmente

```javascript
// Desde la consola del navegador
await window.db.gameState.clear()
```

### Ver logs del sistema

El sistema imprime logs útiles en la consola:
- ✅ `Game saved` - Guardado exitoso
- ✅ `Game loaded` - Carga exitosa
- 🔄 `Auto-saving: [evento]` - Guardado automático por evento
- ℹ️ `No saved game found` - No hay partida guardada

## Notas Técnicas

### Debouncing

Los recursos usan un debounce de 2 segundos para evitar múltiples guardados cuando se recolectan recursos rápidamente.

### ID de Partida

Solo se mantiene una partida activa con ID fijo: `current_game`

### Versión de la Base de Datos

Actualmente usa Dexie versión 1. Para migraciones futuras, incrementar el número de versión en `gameDatabase.js`.

## Testing

Para probar el sistema:

1. Inicia una nueva partida ("Start")
2. Confirma la ubicación de tu base
3. Recarga la página (F5)
4. Verifica que aparece el botón "Continue"
5. Click en "Continue" - deberías volver a tu base con todos los recursos intactos
