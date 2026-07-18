## Problema
En móvil, el drag-and-drop de items de lista (Reorder.Item con `touch-action: none`) captura el gesto de deslizar vertical, impidiendo hacer scroll dentro del post-it.

## Solución
Separar el comportamiento por dispositivo usando `useIsMobile()` en `PostItChecklistItem` (`src/components/NotePostIt.tsx`):

### En móvil
- Quitar `Reorder.Item` / `Reorder.Group` — renderizar los items como `<div>` normales para que el scroll vertical funcione sin interferencias.
- Quitar el icono `GripVertical` y `touch-action: none`.
- Añadir dos botones pequeños junto a la papelera: **▲ subir** y **▼ bajar** (iconos `ChevronUp` / `ChevronDown` de lucide-react), deshabilitados en el primer/último item respectivamente.
- Al pulsar, reordenar el array `checklist` moviendo el item una posición y llamar `updateNote(noteId, { checklist: newOrder })`.
- El tap sobre el texto sigue entrando en modo edición (comportamiento actual).

### En desktop
- Mantener el drag-and-drop actual con `Reorder.Group` / `Reorder.Item` y `GripVertical` visible.
- Sin cambios de sensibilidad ni de gesto.

### Detalles
- Detectar dispositivo con el hook existente `useIsMobile()` (`src/hooks/use-mobile.tsx`).
- El componente `NotePostIt` decide qué wrapper renderizar (`Reorder.Group` en desktop, `<div>` en móvil) y pasa la variante a los items.
- No se modifica el esquema de datos ni la lógica de persistencia.

## Archivos
- `src/components/NotePostIt.tsx` (única modificación)
