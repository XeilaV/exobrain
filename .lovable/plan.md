Rediseño de la interacción de items de lista en móvil:

1. **Estado normal (no editando)**
   - Cada item muestra: checkbox, texto, y a la derecha las flechas **▲ / ▼** para reordenar.
   - Sin long-press, sin menús ocultos.

2. **Al tocar un item → modo edición**
   - El texto se convierte en `textarea` editable con auto-crecimiento.
   - **Desaparecen** las flechas ▲/▼.
   - **Aparecen** en su lugar tres botones: **Borrar**, **Duplicar**, **Subtarea**.
   - Solo un item puede estar en edición a la vez.

3. **Al terminar la edición** (Enter, blur/tocar fuera, o Escape)
   - Se guarda el texto.
   - Desaparecen Borrar/Duplicar/Subtarea.
   - Vuelven a aparecer las flechas ▲/▼.

4. **Acciones**
   - Borrar → `deleteChecklistItem`.
   - Duplicar → inserta copia justo debajo con `updateNote({ checklist })`.
   - Subtarea → inserta item indentado justo debajo.
   - Todas pasan por el debounce de guardado ya existente en el contexto para evitar carreras.

5. **Limpieza**
   - Elimino long-press, vibración, menú flotante y estado `showActions`.

6. **Desktop**
   - Sin cambios: drag-and-drop + acciones en hover.

7. **Verificación en viewport móvil**
   - Tap → aparecen los 3 botones y desaparecen las flechas.
   - Borrar quita el item y persiste tras recargar.
   - Duplicar y Subtarea añaden item debajo.
   - Al cerrar edición vuelven las flechas.