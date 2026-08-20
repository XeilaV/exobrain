# Por qué se rompe el árbol y cómo arreglarlo

He cargado la vista real y comparado con tu captura. El árbol sí se dibuja (tronco, bifurcaciones y motivos del SVG funcionan), lo que falla es el **reparto del espacio en la copa**: ramas de temas distintos se cruzan y las etiquetas se pisan.

## Diagnóstico (verificado en `src/lib/treeGeometry.ts` y en la vista renderizada)

1. **No hay sectores reservados por rama.** Cada nota raíz sale del tronco alternando lado con una inclinación aleatoria (`tilt = 0.55 + hash*0.5`) y sus hijas se abren con un abanico más *jitter* aleatorio. Nada impide que la copa de un tema invada la de otro: por eso la rama mint de "Reflexiónes" cruza media pantalla y se solapa con la rosa de "TDA".
2. **Las longitudes apenas decaen.** Nivel 1 mide hasta ~235px y las hijas conservan un 62–88% con un mínimo de 62px, así que nietos y bisnietos siguen siendo largos y se salen del área de su rama.
3. **Las etiquetas se colocan tal cual en la bifurcación**, sin ninguna pasada de separación: "Árbol genealógico"/"Refraneiro", "CV"/"Casa", "Reflexiónes"/"TDA" e "Índice" quedan superpuestas.
4. **Motivos muy curvados en tramos largos.** Con `maxBend` 0.16 y segmentos de 200px, el trazo se aleja hasta ~30px de la recta madre-hija, lo que hace que la línea parezca no tocar el nodo aunque los extremos coincidan.

## Correcciones

**Sectores angulares no solapados**
- Repartir la copa en cuñas: cada nota raíz recibe un sector propio calculado por su peso (nº de descendientes), distribuido en el arco superior alternando lados pero sin que dos sectores se pisen.
- La recursión pasa a subdividir el sector del padre entre sus hijas por peso: una rama nunca puede salirse de su cuña. El jitter se mantiene pero recortado al interior del sector (nunca más del 35% del ancho disponible), para conservar la irregularidad orgánica sin cruces.

**Longitudes y curvatura**
- Decaimiento real por profundidad (≈0.72 por nivel) con mínimos más bajos, para que la copa se cierre en vez de expandirse.
- `maxBend` decreciente con la profundidad y limitado en valor absoluto: en tramos largos se eligen motivos suaves; los motivos fuertes se reservan para las ramitas cortas. Los motivos siguen siendo los extraídos del SVG, solo cambia cuál se elige.

**Etiquetas**
- Pasada de resolución de solapes en `GraphViewV2`: se estiman las cajas de las píldoras y se desplazan perpendicularmente a la rama (unos pocos px) hasta que no colisionan; el punto del nodo permanece exactamente en la bifurcación.
- Si tras la pasada dos etiquetas siguen chocando a zoom bajo, gana la de menor profundidad y la otra queda solo como punto hasta acercar el zoom.

## Se conserva

Geometría estática (selección y zoom solo afectan cámara, opacidad, glow y etiquetas), bifurcaciones exactas madre-hija, motivos Bézier del SVG como datos, doble clic para plegar, pan/zoom anclado y todos los diálogos.

## Detalles técnicos

- `src/lib/treeGeometry.ts`: `buildTreeSkeleton` recibe/propaga `sectorStart`/`sectorEnd` por rama; nuevo reparto de raíces por peso sobre el arco superior; ajuste de `length` y de la selección de motivo por profundidad.
- `src/components/GraphViewV2.tsx`: pasada de separación de etiquetas sobre `positionsWithOffsets` y regla de prioridad por profundidad al renderizar píldoras.
- Sin cambios de backend ni de datos.

## Criterio de aceptación

Ninguna rama de un tema invade el área de otro, no hay líneas cruzando por encima de etiquetas ajenas, y en el encuadre de tu captura las píldoras se leen sin superponerse.
