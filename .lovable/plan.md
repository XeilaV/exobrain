## Plan

### 1. Distribución vertical escalonada de notas en mobile (anti-solape)
En `src/components/GraphView.tsx`, dentro del cálculo de layout, aplicar un offset vertical alternado a los hermanos del mismo nivel (zig-zag pequeño) cuando el ancho de pantalla es reducido:
- Para cada grupo de hermanos, alternar la `y` base con `±STAGGER` (≈18–24px) según el índice (par/impar), o usar un patrón de 3 alturas.
- Mantener clamp al viewport y propagación de drag a descendientes ya existentes.
- Aplicar el escalonado tanto en categorías como en notas hijas, con magnitud menor en desktop (o sólo si `window.innerWidth < 640`).

### 2. Hijas cerradas por defecto, madres abiertas
Actualmente las notas tienen `is_collapsed default true`. Lo que falta es asegurar que:
- Las **notas raíz de cada categoría** (sin `parent_note_id`) se muestran al expandir la categoría — ya ocurre.
- Las **sub-notas** (con `parent_note_id`) permanecen ocultas hasta doble-click en su madre — verificar render en `GraphView.tsx`: cuando `is_collapsed` de una nota madre es true, no se renderizan sus hijas ni sus enlaces.
- Ajustar la lógica de visibilidad para que el primer nivel de notas bajo una categoría se muestre cuando la categoría está expandida, pero las sub-notas (nietas y siguientes) sólo si su madre tiene `is_collapsed=false`.

### 3. Login: recuperar contraseña + Google Sign-In
En `src/pages/Auth.tsx`:
- Añadir botón **"¿Olvidaste tu contraseña?"** que pida email y llame a `supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + '/reset-password' })`.
- Crear página `src/pages/ResetPassword.tsx` con formulario de nueva contraseña (`supabase.auth.updateUser({ password })`), y registrarla como ruta pública en `src/App.tsx`.
- Añadir botón **"Continuar con Google"** usando `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`. Se configurará el provider Google vía `supabase--configure_social_auth` (managed, sin claves).

### Archivos a tocar
- `src/components/GraphView.tsx` — escalonado vertical + visibilidad sub-notas
- `src/pages/Auth.tsx` — botón Google + enlace olvidé contraseña
- `src/pages/ResetPassword.tsx` *(nuevo)*
- `src/App.tsx` — ruta `/reset-password`
- Configuración: habilitar Google OAuth gestionado

### Notas
- No se modifica la BD; `is_collapsed` ya existe en `notes` y `categories`.
- El reset de contraseña usa email (ya activo). Sin auto-confirm.
