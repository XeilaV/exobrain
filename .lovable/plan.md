## Cambios

### 1. Modo oscuro por defecto + toggle en pantalla principal
- `useTheme` inicializa en `"dark"` cuando no hay preferencia guardada (ignorar `prefers-color-scheme`).
- Quitar el botón de tema del menú de perfil (`GraphView.tsx`).
- Añadir un botón flotante independiente (Sun/Moon) en la barra superior derecha del `GraphView`, junto al botón 🌳 y al de perfil, siempre visible. Mismo estilo (`p-2 rounded-lg border border-border bg-card/90 backdrop-blur-sm`).

### 2. Gestos tipo Google Maps invertido
Regla: **1 dedo = mover nodo/rama arrastrado**, **2 dedos = pan + zoom del lienzo**. Nunca se pana el lienzo con un solo dedo sobre el fondo.

Cambios en `GraphView.tsx` (gesture handlers):
- **Pan de fondo con 1 dedo: eliminado.** Si el `pointerdown` cae en el fondo y solo hay 1 puntero activo → no hacer nada (ni `panState`, ni `isPanning`).
- **Drag de nodo con 1 dedo: se conserva.** `pointerdown` sobre un nodo con 1 puntero → inicia `dragState` como ahora (long-press en móvil sigue funcionando para arrastrar notas/categorías).
- **Pan/zoom con 2 dedos:**
  - Al detectarse el 2º puntero (esté sobre fondo o sobre un nodo), cancelar cualquier `dragState` y `longPress` en curso y arrancar `pinchState` con `startDist`, `startZoom`, `startPan`, `center` (igual que ahora).
  - `pointermove` con 2 punteros → aplica zoom (`clamp 0.3–3`) manteniendo fijo el centro entre los dos dedos, y suma la traslación del centro al `pan` (esto añade el pan de dos dedos que hoy no existe explícitamente).
  - Al soltar un dedo y quedar 1: **no** iniciar pan; simplemente cerrar `pinchState`. El dedo restante queda inactivo hasta que se levante o toque un nodo en un nuevo gesto.
- **Ratón (desktop):** mantener el pan con click-drag sobre el fondo como está hoy (los usuarios de escritorio no tienen 2 dedos). Se distingue por `pointerType !== "touch"`.
- **Rueda del ratón:** mantiene zoom como ahora.
- Listeners `window`-level de puntero se conservan solo para detectar el 2º dedo y sincronizar `pinchState`, no para iniciar pan de 1 dedo.

### 3. Verificación
- Playwright móvil 390×844: 
  - Toggle visible en la esquina superior derecha, alterna claro/oscuro y persiste tras reload (dark por defecto en sesión limpia).
  - 1 dedo sobre fondo → el lienzo no se mueve.
  - 1 dedo sobre un nodo (long-press) → arrastra el nodo.
  - 2 dedos → pan y pinch-zoom fluidos.
- Typecheck con `bunx tsgo --noEmit`.

## Archivos afectados
- `src/hooks/useTheme.tsx` — default `"dark"`.
- `src/components/GraphView.tsx` — botón toggle en barra superior, eliminación del item de tema en menú perfil, refactor de handlers de puntero (fondo ignora 1 dedo en táctil; 2 dedos = pan+zoom).
