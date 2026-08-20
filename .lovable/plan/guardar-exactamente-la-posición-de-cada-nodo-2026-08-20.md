# Guardar exactamente la posición de cada nodo

El objetivo será únicamente este: después de recolocar el árbol y recargar, todos los nodos deben aparecer exactamente en las mismas coordenadas del mapa.

## Posición manual siempre

El árbol pasará a ser de posición manual: la posición de cada nodo será un dato guardado, no un cálculo.

- El reparto automático se usará una sola vez, para dar posición inicial a una nota que aún no tiene ninguna (la primera carga y cada nota nueva). En cuanto existe posición guardada, esa es la que manda siempre.
- Al terminar de arrastrar un nodo, se guardará su posición final `x/y`.
- Si se mueve una madre, se guardarán también las posiciones finales de todas sus hijas, nietas y descendientes que se hayan desplazado con ella.
- Plegar, ocultar o mostrar ramas no recalculará ninguna posición: solo cambiará qué se ve.
- El botón **Guardar disposición** persistirá las coordenadas finales de todos los nodos como respaldo manual.
- **Restablecer todo** borrará las coordenadas y volverá a sembrar el árbol con el reparto automático.

La cámara (zoom y pan) seguirá siendo independiente: guardar nodos no obliga a guardar la vista.

## Mantener las ramas conectadas

Cada tramo se recalculará siempre entre las coordenadas finales reales de su madre y su hija, reutilizando su motivo Bézier. Así la rama permanece unida mientras se arrastra y después de recargar.

## No crear versiones por posición

Los cambios exclusivos de coordenadas no crearán entradas en el historial. El historial continuará registrando cambios reales de la nota: título, contenido, checklist, jerarquía, enlaces, tipo, icono, color y demás datos editables.

## Detalles técnicos

- Base de datos: añadir coordenadas absolutas `pos_x` y `pos_y` a `notes`, manteniendo los campos antiguos solo para compatibilidad durante el cambio.
- Migración: actualizar `snapshot_note_version()` para ignorar actualizaciones que solo cambien posición.
- `src/contexts/NotesContext.tsx` y tipos: leer, guardar en lote y limpiar las coordenadas absolutas.
- `src/components/GraphViewV2.tsx`: aplicar coordenadas guardadas como posición final, guardar el subárbol completo al mover una madre y dibujar cada rama entre sus extremos finales.
- Verificación en navegador: mover una nota; mover una madre con varios niveles; guardar; recargar; confirmar coordenadas idénticas y ramas conectadas; comprobar que esos movimientos no añaden versiones.
