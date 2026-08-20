# Rehacer la forma del árbol al estilo del SVG

Objetivo: un árbol ramificado que **se parezca** a `Group-8-2.svg` — tronco vertical, racimos que se abren a los lados, ramas onduladas y grosor de línea uniforme — sin perseguir una copia pixel a pixel. Prioridad: que funcione y se vea orgánico.

## Lo que se ha comprobado en el SVG

- Un tronco azul (`#1957C3`) casi vertical con un punto grande abajo (r=9) y un par de ramitas cortas.
- Cuatro racimos de color con el mismo dibujo, dos a la derecha y dos espejados a la izquierda.
- Todo el trazo es `stroke-width="2"` uniforme, sin degradados ni grosor variable.
- Nodos en tres tamaños: 15px (raíz del tema), 7px (intermedios), 5px (hojas).
- Las ramas son curvas en S suaves: salen casi horizontales del punto de unión y giran hacia arriba/abajo; los tramos se acortan claramente al alejarse del tronco.

## Qué se hace

1. **Nuevo `src/lib/treeShape.ts`** con un generador simple y determinista (hash del id de la nota, sin aleatoriedad por render):
   - Tronco vertical con un punto de enganche por tema, ordenados de abajo arriba.
   - Cada tema sale del tronco alternando lado (der/der/izq/izq como en el SVG) y ocupa un sector angular propio, de altura proporcional a su descendencia, para que no se solapen.
   - Las hijas se reparten dentro del sector con un abanico suave; la longitud de cada tramo decae ~0.75 por nivel, tomando como referencia las longitudes medidas en el SVG.
   - Cada segmento es una cúbica en S con la misma personalidad del SVG: tangente casi horizontal al salir de la unión y al llegar al nodo, con una ondulación leve dependiente del hash.
   - La rama madre termina exactamente en el punto de unión y cada hija arranca en ese mismo punto.
2. **Render en `GraphViewV2.tsx`**: `stroke-width` 2 fijo con `vector-effect="non-scaling-stroke"` para todos los tramos (fuera el grosor por profundidad), nodos como círculos de 15/7/5 según profundidad, color del tema en toda la rama y azul en el tronco.
3. **Limpieza**: se elimina `src/lib/treeGeometry.ts` completo (FORK_MOTIFS, motivos, composición de aridades, sectores actuales, `segmentPath`, `strokeForDepth`) y todo el código de `GraphViewV2.tsx` que dependía de él, incluida la pasada de separación de etiquetas por ángulo de rama, sustituida por un desplazamiento vertical simple cuando dos píldoras chocan.

## Se conserva

Pan/zoom anclado, selección con atenuación del resto, doble clic para plegar, etiquetas, colores por tema, arrastre de nodos y todos los diálogos y funcionalidad de notas. Sin cambios de backend.

## Criterio de aceptación

El árbol se lee como el del SVG: tronco central, racimos laterales equilibrados, curvas orgánicas, línea de grosor uniforme y puntos de tres tamaños — sin ramas que se crucen ni etiquetas superpuestas.
