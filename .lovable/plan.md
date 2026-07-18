
# Rediseño: Listas → Tasks (estilo Google Tasks)

## 1. Modelo de datos

Ampliar el JSON `checklist` de cada nota tipo `checklist` para que cada item sea una **Task** con:

```ts
type Task = {
  id: string;
  text: string;
  notes?: string;          // descripción larga
  completed: boolean;
  dueAt?: string | null;   // ISO datetime (fecha + hora opcional)
  hasTime?: boolean;       // false = solo fecha, true = fecha + hora
  remindAt?: string | null;
  parentId?: string | null; // subtareas anidadas
  order: number;
  // sync opcional Google
  googleTaskId?: string;
  googleEventId?: string;
  updatedAt: string;
};
```

Nueva tabla `user_integrations` para guardar preferencias de sync por usuario:
- `google_tasks_enabled bool`, `google_calendar_enabled bool`
- `google_tasklist_id text` (lista de destino en Google Tasks)
- `google_calendar_id text`
- `last_sync_at timestamptz`

Con RLS + GRANT estándar (`auth.uid() = user_id`).

## 2. UI móvil — flujo de creación y edición

**Item en lista (estado normal, ≥70% ancho útil):**
```text
[ ] Título de la tarea            📅 mar 21   ▲ ▼
    ↳ 2 subtareas
```
- Tap corto en el checkbox → completar.
- Tap corto en el texto → **input rápido inline** para renombrar.
- Icono "expandir" (o long-press) → abre **bottom-sheet** con edición completa.

**Creación:**
- Input rápido al pie de la lista: escribes título → Enter añade y limpia.
- Botón "＋ opciones" a la derecha del input → crea la task y abre bottom-sheet.

**Bottom-sheet de edición (≈85% alto):**
- Título (input grande)
- Notas (textarea multilinea)
- Fecha (date picker) + toggle "añadir hora" (time picker)
- Recordatorio (toggle + selector)
- Subtareas (mini-lista con reorden ▲▼ y add)
- Botones: Guardar / Eliminar

Reutiliza los estilos actuales (`bg-card`, tokens semánticos, modo oscuro) y respeta accesibilidad móvil (targets ≥44px, texto ≥14px).

## 3. Sincronización con Google (opcional, por usuario)

Ajustes en el menú de perfil → sección **Integraciones**:
- Toggle "Sincronizar con Google Tasks"
- Toggle "Sincronizar recordatorios con Google Calendar"
- Selector de lista de Google Tasks destino
- Selector de calendario destino

Usa **App User Connectors** (cada usuario conecta su propia cuenta):
- `google_tasks` para tasks
- `google_calendar` para eventos/recordatorios

Sync bidireccional vía Edge Functions:
- `sync-google-tasks` (pull + push, guarda `googleTaskId`)
- `sync-google-calendar` (crea eventos para tasks con `remindAt`)
- Trigger: al abrir la app, al editar una task, y botón "Sincronizar ahora"

Si el usuario **no activa** ninguna integración, todo funciona 100% local en ExoBrain (comportamiento por defecto).

## 4. Migración de datos existentes

Los items actuales `{id, text, completed}` se leen tal cual y se tratan como Tasks sin fecha, sin subtareas, `order` = índice en el array. Sin migración SQL destructiva.

## 5. Detalles técnicos

- Nuevo componente `src/components/TaskSheet.tsx` (bottom-sheet con framer-motion).
- Nuevo componente `src/components/TaskListView.tsx` que sustituye la sección de checklist actual dentro de `NotePostIt.tsx` cuando `noteType === "checklist"`.
- `NotesContext`: nuevas funciones `updateTask`, `addSubtask`, `moveTask`. El debounce actual (`persistChecklist` 250ms) se mantiene.
- `src/lib/tasks.ts`: helpers para árbol de subtareas y formato de fechas (usar `date-fns` ya presente).
- Date picker: shadcn `Calendar` en un `Popover` dentro del sheet (con `pointer-events-auto`).
- Google sync: `src/integrations/lovable/appUserConnector.ts` + edge functions `sync-google-tasks` y `sync-google-calendar`. Solo se cargan si el usuario activa la integración.
- Sin cambios en desktop más allá de exponer los nuevos campos (fecha, notas, subtareas) en el mismo panel lateral existente.

## 6. Orden de implementación

1. Modelo `Task` + migración de tipos + `TaskListView` con item ancho al 70%+ y flechas.
2. `TaskSheet` con título, notas, fecha/hora, recordatorio, subtareas.
3. Input rápido + botón "＋ opciones".
4. Tabla `user_integrations` + pantalla de Integraciones.
5. Conectar Google Tasks (App User Connector) + edge function de sync.
6. Conectar Google Calendar + sync de recordatorios.
7. Verificación en viewport móvil (393×667) con Playwright: crear, editar, subtarea, fecha, completar, sync.
