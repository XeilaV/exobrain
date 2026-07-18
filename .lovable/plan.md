## Objetivo
Reajustar los ítems de las notas tipo tasks en móvil para que el texto respire (~80% del ancho), los controles ocupen menos, y toda la edición ocurra dentro del TaskSheet (que ahora también tendrá Copiar).

## 1. `src/components/NotePostIt.tsx` — render móvil del ítem (líneas 85–128)

- **Texto ocupa ~80%**: el contenedor del texto pasa a `flex-1` con `basis-[80%]`, sin el modo inline `isEditing` en móvil.
- **Tap = abrir TaskSheet** (no edición inline). El click en el texto llama a `onOpenSheet?.()` en lugar de `startEdit`.
  - Se elimina en móvil el `textarea` inline y el estado `isEditing` para móvil (queda solo para desktop).
- **Controles compactos**:
  - Quitar el botón `MoreHorizontal` (los "tres puntos") — ya no hace falta porque el tap abre el sheet.
  - Botones ▲/▼ pasan de `min-w-9 min-h-11` a un tamaño más contenido: `w-8 h-8` con icono `size={16}`, agrupados en columna estrecha `flex-col gap-0` a la derecha, para ocupar menos ancho horizontal.
  - Checkbox/bullet en móvil baja de `min-w-11` a `w-9 h-9` con icono `size={20}`.
- **Contenedor**: `min-h-14` se mantiene; padding lateral se reduce ligeramente (`px-1`).
- Resultado: checkbox (~36px) + texto (flex-1, ~80%) + columna ▲▼ (~32px). Sin "...".

## 2. `src/components/TaskSheet.tsx` — añadir "Copiar" junto a "Borrar"

En el header (junto al botón `Trash2`), añadir un botón con icono `Copy` que copia al portapapeles el título del task (`navigator.clipboard.writeText(task.text)`) y muestra `toast.success("Copiado")`.
- Importar `Copy` de lucide-react y `toast` de sonner (ya usado en el proyecto).
- Mismo tamaño de área táctil que los otros botones del header (`min-h-11 min-w-11`).

## Fuera de alcance
- Desktop: se mantiene el layout actual (Reorder + acciones hover).
- No se toca la persistencia, TaskSheet body, ni la lógica de subtareas.
