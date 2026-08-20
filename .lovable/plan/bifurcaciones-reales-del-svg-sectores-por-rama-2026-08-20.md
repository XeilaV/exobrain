# Bifurcaciones reales del SVG + sectores por rama

El diagnóstico de colisiones se mantiene, pero el generador interno cambia: las hijas dejan de colocarse con `tilt/spread/jitter/angle` y pasan a colocarse con **motivos completos de bifurcación** extraídos de `Group 8.svg`. Los sectores solo reservan espacio y orientan.

## Diagnóstico (verificado en `src/lib/treeGeometry.ts` y en la vista renderizada)

1. **No hay espacio reservado por rama raíz.** Cada raíz sale alternando lado con `tilt = 0.55 + hash*0.5` y sus hijas se abren con abanico + jitter aleatorio: la copa de un tema invade la de otro (la rama mint de "Reflexiónes" cruza media pantalla sobre la rosa de "TDA").
2. **Solo se extrajo la forma de las líneas, no la geometría de las bifurcaciones.** `BRANCH_MOTIFS` son curvas sueltas aplicadas entre dos puntos ya decididos por trigonometría.
3. **Las longitudes apenas decaen** (nivel 1 hasta ~235px, hijas 62–88% con mínimo 62px), así que nietos y bisnietos siguen siendo largos.
4. **Las etiquetas se colocan tal cual en la bifurcación**, sin pasada de separación: "Árbol genealógico"/"Refraneiro", "CV"/"Casa", "Reflexiónes"/"TDA", "Índice" se pisan.
5. **Motivos muy curvados en tramos largos** (`maxBend` 0.16 sobre 200px) alejan el trazo hasta ~30px de la recta madre-hija.

## Extracción de motivos de bifurcación

Nueva pasada de extracción sobre `Group 8.svg` (solo en tiempo de implementación; el resultado queda como datos en `src/lib/treeGeometry.ts`):

- Parsear todos los `path d` y muestrear sus extremos.
- Agrupar por **puntos de unión** por coincidencia geométrica de extremos, con tolerancia pequeña y **sin asumir orientación**: un path puede estar dibujado madre→hija o al revés. Se compara cada extremo (inicio y fin) contra los demás.
- **Normalizar la dirección**: cuando un path esté invertido respecto a la unión, se invierte su Bézier matemáticamente (orden de segmentos y de puntos de control), de modo que la curva almacenada es exactamente la misma pero siempre va de la junction hacia la salida.
- Cada bifurcación produce un `ForkMotif`: el eje de entrada (dirección de la rama madre entrante) define la orientación canónica, y cada salida se guarda con su curva cúbica completa y su punto final (`anchor`), normalizados respecto a ese eje y a la longitud de la salida más larga.


```text
ForkMotif {
  arity: 1 | 2 | 3 | ...
  children: [ { anchor: Vec, curves: [[c1, c2, end], ...] }, ... ]
  extent: { minX, maxX, minY, maxY }   // caja normalizada, para encajar en el sector
}
```

Las curvas se copian tal cual (sin simplificar ni aproximar) y el conjunto se aplica como **una unidad**: una sola escala, una rotación y un espejo opcional por bifurcación.

## Generador

- **Sectores no solapados**: cada nota raíz recibe una cuña del arco superior proporcional a su peso (nº de descendientes). La cuña se subdivide al descender, de modo que un subtree nunca puede salir de su espacio.
- **El sector solo hace tres cosas**: reservar espacio, elegir la orientación global de la bifurcación (bisectriz de la cuña) y calcular la escala máxima con la que el `extent` del motivo cabe dentro de la cuña.
- **La posición de cada hija la decide el motivo**: se elige un `ForkMotif` de la aridad exacta del nodo, se escala/rota/espeja como unidad y sus `anchor` transformados son las junctions de las hijas. **No hay `spread` ni `jitter` por hija.**
- **Aridades no existentes**: nunca se duplica ni se reutiliza una salida para simular más hijos. Si no hay motivo con esa aridad, se **compone** encadenando bifurcaciones reales a través de junctions intermedias invisibles (sin nodo ni etiqueta): p. ej. 4 hijas = dos forks de 2 encadenados, 5 = fork de 2 + fork de 3. El reparto de hijas entre las sub-bifurcaciones se hace por peso, y la estructura resultante queda formada exclusivamente por motivos reales del SVG.

- La variación entre bifurcaciones iguales viene de la elección determinista de motivo (hash del id) y del espejo, no de ruido angular.
- **Decaimiento de longitud** por profundidad (≈0.72 por nivel) aplicado a la escala del motivo.
- **Curvatura por profundidad**: en tramos largos se prefieren motivos de baja curvatura; los de curvatura fuerte se reservan para las ramitas cortas.
- Los segmentos siguen siendo independientes: la madre termina en la unión, cada hija arranca exactamente ahí, sin path continuo oculto.

## Etiquetas

- Pasada de resolución de solapes en `GraphViewV2`: se estiman las cajas de las píldoras y se desplazan perpendicularmente a la rama unos pocos px hasta que no colisionan; el punto del nodo permanece exactamente en la bifurcación.
- Si a zoom bajo dos siguen chocando, gana la de menor profundidad y la otra queda solo como punto hasta acercar.

## Se conserva

Geometría estática (selección y zoom solo afectan cámara, opacidad, glow y etiquetas), bifurcaciones exactas madre-hija, motivos como datos sin lectura de SVG en runtime, doble clic para plegar, pan/zoom anclado y todos los diálogos.

## Detalles técnicos

- `src/lib/treeGeometry.ts`: nuevo tipo `ForkMotif` y constante `FORK_MOTIFS` (extraída del SVG, agrupada por aridad); `buildTreeSkeleton` propaga `sectorStart`/`sectorEnd` y escala, y sustituye el bloque de `tilt/spread/jitter/angle/length` por aplicación de motivos. Se conservan `motifPath`/`BRANCH_MOTIFS` solo para los tramos de tronco.
- `src/components/GraphViewV2.tsx`: pasada de separación de etiquetas y prioridad por profundidad al renderizar píldoras. El consumo de junctions y segmentos no cambia de forma.
- Sin cambios de backend ni de datos.

## Criterio de aceptación

Cada bifurcación reproduce una unión real del SVG (misma relación entre salidas, no un abanico calculado), ningún tema invade el área de otro y las píldoras del encuadre de tu captura se leen sin superponerse.
