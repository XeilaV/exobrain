## Objetivo

Evitar solapamientos en la copa del árbol cuando hay muchas categorías (sobre todo en mobile) y, al desplegar las hijas de una nota, separar ligeramente esa nota madre del resto de la copa para que sus hijas se vean sin pisar otras categorías.

## Cambios en `src/components/GraphView.tsx`

### 1. Radio de la copa adaptativo al número de categorías

Hoy `catRadius` es un valor fijo (110 mobile / 150 desktop), por lo que con muchas categorías los círculos se solapan.

- Calcular el radio mínimo necesario para que dos categorías vecinas no se toquen, en función del ángulo entre ellas y del tamaño del nodo + padding:
  - `arcStep = Math.PI / Math.max(1, catCount - 1)` (la copa cubre 180°).
  - `minSpacing = 2 * CAT_R + (isMobile ? 28 : 36)` (incluye margen para la etiqueta).
  - `requiredRadius = minSpacing / (2 * Math.sin(arcStep / 2))` cuando `catCount >= 2`.
  - `catRadius = Math.max(baseRadius, requiredRadius)` con `baseRadius = isMobile ? 110 : 150`.
- Resultado: con 2-4 categorías el radio no cambia; a partir de ~5 crece automáticamente y el `fit-to-viewport` existente se encarga de escalar si rebasa la pantalla.

### 2. Empuje radial de la categoría/nota madre al expandirse

Para reproducir el efecto de la segunda imagen, cuando un nodo se expande se desplaza un poco hacia fuera respecto a su padre, separándose del resto de la copa.

- Nuevo helper `expansionOffset(depth, childCount)`:
  - `base = isMobile ? 28 : 36`.
  - Crece suavemente con hijos: `base + Math.min(40, childCount * 6)`.
- Aplicarlo en dos sitios:
  - **Categorías expandidas:** sumar el offset a lo largo del vector `(cos catAngle, sin catAngle)` antes de colocar la categoría y sus hijas, para que toda la sub-copa se aleje del hub.
  - **Notas expandidas (`placeNoteSubtree`):** sumar el mismo tipo de offset en la dirección `outwardAngle` antes de colocar la nota madre cuando `expanded === true`.
- Las hijas se siguen calculando relativas a la posición ya desplazada, así que el grupo madre+hijas se aleja en bloque y deja de pisar a las categorías vecinas.

### 3. Aumentar `spread` de las hijas cuando hay vecinas próximas

Pequeño ajuste en `placeNoteSubtree` y en el bloque de `rootNotes`: si `count >= 4`, usar un spread mínimo mayor para que las hijas no se peguen al nodo madre. Solo afecta a casos densos.

### 4. Verificación anti-solape en el `fit-to-viewport`

El bloque actual ya escala si la copa rebasa el viewport. Tras aplicar los puntos 1-3 sigue siendo válido; solo se asegura que `bottomMargin` y `topMargin` actuales se respeten. No se cambia la lógica de centrado vertical.

## Lo que NO se toca

- Lógica de doble-click, zoom-to-subtree, botón de árbol para reset.
- Posición del hub, longitud del tronco, ni el centrado vertical.
- Estilos, tipografía, edición de notas, drag&drop, ChatPanel.
- `NotesContext`, rutas, Supabase.

## Verificación

- Preview en mobile (390px) con 9-10 categorías como en la primera captura: ninguna debe solaparse con su vecina ni con la etiqueta.
- Expandir "Ideas escribir" con varias hijas: la categoría se separa visiblemente del resto y las hijas quedan en semicírculo sin pisar las categorías vecinas.
- Desktop sin cambios visibles cuando hay pocas categorías.
