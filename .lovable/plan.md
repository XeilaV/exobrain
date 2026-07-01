## Objetivo
Al hacer zoom sobre un nodo desplegado, sus hijas deben acercarse mucho más al borde de la pantalla. Hoy el padding del zoom es demasiado grande (70px móvil / 90px desktop), dejando mucho aire alrededor y haciendo que el subárbol se vea pequeño.

## Cambios (solo en `src/components/GraphView.tsx`, dentro del `useMemo` `viewTransform`, líneas 468–495)

1. **Reducir el padding del bounding box** del subárbol enfocado:
   - Móvil: `pad = 12`
   - Desktop: `pad = 20`
   Esto permite que las hijas casi toquen el borde de la pantalla.

2. **Usar márgenes asimétricos** en el cálculo del zoom para respetar las zonas con UI flotante (sin desperdiciar espacio en los lados donde no hay nada):
   - `marginTop`: 48 (botones superiores: cuenta, notificaciones, ojo, +).
   - `marginBottom`: 90 móvil / 70 desktop (botón flotante del chat ✨).
   - `marginLeft` = `marginRight` = `pad` (los laterales pueden llegar casi al borde).
   - Ancho disponible = `size.w - marginLeft - marginRight`; alto disponible = `size.h - marginTop - marginBottom`.
   - `scale = Math.min(availW / bw, availH / bh, 2.6)`.
   - Centrar el subárbol dentro del rectángulo disponible:
     ```
     tx = marginLeft + (availW - bw * scale) / 2 - minX * scale
     ty = marginTop  + (availH - bh * scale) / 2 - minY * scale
     ```

3. **No tocar** nada más: layout base del árbol, `expansionOffset`, `catRadius` adaptativo, drag, edición post-it, ChatPanel, rutas ni datos.

## Verificación
- Móvil 390×844, expandir una categoría con varias hijas: el subárbol llega casi al borde lateral, sin solapar el header superior ni el botón del chat inferior.
- Desktop: mismo comportamiento con más margen vertical.
- Colapsar restablece la vista (sin cambios).