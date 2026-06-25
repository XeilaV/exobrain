## Objetivo

Al desplegar una categoría o nota:
1. Hacer menos zoom (más aire visual, pero los nodos llegan casi al borde).
2. Separar más el nodo desplegado del resto del árbol para aislar visualmente la rama enfocada.
3. Reducir el margen lateral en mobile para que los nodos puedan llegar casi al borde de la pantalla.

## Cambios en `src/components/GraphView.tsx`

### 1. Mayor separación radial del nodo desplegado (lines 117-122)

Aumentar `expansionOffset` para que el nodo enfocado se aleje más de sus hermanos:

```ts
const expansionOffset = (childCount: number) => {
  const base = isMobile ? 70 : 80;        // antes: 28 / 36
  return base + Math.min(60, childCount * 8); // antes: max 40, *6
};
```

Esto empuja la categoría/nota expandida claramente fuera de la copa del árbol, dejando aire entre ella y los nodos vecinos (como en la imagen de referencia donde la rama enfocada se separa del resto).

### 2. Reducir el zoom y márgenes laterales mínimos (lines 482-499)

```ts
const isMobile = size.w < 640;
const pad = isMobile ? 4 : 12;             // antes: 12 / 20 → casi pegado al borde
const minX = Math.min(...pts.map(p => p.x)) - pad;
const maxX = Math.max(...pts.map(p => p.x)) + pad;
const minY = Math.min(...pts.map(p => p.y)) - pad;
const maxY = Math.max(...pts.map(p => p.y)) + pad;
const bw = Math.max(1, maxX - minX);
const bh = Math.max(1, maxY - minY);
const marginTop = 48;
const marginBottom = isMobile ? 90 : 70;
const marginLeft = pad;
const marginRight = pad;
const availW = Math.max(1, size.w - marginLeft - marginRight);
const availH = Math.max(1, size.h - marginTop - marginBottom);
// Menos zoom: bajar tope de escala y aplicar factor 0.85 para dejar aire
const rawScale = Math.min(availW / bw, availH / bh);
const scale = Math.min(rawScale * 0.9, 1.9);  // antes: tope 2.6 sin factor
const tx = marginLeft + (availW - bw * scale) / 2 - minX * scale;
const ty = marginTop + (availH - bh * scale) / 2 - minY * scale;
```

- `pad` baja a 4px en mobile → los nodos pueden llegar casi al borde.
- `rawScale * 0.9` deja un 10% de aire para que no se vea apretado.
- Tope de escala baja de `2.6` a `1.9` → zoom global menos agresivo, mayor nitidez de contexto.

### 3. Sin cambios

- Layout base del árbol, `placeNoteSubtree`, `catRadius` adaptativo, drag, post-it, ChatPanel, rutas, datos.

## Verificación

- Mobile 390×844: expandir "Ideas escribir" → la categoría se separa visiblemente del resto, sus hijas se extienden casi hasta los bordes laterales, sin solapamiento con el header (48px) ni el botón de chat (90px). El zoom es notablemente menor que antes.
- Desktop: misma mejora, con tope 1.9× evitando que un subtree pequeño se acerque demasiado.
- Colapsar restaura la vista inicial (sin focus).
