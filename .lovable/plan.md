## Objetivo

Permitir que el asistente IA **cree notas y temas nuevos** y **añada contenido a notas existentes**, con doble red de seguridad: **confirmación previa** + **historial de versiones**. La IA también podrá **buscar en internet** para redactar mejor, usando Gemini con grounding nativo a través de Lovable AI Gateway.

## Sobre ChatGPT y n8n

- **ChatGPT**: se resuelve con Lovable AI Gateway. Puedes usar GPT-5 o Gemini sin cuenta propia; se consume de tus créditos Lovable. No necesitas clave OpenAI.
- **n8n**: no se usa aquí. Para tu caso (búsqueda + escritura de notas) es innecesaria complejidad.

## Acciones que la IA podrá ejecutar

1. **Crear nota/tema**: la IA propone título, categoría y tipo (texto o tareas).
2. **Añadir contenido**: inserta texto al final de una nota existente.
3. **Buscar en internet**: devuelve resultados con fuentes citadas.

No se permitirá editar ni borrar contenido existente en esta versión para evitar miedos de pérdida de información.

## Red de seguridad

### 1. Confirmación previa (tool approval)
Antes de crear o añadir, la IA devuelve al chat una **tarjeta de propuesta** con:
- Acción: "Crear nota..." o "Añadir a 'Título de nota'..."
- Contenido propuesto.
- Botones **Aplicar** / **Descartar**.

Solo se persiste si el usuario pulsa Aplicar.

### 2. Historial de versiones persistente
Cada nota conserva un historial de cambios en una nueva tabla `note_versions`:
- Guarda copia del contenido y checklist en cada actualización.
- Accesible desde el post-it con un botón **⟲ Historial**.
- Permite ver versiones anteriores y restaurar.
- Retención: últimas 30 versiones por nota (autopurga).

## Cambios técnicos

### Base de datos
- Nueva tabla `note_versions`:
  - `id`, `note_id`, `content`, `checklist`, `source` (`user` / `ai`), `created_at`.
  - RLS por usuario vía `note_id` -> `notes.user_id`.
  - Trigger en `notes` para insertar versión automáticamente en cada UPDATE.

### Edge Function: `ai-agent`
- Reemplaza la edge function `chat` actual para soportar tool calling.
- Modelo: `google/gemini-2.5-flash` con grounding web.
- Herramientas:
  - `search_web`: búsqueda en internet con citas.
  - `create_note`: crea nota nueva.
  - `create_category`: crea tema nuevo.
  - `append_to_note`: propone añadir contenido a nota existente.
- Todas las herramientas de escritura devuelven propuesta al frontend; no persisten directamente.

### Frontend
- `ChatPanel.tsx`: actualizar para renderizar propuestas de acción con botones Aplicar/Descartar.
- `NotesContext.tsx`: añadir `applyAiAction()` y `restoreVersion()`.
- Nuevo componente `NoteVersionHistory.tsx`: modal de historial desde el post-it.
- Mostrar citas de fuentes web en las respuestas del asistente.

## Implementación paso a paso

1. **Migración** de base de datos para `note_versions` y trigger.
2. **Refactorizar** edge function `chat` a `ai-agent` con tools y grounding.
3. **Actualizar** `ChatPanel` para manejar propuestas de acción.
4. **Añadir** historial de versiones en el post-it.
5. **Probar** flujo: pedir a la IA crear una nota, buscar info, añadir contenido, deshacer desde historial.

## Limitaciones iniciales

- Edición y borrado de notas existentes por IA quedan fuera de alcance por seguridad.
- No se integra n8n ni cuenta OpenAI propia.
