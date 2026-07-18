
# Sincronización bidireccional con Google Calendar

Cada usuario conecta su cuenta de Google. Los tokens los custodia el gateway de Lovable (nunca el navegador ni la base de datos del proyecto). La sincronización es **bidireccional** y **opt-in por tarea**: antes de crear un evento en Google se pregunta al usuario.

## 1. App User Connector (Google Calendar)

- Configurar cliente OAuth mediante `connector_app_user--connect_client` (connector_id `google_calendar`).
- Redirect URI en Google Cloud Console: `https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/callback`.
- Scopes: `userinfo.email`, `userinfo.profile`, `https://www.googleapis.com/auth/calendar.events`.

## 2. Modelo de datos

Nueva tabla `google_calendar_sync`:

```
task_id text PK        -- id del ChecklistItem o note_id si la nota tiene fecha
note_id uuid
user_id uuid
event_id text          -- id del evento en Google
calendar_id text       -- 'primary' por defecto
sync_status text       -- 'synced' | 'pending' | 'declined'
last_google_update timestamptz
last_local_update timestamptz
```

Con RLS `auth.uid() = user_id` y GRANTs a `authenticated` + `service_role`.

Añadir a `profiles`:
- `google_calendar_connected boolean default false`
- `google_calendar_last_sync timestamptz`

## 3. Flujo por tarea (opt-in)

Cuando el usuario guarda una tarea/nota con `dueAt`:

1. Si Google no está conectado → CTA para conectar.
2. Si está conectado → aparece un diálogo: **"¿Añadir esta tarea a tu Google Calendar?"** [Sí, una vez] [Sí, siempre para esta lista] [No].
3. Se guarda la elección en `google_calendar_sync.sync_status`.
4. Si acepta → edge function `google-calendar-sync-task` crea el evento y guarda `event_id`.

Al editar la tarea (título, fecha, notas) → si `sync_status = 'synced'` se actualiza el evento sin volver a preguntar. Al borrar la tarea o quitar la fecha → se borra el evento.

## 4. Flujo Google → ExoBrain

Edge function `google-calendar-pull` (invocada al abrir la app y cada ~5 min mientras está activa):

1. Llama `events.list` con `updatedMin = last_google_update` sobre calendario `primary`.
2. Para cada evento:
   - Si tiene mapping en `google_calendar_sync` → actualiza la tarea local (título, fecha, notas).
   - Si es un evento nuevo → muestra un diálogo en la app: **"Nuevo evento en tu calendario: '<título>'. ¿Añadirlo a ExoBrain?"** con selector de lista destino.
3. Deleciones en Google (evento cancelado) → se pregunta si borrar la tarea local o solo desincronizar.

Resolución de conflictos: gana la edición con `updated_at` más reciente; si empatan, se pregunta.

## 5. Edge Functions

- `google-calendar-status` — verifica conexión y devuelve estado.
- `google-calendar-sync-task` — POST/PATCH/DELETE de un evento a partir de un `ChecklistItem`.
- `google-calendar-pull` — trae cambios desde Google y devuelve la lista de nuevos eventos pendientes de confirmar.
- `google-calendar-disconnect` — borra mapeos y desactiva sync.

Todas usan `callAsAppUser` con el token del usuario autenticado (no se expone token al cliente).

## 6. UI

- Menú de usuario → "Conectar Google Calendar" (o "Desconectar" si ya está conectada).
- `TaskSheet`: badge/icono cuando la tarea está sincronizada; opción "Dejar de sincronizar" en el menú.
- Bandeja de "eventos nuevos de Google" (bottom-sheet) para aceptar/rechazar en bloque los eventos entrantes.

## 7. Seguridad

- Tokens OAuth solo en el gateway; ninguna edge function los devuelve al cliente.
- RLS estricta en `google_calendar_sync` y validación `auth.uid()` en cada edge function.
- Sincronización solo del calendario `primary` en la primera fase.

## Preguntas antes de implementar

1. Para eventos entrantes nuevos desde Google, ¿todos van a una lista fija (ej. "Google Calendar") o siempre preguntas la lista destino?
2. La opción "Sí, siempre para esta lista" ¿te interesa, o prefieres que siempre pregunte por cada tarea nueva?
