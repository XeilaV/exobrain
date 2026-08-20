# Árbol orgánico: tronco vertical y copa ramificada

Rehacer únicamente el **layout y el dibujo** del mapa (la vista `GraphViewV2`, que es la que ve la app) para que parezca un árbol real y no un diagrama radial. No se toca la base de datos, la jerarquía, la IA, las tareas ni el editor de notas.

## Estructura del árbol

- **Tronco**: desde el nodo base "ExoBrain" sube una sola línea vertical fina y ligeramente curvada.
- **Ramas principales**: en lugar de salir todas del mismo punto, nacen del tronco a **alturas distintas y alternando lados** (izquierda / derecha / centro), abriéndose hacia arriba y hacia fuera.
- **Bifurcaciones orgánicas**: cada nodo reparte a sus hijas en abanico alrededor de su propia dirección de crecimiento, con un ángulo que se estrecha y una longitud que se acorta según la profundidad. Nunca hijas apiladas en vertical bajo la madre.
- Separación anti-solape: el abanico de cada rama se dimensiona según cuántos descendientes tiene, de modo que las ramas grandes ocupan más arco.
- Todo el árbol permanece siempre visible (sin plegado por defecto); el doble clic sigue plegando/desplegando.

## Líneas y nodos

- Curvas Bézier suaves, **más gruesas cerca del tronco y afinándose con la profundidad** hasta casi un pelo en las hojas.
- Cada rama principal hereda un color propio, aplicado con baja saturación: la línea usa un degradado del color de la rama, sin brillos ni neón.
- Nodos = etiquetas pequeñas y discretas junto a la bifurcación, con un punto del color de la rama. Tamaño de texto menor a mayor profundidad.
- **Profundidad por niveles**: los niveles profundos se dibujan con menos opacidad y, por debajo de cierto zoom, sin texto (solo el punto); al acercarse aparecen las etiquetas.
- Ligera sensación 3D: sombra muy sutil bajo cada nodo y las ramas lejanas algo más claras y finas.

## Navegación

- Pan arrastrando el fondo, zoom con rueda/pellizco anclado al cursor, botón de encuadrar todo. Se mantiene el arrastre de nodos con su descendencia y el foco automático al abrir una rama.

## Detalles técnicos

- Cambios acotados a `src/components/GraphViewV2.tsx`: se sustituye el bloque de cálculo `positions/edges` por un layout de tronco + abanico recursivo (dirección heredada, ángulo y longitud decrecientes, peso por número de descendientes) y se reescribe el dibujo de aristas con trazo afilado por profundidad y `linearGradient` por rama.
- Se conservan `NotesContext`, colores por raíz, offsets de arrastre, `getSubtreeIds`, `fitFullTree`, gestos y todos los diálogos existentes.
- Estilos con tokens semánticos de `index.css`; sin nuevas dependencias ni migraciones.

## Fuera de alcance

- Editor de notas, chat IA, tareas, exportación y backend quedan igual.
