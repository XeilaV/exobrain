## Objetivo

Hacer que en móvil se pueda navegar por el mapa con el dedo de forma fluida y hacer zoom con pinza (dos dedos), sin saltos ni resets inesperados.

## Problemas actuales

En `src/components/GraphView.tsx`:

- El pan usa `onPointerDown` de React + `pointermove` en `window`, y **fuerza `setViewZoom(1)` en cada movimiento** (línea 474). Esto provoca saltos si el usuario había hecho zoom con el botón 🌳, y hace que `pan.x/y` se actualicen contra un zoom que cambia, generando un movimiento no lineal.
- No existe **pinch-to-zoom**: no hay manejo de dos punteros simultáneos. En móvil solo se puede hacer zoom pulsando el botón de árbol.
- El umbral de 5px se aplica sobre coordenadas de pantalla sin tener en cuenta `touch-action`, así que el navegador puede interpretar el gesto como scroll y "robar" eventos.
- El contenedor raíz no fija `touch-action`, por lo que el gesto de pinza dispara zoom nativo del navegador en lugar del nuestro.

## Cambios propuestos

### 1. Fijar `touch-action` en el contenedor del grafo

Añadir `touch-action: none` al `div` raíz de `GraphView` para que el navegador no interprete ni scroll ni pinch nativo. Los nodos ya usan `touch-none`.

### 2. Registrar los punteros activos

Añadir un `pointersRef = useRef<Map<pointerId, { x, y }>>()` que se actualice en `pointerdown`, `pointermove`, `pointerup` y `pointercancel`. Esto permite distinguir un dedo (pan) de dos dedos (pinch).

### 3. Pan de un dedo sin resetear el zoom

Reescribir el flujo de pan:

- En `pointerdown` sobre el fondo con **un solo puntero activo**: guardar `panState = { startX, startY, baseX: pan.x, baseY: pan.y }`. **No** tocar `viewZoom`.
- En `pointermove` con un solo puntero: actualizar `pan = { baseX + dx, baseY + dy }` directamente. Sin dividir por zoom (el pan es en coordenadas de pantalla, coherente con `matrix(z,0,0,z,pan.x,pan.y)`).
- Eliminar el bloque que hacía `setViewZoom(1)` durante el pan y la reconversión de coordenadas en `onPointerDown`.

Resultado: el pan es fluido y respeta el zoom actual.

### 4. Pinch-to-zoom con dos dedos

Cuando se detecte un **segundo puntero** activo sobre el fondo:

- Cancelar `panState` y `dragState`.
- Guardar `pinchState = { startDist, startZoom: viewZoom, startPan: {...pan}, center: puntoMedioPantalla }`.
- En `pointermove` con dos punteros:
  - `newDist = distancia(p1, p2)`
  - `scale = newDist / startDist`
  - `newZoom = clamp(startZoom * scale, 0.3, 3)`
  - Ajustar `pan` para que el punto en pantalla `center` permanezca sobre el mismo punto del mundo:
    - `worldX = (center.x - startPan.x) / startZoom`
    - `pan.x = center.x - worldX * newZoom` (idem `y`)
  - `setViewZoom(newZoom); setPan(...)`.
- Al soltar cualquiera de los dos dedos, cerrar `pinchState`. Si aún queda un dedo, iniciar un nuevo `panState` desde su posición actual (para no dar saltos al volver de pinch a pan).

### 5. Cancelar long-press y drag durante gestos multi-touch

En cuanto haya dos punteros o comience `pinchState`, llamar a `cancelLongPress()` y limpiar `dragState.current`, para que no se abra un menú contextual ni se arrastre un nodo por accidente mientras se hace pinch.

### 6. Ajustar `fitFullTree` y foco

Mantener el comportamiento actual (fit al colapsar, focus a rama al expandir). No se pierden porque solo se disparan por cambios de layout, no por gestos.

### 7. Verificación

En móvil 390×844 con Playwright emulando eventos táctiles:

- Un dedo arrastrando el fondo mueve todo el mapa con zoom actual sin saltos.
- Dos dedos separándose amplían centrados en el punto medio; juntándose reducen.
- Combinar pinch y luego soltar un dedo continúa como pan sin salto.
- Long-press sobre categoría sigue abriendo menú; drag de nodo sigue funcionando; doble-click sigue expandiendo/colapsando.
- El botón 🌳 sigue recentrando y su zoom no se resetea al iniciar un pan.
