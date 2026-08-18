# Jerarquía unificada + "Mover a…"

Todo pasa a ser un mismo tipo de elemento: **nodos-nota**. Lo que hoy es un "tema" se convierte en una nota situada directamente bajo Exobrain. El nivel de cada nota depende solo de dónde cuelga, con profundidad ilimitada.

## Qué cambia para ti

- Una nota colgada de Exobrain es rama principal; colgada de otra nota es rama hija, y así sin límite de niveles.
- Cualquier nota puede tener contenido (texto o lista) y a la vez notas debajo.
- Nueva acción **"Mover a…"** en la pulsación larga sobre el nodo y en el menú de la nota abierta.
- El selector de destino ofrece tres formas de elegir:
  - **Exobrain** (convierte el elemento en rama principal).
  - **Navegador jerárquico** con búsqueda por nombre, entrando nivel a nivel.
  - **Señalar en el mapa**: cierras el diálogo y tocas el nodo destino, igual que al enlazar notas.
- Antes de confirmar se muestra el destino y cuántos descendientes se moverán con él.
- No se puede mover una nota dentro de sí misma ni de sus descendientes (esos destinos aparecen deshabilitados).
- El color se hereda de la rama principal a la que pertenezca tras el movimiento; el icono propio de cada nota se conserva.
- Los enlaces entre notas son independientes de la jerarquía y quedan intactos.

## Migración de datos (sin pérdida)

1. Se añade color a las notas y el tema deja de ser obligatorio.
2. Cada tema actual se convierte en una nota raíz con su nombre, icono y color.
3. Las notas que colgaban de ese tema pasan a colgar de esa nueva nota raíz; el resto de la jerarquía y los enlaces quedan igual.
4. La tabla de temas se conserva intacta durante la transición como copia de seguridad, sin usarse en la app.
5. Antes de migrar se hace una exportación de respaldo de notas, temas e historial.

## Detalles técnicos

**Base de datos**
- `notes`: añadir `color text`, permitir `category_id` nulo, índice por `parent_note_id`.
- Script de datos: insertar una nota raíz por cada fila de `categories` (título, icono, color, `parent_note_id = null`), reasignar `parent_note_id` de las notas raíz de esa categoría a la nueva nota, y guardar el mapeo categoría→nota.
- Ajustar `restore_note_version` y `recover_deleted_note_version` para no exigir categoría y para restaurar también `color`; incluir `color` en `note_versions` y en el trigger `snapshot_note_version`.
- Nueva función `move_note(_note_id, _new_parent_id)` que valida propiedad, rechaza ciclos (destino dentro de la descendencia) y propaga el color de la raíz a todo el subárbol en una sola transacción.

**Estado y lógica (`src/contexts/NotesContext.tsx`)**
- `Note` gana `color`; `categoryId` pasa a opcional/legacy.
- Nuevos helpers: `getRootNotes()`, `getDescendantIds(id)`, `getRootAncestor(id)`, `canMoveTo(id, targetId)`, `moveNote(id, targetId | null)` (llama a la RPC y actualiza el estado local optimista).
- `addNote`, `applyAiAction` y `createNoteFromChat` dejan de requerir categoría y heredan color del padre.
- Se mantienen `linkNotes`/`unlinkNotes` sin cambios.

**Grafo (`src/components/GraphView.tsx`)**
- El layout radial se construye desde `notes` con `parentNoteId === null` en lugar de `categories`; el resto del cálculo de ramas, colapso, arrastre y foco se reutiliza tal cual.
- El menú contextual de nodo pasa a ser único (ya no hay ramas `cat-` vs `note-`) con: añadir hija (texto/lista), renombrar, color, icono, enlazar, **Mover a…**, eliminar.
- Modo "señalar destino" reutilizando el patrón existente de `linkingNoteId`.

**UI nueva (`src/components/MoveToDialog.tsx`)**
- Navegador jerárquico con miga de pan, buscador por nombre sobre todo el árbol, opción raíz "Exobrain", destinos inválidos deshabilitados y resumen de confirmación con el número de descendientes.

**Pantallas afectadas**
- `NotePostIt.tsx`: el selector "Depende de…" se sustituye por el botón "Mover a…" que abre el mismo diálogo.
- `CreateNodeDialog.tsx`: elegir madre con el mismo navegador jerárquico.
- `exportNotes.ts` e `HistoryDialog.tsx`: exportar/mostrar según la jerarquía de notas en vez de temas.
