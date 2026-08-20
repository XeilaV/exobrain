# Árbol orgánico: tronco vertical y copa ramificada

Rehacer únicamente el **layout, el dibujo y la navegación** del mapa (la vista `GraphViewV2`, que es la que ve la app) para que parezca un árbol real y no un diagrama radial. No se toca la base de datos, la jerarquía, la IA, las tareas ni el editor de notas.

## Estructura del árbol

- **Tronco**: desde el nodo base "ExoBrain" sube una sola línea vertical fina y ligeramente curvada.
- **Ramas principales**: se construyen desde las **notas raíz** (`parentNoteId === null`), no desde `categories`. Nacen del tronco a **alturas distintas y alternando lados** (izquierda / derecha / centro), abriéndose hacia arriba y hacia fuera. El color se hereda de la categoría asociada a cada raíz (o del color propio de la nota).
- **Copa completa**: a partir de cada raíz se recorre `parentNoteId` recursivamente hasta el último nivel. Todo el árbol —hijas, nietas y siguientes niveles— se **renderiza siempre desde el inicio**; nada se genera al seleccionar.
- **Bifurcaciones orgánicas**: cada nodo reparte a sus hijas en abanico alrededor de su dirección de crecimiento, con ángulo que se estrecha y longitud que se acorta según la profundidad. Nunca hijas apiladas en vertical bajo la madre.
- Separación anti-solape: el abanico de cada rama se dimensiona según cuántos descendientes tiene.
- **Por defecto todo desplegado**. El doble clic sigue plegando/desplegando manualmente una rama.

## Líneas y nodos

- Curvas Bézier suaves, **más gruesas cerca del tronco y afinándose con la profundidad** hasta casi un pelo en las hojas.
- Cada rama principal mantiene su color de forma sutil (degradado de baja saturación), sin neón ni efectos decorativos.
- Nodos = etiquetas pequeñas y discretas junto a la bifurcación, con un punto del color de la rama.
- **El zoom solo controla la legibilidad**: por debajo de cierto nivel de zoom los niveles profundos muestran solo el punto y menor opacidad; al acercarse aparecen sus etiquetas. La geometría no cambia.
- Ligera sensación 3D: sombra muy sutil bajo cada nodo, ramas lejanas más claras y finas.

## Interacción

- **Clic en rama o nota: solo selecciona**. Resalta esa rama y atenúa el resto. No hace zoom, no recentra, no altera el pan.
- Navegación espacial exclusivamente manual: arrastrar el fondo para pan, rueda / pinch para zoom.
- **Zoom anclado al cursor** (o al centro del gesto pinch): se ajustan zoom y pan a la vez con la fórmula de anclaje, no con un `transform-origin` fijo ni escalado suelto.
- Se mantiene el arrastre de nodos con su descendencia, el botón de encuadrar todo y los diálogos existentes.

## Detalles técnicos

- Cambios acotados a `src/components/GraphViewV2.tsx`.
- Layout: tronco + abanico recursivo (dirección heredada, ángulo y longitud decrecientes, peso por número de descendientes) sobre `notes` filtrando raíces por `parentNoteId === null`.
- Aristas: trazo afilado por profundidad y `linearGradient` por rama.
- Zoom/pan: listener `wheel` nativo no pasivo con `deltaMode` normalizado y zoom exponencial; `next = clamp(z * exp(-dy * 0.0015))` y `offset = p - (p - offset) * (next/z)` respecto al rect del contenedor. Pinch con Pointer Events usando el punto medio como ancla y `touch-action: none`.
- Se elimina el auto-foco/recentrado al seleccionar; la selección pasa a ser puramente visual (`focusIds` + atenuación).
- Se conservan `NotesContext`, offsets de arrastre, `getSubtreeIds`, `fitFullTree` y todos los diálogos. Estilos con tokens semánticos de `index.css`; sin nuevas dependencias ni migraciones.

## Fuera de alcance

- Editor de notas, chat IA, tareas, exportación y backend quedan igual.
