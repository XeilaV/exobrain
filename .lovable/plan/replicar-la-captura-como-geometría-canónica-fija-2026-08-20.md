# Replicar la captura como geometría canónica fija

## Viabilidad y límite real

Sí se puede reproducir la composición de la captura con fidelidad visual de píxel en su tamaño de referencia (611 × 767) y mantenerla fija. La captura es raster, por lo que no contiene los puntos Bézier originales: no es posible prometer identidad matemática con el diseño fuente desconocido, pero sí una réplica visual calibrada contra sus píxeles.

La réplica seguirá siendo interactiva. No se utilizará la captura como fondo ni se simularán los nodos: notas, selección, edición, plegado, filtros, pan y zoom continuarán funcionando.

## Geometría exacta de la captura

- Calcar el tronco violeta, sus puntos de unión y cada ramificación visible directamente sobre la captura.
- Guardar posiciones de nodos, uniones y puntos de control Bézier como constantes canónicas en coordenadas del lienzo de referencia.
- Asociar las cinco ramas principales a **Reflexiónes**, **Ideas**, **Tareas**, **Abuela Carmen** y **Psico**, respetando exactamente su ubicación y color en la captura.
- Asignar los descendientes reales a los extremos y bifurcaciones correspondientes según su jerarquía; los títulos ocultos en la captura conservarán sus notas reales.
- Hacer que cada rama madre termine en su unión y que cada hija comience ahí, sin trazos continuos ocultos.

## Inmovilidad total

- Retirar `buildTreeSkeleton` de la composición renderizada y eliminar cualquier fallback que vuelva a generar o redistribuir el árbol.
- La selección, apertura de notas, zoom, pan, filtros, plegado y cambios de viewport no modificarán ninguna coordenada.
- Los nodos no serán arrastrables y no habrá acciones de guardar/restablecer disposición.
- En otras pantallas se aplicará una única transformación uniforme de cámara: misma silueta y proporciones, sin deformación ni reajuste interno.

## Notas nuevas y cambios de jerarquía

- Una nota nueva recibirá un punto fijo próximo a su madre mediante una extensión corta de esa rama.
- Ningún nodo existente se moverá para abrir espacio.
- Si se cambia una nota de madre con **Mover a…**, se conectará desde su posición fija actual a la nueva madre; no se redistribuirá el árbol.
- Las coordenadas nuevas se guardarán inmediatamente para que cada recarga sea idéntica.

## Detalles técnicos

- Crear una definición de escena canónica con nodos, uniones y curvas en el sistema 611 × 767 de la referencia.
- `GraphViewV2` consumirá directamente esa escena y solo aplicará la matriz de cámara.
- Las posiciones canónicas tendrán prioridad sobre las coordenadas actualmente guardadas, porque estas no corresponden espacialmente con la captura.
- Mantener los motivos extraídos de `Group 8.svg` únicamente donde coincidan con el calco; las curvas visibles de la captura mandarán sobre cualquier generador.

## Verificación visual obligatoria

- Renderizar a 611 × 767 y superponerlo con la captura al 50 % de opacidad.
- Corregir iterativamente tronco, uniones, extremos, cápsulas y colores hasta que no haya desplazamientos perceptibles.
- Verificar después escritorio y móvil: la composición solo cambia de escala/encuadre.
- Recargar, seleccionar, plegar, filtrar, abrir notas y usar pan/zoom; comparar coordenadas antes y después para confirmar que permanecen idénticas.
