Plan para convertir el historial en una recuperación real y segura:

1. **Proteger lo que hay ahora**
   - Antes de tocar la lógica, hacer una copia/export interno de las notas y versiones actuales.
   - Confirmado: hay versiones guardadas; `Refraneiro` aún tiene 11 snapshots recuperables.

2. **Cambiar el historial de “cambios parciales” a snapshots reales**
   - Ampliar `note_versions` para guardar toda la nota, no solo `content` y `checklist`:
     - título
     - contenido
     - checklist
     - tipo de nota
     - tema/categoría
     - madre/padre
     - enlaces
     - icono
     - posición/estado relevante si aplica
   - Dejar de borrar versiones importantes tan agresivamente; el límite actual de 30 por nota puede cargarse historial útil.

3. **Restaurar de verdad, sin crear un cambio normal encima**
   - Sustituir el botón actual de restaurar, que usa `updateNote`, por una restauración backend atómica.
   - La restauración debe:
     - guardar primero el estado actual como “antes de restaurar”
     - aplicar exactamente la versión elegida
     - marcarla como `restore`, no como edición normal
     - refrescar la nota en pantalla desde la base de datos
   - Así “restaurar” será deshacer/volver a esa versión, no una edición más confusa.

4. **Recuperación de notas eliminadas**
   - Cambiar el historial para que las versiones no desaparezcan al borrar una nota.
   - Añadir snapshots de borrado, para poder ver y recuperar notas eliminadas.
   - Mostrar notas borradas en el historial con opción **Recuperar como nota nueva**.

5. **Historial usable y claro**
   - El historial mostrará por nota:
     - fecha
     - título en ese momento
     - tipo de evento: edición, restauración, borrado
     - previsualización real
     - botón **Vista previa**
     - botón **Restaurar esta versión**
   - En móvil ocupará casi toda la pantalla para poder leer antes de restaurar.

6. **Caso inmediato de Refraneiro**
   - Añadir una pantalla/flujo que permita abrir las 11 versiones existentes de `Refraneiro` y restaurar una concreta.
   - Las versiones ya existentes solo tienen contenido/checklist, no estructura completa, pero sirven para recuperar el texto guardado.

7. **Verificación**
   - Probar crear/editar/restaurar una nota.
   - Probar restaurar `Refraneiro` desde una versión anterior.
   - Probar que restaurar no genera una cadena de cambios confusa.
   - Probar que borrar una nota deja una versión recuperable.