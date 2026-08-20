# Guardar la disposición del árbol y mejorar el reparto por defecto

Dos cosas a la vez: que tus recolocaciones manuales dejen de perderse al recargar, y que el árbol nazca ya con un reparto parecido al que acabas de montar (ramas cortas, poco solape, silueta arborescente).

## 1. Capturar lo que tienes ahora mismo

Hoy los desplazamientos de nodos viven solo en la memoria del navegador. Se añade una acción **"Guardar disposición"** en el menú del nombre del cerebro que escribe de golpe todos los desplazamientos actuales. Manteniendo la pestaña abierta, un clic ahí conserva la colocación que acabas de hacer.

## 2. Persistencia continua

- Al cargar el árbol, cada nota aplica su desplazamiento guardado.
- Al soltar un nodo arrastrado, ese desplazamiento se guarda automáticamente (con un pequeño retardo para no saturar la conexión).
- Se mantiene el comportamiento actual: mover una madre arrastra su descendencia; solo se guarda el desplazamiento propio del nodo movido, no el heredado.
- El botón existente de "Restablecer todo" también limpia los desplazamientos guardados, devolviendo el árbol al reparto automático.

## 3. Reparto por defecto más parecido a tu montaje

Se ajusta el generador de geometría para acercarse a la referencia:

- Ramas más cortas y decrecimiento más marcado con la profundidad.
- Apertura del abanico más amplia en el primer nivel y más contenida a partir del segundo, para evitar que las hijas se apilen.
- Separación mínima angular entre hermanas en función de cuánta descendencia carga cada una.
- Paso de separación de las notas raíz sobre el tronco ligeramente mayor, alternando lados, para que las cabezas de rama no se crucen.
- Descarte de solapes: pequeño repulsor determinista entre nodos vecinos del mismo nivel, aplicado una sola vez al generar (la geometría sigue siendo estática: seleccionar o hacer zoom no la recalcula).

## 4. Notas nuevas

Una nota creada después se coloca automáticamente junto a su madre con el layout automático, respetando el hueco libre más cercano. No hereda ni inventa desplazamientos manuales.

## Detalles técnicos

- La base de datos ya tiene `pos_dx` / `pos_dy` en `notes`; no hace falta migración.
- `src/contexts/NotesContext.tsx`: exponer `posDx`/`posDy` en el tipo `Note`, incluirlos en el mapeo de lectura y añadir `updateNotePosition(id, dx, dy)` y `clearAllPositions()`.
- `src/types/notes.ts`: campos opcionales `posDx` / `posDy`.
- `src/components/GraphViewV2.tsx`: inicializar `offsets` desde las notas, guardar al terminar el arrastre (debounce ~600 ms), acción de guardado masivo y limpieza en el reset.
- `src/lib/treeGeometry.ts`: ajuste de longitudes, apertura, separación entre hermanas y paso del tronco, más la fase de anti-solape determinista.
- Sin cambios en chat, tareas, adjuntos ni backend.
