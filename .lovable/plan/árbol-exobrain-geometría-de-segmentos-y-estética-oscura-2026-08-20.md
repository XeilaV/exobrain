# Árbol ExoBrain: geometría de segmentos y estética oscura

Rehacer solo la geometría del árbol y su render SVG en la vista actual (`GraphViewV2`), siguiendo `Group 8.svg` como patrón de forma y el HTML adjunto como referencia de estilo. Sin tocar base de datos, notas, chat, tareas ni backend.

## Geometría (el cambio de fondo)

Se abandona el modelo "coloco nodos y luego dibujo una curva entre madre e hija". El árbol pasa a construirse como **esqueleto de segmentos unidos por bifurcaciones**:

- El tronco es vertical, ligeramente irregular y partido en varios tramos.
- Cada tramo termina exactamente en un punto de bifurcación; el siguiente tramo (y cada rama hija) arranca exactamente en ese mismo punto, con las mismas coordenadas. El nodo se pinta encima. **No existe ningún path continuo oculto que atraviese la bifurcación**: son segmentos independientes, uno por tramo.
- Las notas raíz nacen del tronco a distintas alturas, alternando lados, con salidas laterales del mismo tipo que el SVG de referencia.
- Hijas, nietas y niveles siguientes se generan recursivamente con los mismos motivos, más cortos y finos con la profundidad.
- Copa asimétrica y orgánica: nada de abanicos uniformes ni hijas apiladas en vertical.
- Todo el árbol se dibuja siempre.

**Los motivos se extraen de la geometría real de `Group 8.svg`**, no se reconstruyen "inspirándose" en él: se parsean sus `path d`, se toman sus puntos de control Bézier tal cual, se normalizan (origen en el inicio del tramo, longitud unitaria, dirección canónica) y se reutilizan aplicando escala, espejo y rotación. Nada de fórmulas genéricas de abanico, ángulos o porcentajes de dx/dy.

El SVG se usa **solo durante la implementación** como fuente de extracción. Los motivos normalizados resultantes quedan escritos como constantes de datos dentro de `src/lib/treeGeometry.ts` (curvas completas, sin simplificar ni aproximar), de modo que en runtime el árbol no lee ningún archivo SVG y funciona de forma autónoma.

**La geometría es estable**: ni la selección ni el zoom recalculan posiciones ni alteran la silueta. Solo cambian opacidad, visibilidad de etiquetas, glow y cámara (pan/zoom).


## Estilo visual

- Tema oscuro por defecto (si el usuario no ha elegido tema antes); el toggle se mantiene.
- Fondo azul-negro profundo, retícula de puntos muy tenue y halo violeta suave en la base del árbol.
- Paleta de ramas: violeta `#7A6BFF`, mint `#42E1C6`, apricot `#FFB06B`, pink `#F57BC8`, amber `#F3D75F`; tonos derivados para ramas extra.
- Trazos finos: tronco ~1.7px, rama principal ~1.4px, nivel 2 ~1.1px, nivel 3+ ~0.8px, extremos redondeados y glow muy discreto.
- Nodos: punto pequeño justo en la bifurcación + etiqueta compacta al lado (fondo oscuro translúcido, borde finísimo del color de rama). Raíces algo más prominentes; en zoom lejano solo punto.
- Selección: ilumina su rama y atenúa el resto por opacidad/orden de render, sin ocultar geometría ni mover la cámara.

## Comportamiento que se conserva

Raíces por `parentNoteId === null`, render completo, doble clic para plegar/desplegar, clic que no toca pan/zoom, zoom anclado al cursor, pinch, encuadrar todo, y todos los diálogos y acciones (crear, borrar, renombrar, enlazar, "Mover a…").

**Arrastre libre de nodos**: se desactiva temporalmente en esta versión para no romper la continuidad de las ramas; la infraestructura de offsets se conserva en el código por si se recupera. La reorganización jerárquica sigue disponible vía "Mover a…".

## Detalles técnicos

- Nuevo `src/lib/treeGeometry.ts`: tipos `TreeJunction` / `BranchSegment`, motivos normalizados del SVG y generador recursivo del esqueleto (junctions + segmentos con puntos de control c1/c2).
- `src/components/GraphViewV2.tsx`: se sustituye el bloque `positions + edges + branchPath()` por consumo del esqueleto; cada segmento se pinta como `M … C …` propio, con grosor/opacidad por profundidad; nodos anclados a sus junctions y pintados por encima de las líneas.
- `src/index.css`: solo tokens nuevos de canvas oscuro y glow.
- `src/hooks/useTheme.tsx`: default `"dark"` cuando no hay preferencia guardada.
- Sin migraciones ni cambios de backend.

## Criterio de aceptación

Comparar la silueta con `Group 8.svg`: segmentos independientes que acaban en bifurcaciones, ramas que nacen justo ahí, sin líneas cruzando uniones, copa asimétrica y estética oscura levemente luminosa. Si sigue pareciendo un mind-map de líneas entre etiquetas, no está terminado.
