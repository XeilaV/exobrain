# Rehacer el árbol como copia literal de la forma del SVG

Objetivo: que el árbol se vea como `Group-8-2.svg`, no como una geometría "inspirada" en él. Se tira toda la maquinaria actual de motivos/sectores/aridades y se sustituye por **plantillas literales** extraídas del archivo.

## Lo que se ha comprobado en el SVG

- Hay **un tronco azul** (`#1957C3`) con dos ramitas cortas y un punto grande abajo (`rect` r=9 en `211,443`).
- Del tronco salen **4 racimos de color** (turquesa, naranja, rosa, amarillo). Los cuatro son **exactamente el mismo dibujo**: el racimo naranja es el turquesa desplazado, y rosa/amarillo son los mismos pero espejados en X (`matrix(-1 0 0 1 ...)`).
- Todo el trazo es `stroke-width="2"`, sin degradados ni grosor variable.
- Los nodos son círculos de 3 tamaños: 15px (nodo raíz del racimo), 7px (nodos intermedios) y 5px (hojas).
- Cada racimo tiene una topología fija: raíz → 2 salidas principales → subramas onduladas con hojas al final (~13 nodos por racimo).

## Qué se hace

1. **Extraer literalmente** (en tiempo de implementación, con un script; el resultado queda como datos en el código, sin leer el SVG en runtime):
   - El path del tronco y sus dos ramitas.
   - **Un racimo completo** como plantilla: sus paths `d` tal cual, normalizados al origen de su nodo raíz, con la lista de slots (posición de cada nodo, su tamaño 15/7/5, y a qué path pertenece).
2. **Nuevo `src/lib/treeShape.ts`** con `TRUNK` y `CLUSTER_TEMPLATE` como constantes, y un layout que:
   - coloca cada nota raíz en uno de los puntos de enganche del tronco, alternando espejo X igual que el SVG (der, der, izq, izq);
   - asigna las notas descendientes a los slots de la plantilla **en orden de profundidad**, respetando la jerarquía real (una nota va a un slot hijo del slot de su madre);
   - si un tema tiene más notas que slots, **repite la plantilla en escala reducida** colgando del slot ocupado (el mismo dibujo, más pequeño), en vez de inventar ángulos;
   - si tiene menos, deja los paths sobrantes sin dibujar.
   - Más de 4 temas: se siguen añadiendo enganches en el tronco (que se alarga) reutilizando las mismas 2 orientaciones.
3. **Render en `GraphViewV2.tsx`**: se dibujan los paths de la plantilla transformados (escala + espejo + traslación) y los círculos en los slots ocupados. `stroke-width: 2` fijo con `vector-effect="non-scaling-stroke"`; el color lo pone el tema de cada nota.
4. **Limpieza**: se elimina `src/lib/treeGeometry.ts` (FORK_MOTIFS, sectores, composición de aridades, decaimiento, `segmentPath`) y el código de `GraphViewV2.tsx` que dependía de él, incluida la pasada de separación de etiquetas basada en ángulos de rama.

## Se conserva

Pan/zoom anclado, selección con atenuación del resto, doble clic para plegar (un slot plegado no dibuja su subárbol), etiquetas de nombre, colores por tema, y todos los diálogos y funcionalidad de notas. Sin cambios de backend.

## Criterio de aceptación

Puesto al lado del SVG, el árbol se reconoce como el mismo dibujo: mismo tronco, mismos racimos ondulados, mismo grosor de línea uniforme y mismos tamaños de punto.
