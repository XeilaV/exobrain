
## Cambios en `src/components/GraphView.tsx`

### 1. Layout en semicírculo (radial) en vez de línea
Reemplazar la disposición horizontal+stagger actual de los hijos por una distribución radial:
- Para cada nodo padre con N hijos visibles, colocarlos en un arco semicircular orientado hacia "afuera" del padre (lejos del abuelo / centro del árbol).
- Fórmula: ángulo base = vector (padre → abuelo) invertido; los hijos se reparten en `±SPREAD` (≈ 100–140°) alrededor de ese ángulo base.
- Radio según nivel: `R = baseRadius * (mobile ? 0.75 : 1)`, con `baseRadius` ~110px nivel 1, decreciendo en niveles más profundos.
- Para las categorías (nivel raíz) también se reparten en semicírculo desde el "centro/tronco" como ya hace la imagen de referencia.
- Mantener el clamping a viewport y el comportamiento de "mover padre arrastra a los hijos relativos" ya existente (los offsets siguen siendo relativos al padre).

### 2. Zoom a subárbol al desplegar (doble clic)
- Añadir estado `focusedNodeId: string | null` en `GraphView`.
- Al hacer doble clic sobre un nodo nota (el que ya alterna `is_collapsed`):
  - Si pasa de colapsado → expandido: setear `focusedNodeId = noteId`.
  - Si se vuelve a colapsar: limpiar `focusedNodeId`.
- Calcular bounding box de la nota foco + todos sus descendientes visibles, con padding. Aplicar transform (translate + scale) al `<g>` del SVG para encajar ese bbox en el viewport con animación suave (transición CSS de 300ms sobre `transform`).
- Mientras hay foco, el resto del árbol sigue renderizándose pero queda fuera del viewport visible (no se oculta para no romper enlaces). Opcionalmente bajar su opacidad a 0.15.

### 3. Botón "Vista completa del árbol"
- Añadir un botón flotante en la esquina (junto al menú de perfil ya existente) con icono `TreePine` o `Trees` de `lucide-react`.
- Al pulsarlo: `setFocusedNodeId(null)` y resetear transform para mostrar todo el árbol (fit-to-screen del bbox global, ya calculado por el clamping actual).
- Tooltip: "Ver árbol completo".

## Detalles técnicos
- Sin cambios en DB ni en `NotesContext`.
- Reutilizar la función existente `buildNoteSubtree` para obtener descendientes visibles (filtrando por `is_collapsed`).
- Helper nuevo `computeRadialPositions(parentPos, grandparentPos, count, radius, spread)` → array de `{x,y}`.
- Helper nuevo `computeSubtreeBBox(noteId)` → `{minX,minY,maxX,maxY}` recorriendo descendientes.
- Transición: `<g style={{ transform, transition: 'transform 300ms ease' }}>`.
- El arrastre manual de un nodo sigue guardando posición absoluta; al haber posición manual se respeta sobre el cálculo radial (igual que hoy).
