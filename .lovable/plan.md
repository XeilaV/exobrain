# Plan: TaskSheet a pantalla casi completa + estilo bullet/task

## 1. TaskSheet ocupa casi toda la pantalla (mobile)

En `src/components/TaskSheet.tsx`:
- Cambiar `max-h-[88vh]` → `h-[96vh]` en móvil (`md:h-auto md:max-h-[80vh]`).
- Añadir `flex-1` al contenedor scrollable para que las subtareas queden accesibles sin tanto scroll.
- En desktop se mantiene el modal centrado con `md:max-w-md md:max-h-[80vh]`.

Resultado: al abrir una tarea en móvil se ve casi toda la pantalla, con las subtareas visibles sin scroll excesivo.

## 2. Estilo del ítem: bullet vs task (tipo Notion)

Añadir a cada `ChecklistItem` un campo opcional `style: "task" | "bullet"` (default `"task"`).

### Modelo (`src/types/notes.ts`)
```ts
export type ChecklistItemStyle = "task" | "bullet";
// añadir: style?: ChecklistItemStyle;
```
No requiere migración de BD: el checklist se guarda como JSON, así que el campo aparece automáticamente.

### UI en Tasks (`NotePostIt.tsx` lista + `TaskSheet.tsx`)
- Nuevo toggle pequeño junto al checkbox / en el header del sheet:
  - Icono `CheckSquare` (task) / `Dot` o `Circle` pequeño (bullet).
- Si `style === "bullet"`: render como viñeta (•) sin checkbox, sin estado completado, sin fecha (ocultamos secciones de Google Calendar y fecha en TaskSheet cuando es bullet).
- Si `style === "task"`: comportamiento actual (checkbox, fecha, Google Calendar, subtareas).

### UI en notas de texto (`RichTextEditor.tsx`)
TipTap ya trae `BulletList`. Añadir `TaskList` + `TaskItem` de `@tiptap/extension-task-list` / `@tiptap/extension-task-item` (ya deberían venir con StarterKit o instalar en fase de build).
- Botón nuevo en la toolbar junto a `BulletList` y `OrderedList`: **Task list** (icono `ListChecks`).
- Estilos en `src/index.css` para `ul[data-type="taskList"]` con casilla visible.

## Archivos a tocar
- `src/types/notes.ts` — añadir `style`.
- `src/components/TaskSheet.tsx` — altura casi-fullscreen, toggle bullet/task, ocultar campos cuando bullet.
- `src/components/NotePostIt.tsx` — render condicional del ítem según `style`.
- `src/components/RichTextEditor.tsx` — botón TaskList y extensiones.
- `src/index.css` — estilos `taskList`.
- `package.json` — añadir `@tiptap/extension-task-list` y `@tiptap/extension-task-item`.

## Fuera de alcance
- Sincronización con Google Calendar (queda para más tarde, como pediste).
- Migraciones de BD (no hacen falta, `checklist` es JSON).
