# 🗺️ NodeWars

**Un juego de estrategia territorial basado en geolocalización real**

## 🎮 Concepto del Juego

NodeWars es un juego de estrategia en tiempo real que convierte el mundo real en tu campo de batalla. Utilizando tu ubicación GPS, podrás conquistar territorios, recolectar recursos de puntos de interés cercanos, construir bases militares y expandir tu dominio por tu ciudad o región.

### 🌟 Características Principales

#### **Sistema de Geolocalización**
- El juego utiliza tu ubicación GPS real para posicionarte en un mapa interactivo
- Tu posición física determina qué territorios y recursos puedes acceder
- Explora tu entorno para descubrir nuevos puntos de interés

#### **Bases y Territorios**
- **Tu Base Principal**: Se establece en tu ubicación inicial. Es tu centro de operaciones y punto de control
- **Cuarteles (Barracks)**: Establece puestos militares avanzados para expandir tu radio de influencia
- **Control Territorial**: Cada base tiene un radio de control que marca tu dominio en el mapa

#### **Sistema de Recursos**
El juego utiliza datos reales de OpenStreetMap para identificar puntos de interés cercanos:

- 🍕 **Comida (Food)**: Restaurantes, supermercados, panaderías
- 💊 **Farmacia (Pharmacy)**: Farmacias y hospitales
- ⛽ **Combustible (Fuel)**: Gasolineras y estaciones de servicio
- 🏦 **Banco (Bank)**: Bancos y cajeros automáticos - **La moneda principal del juego**
- 👮 **Policía (Police)**: Comisarías y estaciones de policía

**Mecánica de Recolección**:
- Los puntos de interés aparecen en el mapa según tu ubicación real
- Debes estar dentro del radio de tu base o cuartel para recolectar recursos
- Cada POI puede ser recolectado una vez, proporcionando 1 unidad del recurso correspondiente
- Los recursos sirven para mejorar tu infraestructura y expandir tu territorio

#### **Sistema de Radar y Mejoras**
- **Radar**: Determina el alcance de visión y recolección de tu base
  - Nivel 1: Radio inicial básico
  - Nivel 2: Costo 10 bancos
  - Nivel 3: Costo 25 bancos
  - Nivel 4: Costo 50 bancos
  - Nivel 5+: Costo exponencial creciente

- **Estrategia de Upgrades**: Mejorar tu radar te permite:
  - Detectar más POIs en tu área
  - Recolectar recursos más lejanos
  - Expandir tu zona de influencia

#### **Construcción de Cuarteles**
- Establece bases secundarias en ubicaciones estratégicas
- Cada cuartel tiene su propio radio de recolección
- Te permite cubrir más territorio y acceder a recursos distribuidos por la ciudad
- Funciona como punto de control adicional

#### **Interfaz de Usuario**
- **Mapa Interactivo**: Visualización en tiempo real de tu entorno usando Leaflet
- **HUD de Recursos**: Panel con contador de todos tus recursos
- **Panel de Mejoras**: Interfaz para invertir recursos en upgrades
- **Marcadores Visuales**: Diferentes iconos y colores para bases, cuarteles y POIs
- **Líneas de Conexión**: Visualización de relaciones entre tus estructuras
- **Animaciones de Ataque**: Sistema de radar visual para detección

### 🎯 Objetivo del Juego

Expandir tu dominio territorial recolectando recursos estratégicos del mundo real, estableciendo bases militares y mejorando tu infraestructura para controlar cada vez más territorio.

### 🌍 Mundo Real = Campo de Batalla

NodeWars transforma tu entorno cotidiano en un tablero de juego estratégico:
- Ese restaurante cercano es ahora un punto de suministro de alimentos
- El banco de tu barrio es tu fuente de ingresos
- Las gasolineras son depósitos de combustible
- Tu ciudad se convierte en un mapa de guerra territorial

### 🚀 Estrategia de Juego

1. **Fase Inicial**: Establece tu base principal y recolecta recursos cercanos
2. **Expansión**: Invierte en mejoras de radar para aumentar tu alcance
3. **Consolidación**: Construye cuarteles en ubicaciones estratégicas
4. **Dominación**: Controla áreas completas con múltiples puntos de control

### 🛠️ Tecnologías

- **Vue 3** con Composition API
- **Leaflet** para mapas interactivos
- **OpenStreetMap / Overpass API** para datos de POIs reales
- **Geolocation API** para tracking GPS
- **Pinia** para gestión de estado
- **PrimeVue** para componentes UI
- **TailwindCSS** para estilos

---

## 💻 Desarrollo

### Requisitos
- Node.js 16+
- Navegador con soporte Geolocation API
- Conexión a Internet para datos del mapa

### Instalación

```bash
npm install
```

### Desarrollo
```bash
npm run dev
```

### Build
```bash
npm run build
```

---

**NodeWars**: Conquista tu ciudad, domina el territorio. El mundo real es tu campo de batalla. 🗺️⚔️
