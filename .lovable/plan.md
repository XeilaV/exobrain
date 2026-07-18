# Drag-and-drop de items desde el asa lateral

## Objetivo
Los items de una nota tipo lista (y las subtareas dentro de `TaskSheet`) se reordenan arrastrando desde el icono lateral izquierdo (`GripVertical`, los "cuatro puntos"). Un toque sobre el texto seguirá abriendo la edición. Se eliminan las flechas ▲/▼.

## Cambios

### 1. `src/components/NotePostIt.tsx` — `PostItChecklistItem`
- Unificar mobile y desktop en un único `Reorder.Item` con `dragListener={false}` y `dragControls = useDragControls()`.
- El icono `GripVertical` (izquierda) recibe `onPointerDown={(e) => dragControls.start(e)}`, `style={{ touchAction: "none" }}` y `cursor-grab`. Tamaño táctil ampliado en mobile (~w-9 h-9).
- Solo ese asa lleva `touch-none`; el resto del item deja de tenerlo para que el scroll vertical del panel siga funcionando en mobile.
- Se eliminan los botones `ChevronUp`/`ChevronDown` y la prop `onMove`/`isFirst`/`isLast` de la rama mobile (y se retira su render).
- Tap sobre el texto sigue abriendo la edición vía `onOpenSheet` (mobile) o `startEdit` (desktop) — sin cambios de comportamiento.
- Se mantiene `Reorder.Group` existente (línea 386) que llama a `handleReorder`.

### 2. `src/components/TaskSheet.tsx` — lista de subtareas
- Envolver las subtareas en un `Reorder.Group axis="y" values={subtasks} onReorder={...}` y cada fila en `Reorder.Item` con `dragListener={false}` + `useDragControls`.
- Añadir un `GripVertical` a la izquierda de cada subtarea como asa (con `onPointerDown` → `controls.start(e)`).
- Eliminar los botones `ChevronUp`/`ChevronDown` y la prop `onMoveSubtask` de la UI. Se conserva la función en el padre por ahora (llamada desde el nuevo `onReorder` que calcula los movimientos), o se sustituye por una acción de reorden equivalente que persista el nuevo orden en el mismo array `checklist` de la nota.

### 3. Limpieza
- Quitar imports no usados (`ChevronUp`, `ChevronDown`) en ambos archivos si dejan de referenciarse.
- Mantener `onMoveSubtask` en el padre si aún lo usa el flujo de reorden; si no, retirarlo también.

## Notas técnicas
- `Reorder.Item` con `dragListener={false}` + `useDragControls` es el patrón oficial de Framer Motion para "drag por asa", evitando conflictos con el scroll y con el tap-para-editar.
- `touchAction: "none"` se limita al asa: así en mobile el usuario puede desplazar la lista con el dedo sobre el texto y solo entra en modo arrastre al presionar el asa.
