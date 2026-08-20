# Replicar exactamente el diseño entregado

Sí es viable reproducir fielmente la captura y dejar esa composición como geometría canónica e inmóvil. En la proporción de referencia se copiarán posiciones, silueta, tronco, bifurcaciones, ramas, etiquetas, tamaños, colores y jerarquía visual. En otras pantallas se aplicará únicamente una escala uniforme de toda la composición: no se redistribuirá ni deformará.

La única limitación que debo expresar con precisión es que una captura rasterizada no contiene las coordenadas vectoriales originales de cada píxel. Por tanto, no es honesto prometer igualdad matemática píxel a píxel; sí una reconstrucción visualmente idéntica, calibrada contra la propia captura. La geometría Bézier de `Group 8.svg` seguirá aportando los trazados vectoriales reales donde corresponda.

## Geometría canónica de la captura

- Sustituir el esqueleto automático visible por una escena fija que incluya explícitamente todas las notas actuales, el origen **ExoBrain**, el tronco, cada punto de unión y cada segmento de rama.
- Tomar las coordenadas absolutas ya guardadas de las notas como anclajes iniciales y calibrarlas contra la captura de referencia.
- Definir también como datos fijos las coordenadas de los puntos de unión y los segmentos Bézier; no volver a derivarlos del número de raíces, profundidad, viewport, selección o estado de la interfaz.
- Mantener cada bifurcación correctamente separada: la madre termina en la unión y cada hija comienza exactamente allí, con los nodos por encima.
- Conservar la misma proporción espacial, longitudes cortas, silueta, orden de ramas y ausencia de cruces del diseño entregado.

## Apariencia idéntica

- Igualar el fondo claro, el tronco violeta, los colores concretos de cada rama y la intensidad/grosor de los trazos.
- Replicar las cápsulas blancas, puntos de color, tipografía, tamaños, bordes, sombras y posición de cada etiqueta respecto a su rama.
- Calibrar el encuadre inicial para que la base, la copa y los márgenes coincidan con la captura.
- No reinterpretar el diseño ni aplicar otra estética “inspirada” en él.

## Inmovilidad real

- Eliminar del render final la intervención de `buildTreeSkeleton` sobre la composición canónica.
- No recalcular geometría al cargar, redimensionar, seleccionar, hacer zoom, mover la cámara, filtrar, plegar o abrir una nota.
- Mantener desactivado el arrastre de nodos y no recuperar controles de guardar/restablecer disposición.
- El pan y el zoom actuarán únicamente como cámara.
- El ajuste a móvil/escritorio será una transformación uniforme de toda la escena, nunca un reparto responsive de sus elementos.

## Notas nuevas

- Una nota nueva no moverá ni reajustará ninguna pieza de la composición canónica.
- Se colocará en una ranura local determinista junto a su madre y esa posición quedará persistida inmediatamente.
- Si esa zona ya no dispone de espacio, se prolongará únicamente la rama nueva hacia fuera; no se desplazarán nodos existentes ni se reconstruirá el árbol.

## Verificación visual obligatoria

- Renderizar la app con la misma proporción de la captura y compararla mediante superposición visual con la referencia.
- Corregir iterativamente posiciones, anclajes, curvas, colores, cápsulas y márgenes hasta eliminar diferencias perceptibles.
- Verificar después escritorio y móvil para confirmar que ambos muestran exactamente la misma silueta, solo escalada.
- Confirmar mediante interacción y recargas que ninguna nota, unión o rama cambia de coordenadas y que selección, pan y zoom no alteran el diseño.