## Cambios

### 1. Edición de items de lista con un solo tap + drag-and-drop
En `src/components/NotePostIt.tsx` (`PostItChecklistItem`):
- Sustituir la actual detección de doble click / long-press por **single tap = editar** (`onClick` sobre el texto entra en modo edición).
- Mantener drag-and-drop mediante `Reorder.Item` de framer-motion, pero mover el "asa" a **todo el item** (drag por toda la fila) en vez de solo el icono `GripVertical`. Se conserva el icono como pista visual. El `<span>` de texto queda con `pointer-events` habilitados; el tap corto edita, el arrastre mueve — framer-motion distingue ambos gestos por umbral de movimiento.
- Eliminar la lógica `longPressRef` (ya no necesaria).

### 2. Madres e hijas como enlaces navegables
Ya existe la sección "Hijas" y el botón hacia la madre en el header. Ajustes:
- Añadir una sección **"Madre"** dentro del bloque inferior (junto a "Hijas" / "Enlazadas") mostrando la nota madre como chip clicable con su icono/tipo, además del atajo en el breadcrumb.
- Al pulsar cualquier chip (madre, hija, enlazada) → `setSelectedNoteId(id)` mantiene el post-it abierto y carga la nota destino (ya soportado por el `useEffect` en `GraphView`). Confirmar que no se cierra el post-it.

### 3. Pedir nombre al crear tema / nota / lista
En vez de crear con títulos por defecto ("Nueva nota", "Nueva lista", "📌 Nuevo tema"), pedir el nombre antes de crear.

- Crear componente reutilizable `src/components/NameInputDialog.tsx`: modal simple centrado con input, botones "Crear" / "Cancelar", soporte Enter/Escape, autofocus. Props: `title`, `placeholder`, `initialValue`, `onSubmit(name)`, `onCancel()`.
- **Temas**: en `src/components/GraphView.tsx` (menú contextual de nuevo tema) y `AppSidebar.tsx` reemplazar el flujo actual por abrir el diálogo. El sidebar ya tiene input inline — se sustituye por el modal para unificar UX.
- **Notas / listas hijas**: en `NotePostIt.tsx` los botones "Hija" y "Lista" abren el diálogo; al confirmar, llamar `addNote(categoryId, parentId, type)` y luego `updateNote(newId, { title })`.
- **Notas / listas raíz**: mismo tratamiento en los puntos del `GraphView` donde se crean notas sueltas (menú contextual sobre un tema).
- Si el usuario cancela → no se crea nada. Si deja vacío → usar el default actual como fallback.

### Detalles técnicos

- `Reorder.Item` de framer-motion: el drag funciona sobre todo el elemento por defecto; sólo hay que quitar el `cursor-grab` exclusivo del `GripVertical` y aplicar `touch-action: none` al contenedor de la fila para no perder gestos en móvil.
- Umbral tap-vs-drag: framer-motion usa ~3px; suficiente para distinguir tap corto (editar) de arrastre.
- El modal `NameInputDialog` se monta condicionalmente con estado local en cada consumidor (`{ open, kind: 'note'|'checklist'|'category', parentId?, categoryId? }`). Sin cambios de contexto ni DB.
- Sin cambios en el esquema de base de datos.

### Archivos a tocar
- `src/components/NotePostIt.tsx` (edición tap, sección Madre, diálogos de creación de hijas)
- `src/components/NameInputDialog.tsx` (nuevo)
- `src/components/GraphView.tsx` (diálogos para tema y nota raíz)
- `src/components/AppSidebar.tsx` (unificar creación de tema con el diálogo)
