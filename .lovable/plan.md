
# Centrar el árbol y alargar el tronco en mobile

Ahora la captura sí se ve correctamente. El nodo "MyBrain" (raíz) queda demasiado abajo y se corta visualmente. Voy a reposicionar el layout para que el conjunto quede centrado verticalmente y el tronco entre raíz y hub sea más largo, como en la imagen de referencia.

## Cambios en `src/components/GraphView.tsx`

1. **Posición vertical del hub (punto central donde nacen las categorías):**
   - En mobile, mover el hub desde ~50% a ~42% del alto de la pantalla para dejar espacio al tronco inferior y a las categorías superiores.
   - En desktop mantener centrado.

2. **Posición del nodo raíz "MyBrain":**
   - Aumentar la distancia vertical entre hub y raíz: pasar de ~`trunkLength` actual (~180px) a ~260px en mobile.
   - Asegurar que `rootY = hubY + trunkLength` quede dentro del viewport con un margen inferior mínimo de 80px (clamp).

3. **Radio de las categorías:**
   - Reducir ligeramente el radio en mobile (de ~190px a ~170px) para que las categorías superiores no se salgan por arriba al subir el hub.

4. **Clamping del viewport:**
   - Recalcular bounding box del árbol completo (raíz + hub + categorías + hijos visibles) y, si excede la pantalla, aplicar un offset vertical que centre el bbox en el viewport disponible (descontando header móvil).

5. **Sin cambios** en lógica de expansión, semicírculo de hijas, zoom-to-subtree ni en el resto de interacciones.

## Notas técnicas

- Constantes a tocar: `HUB_Y_RATIO_MOBILE`, `TRUNK_LENGTH_MOBILE`, `CATEGORY_RADIUS_MOBILE` (nombres aproximados según el código actual; los identificaré al editar).
- Mantener el margen seguro contra el `ChatPanel` flotante inferior (~120px reservados).
- No tocar `NotesContext`, ni rutas, ni estilos globales.
