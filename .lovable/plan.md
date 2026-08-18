# Nuevo árbol tipo mapa mental (estilo referencia)

Rehacer la vista de grafo para que se parezca a la imagen: tronco central desde el nodo raíz "ExoBrain" abajo, ramas curvas que se abren hacia arriba y a los lados, nodos como píldoras blancas con un punto de color encima, fondo claro con retícula de puntos, controles de zoom y minimapa.

## Comportamiento

- Todos los nodos aparecen **abiertos por defecto** (sin plegado inicial); el doble clic sigue plegando/desplegando.
- Navegación libre del lienzo:
  - Arrastrar el fondo = mover (pan).
  - Rueda / pellizco = zoom suave anclado al cursor (sin saltos ni compounding).
  - Rotación del árbol: control para girar todo el lienzo (rueda con Shift o gesto de dos dedos) más botón de "reset vista".
  - Doble clic en el fondo o botón "ajustar" = encuadrar todo el árbol.
- Arrastrar un nodo lo reposiciona y arrastra su descendencia, como ahora.
- Al expandir una rama, el foco se desplaza suavemente hacia ella.
- Minimapa abajo a la derecha con el recuadro del viewport, clicable para saltar.
- Barra de zoom abajo a la izquierda (mano / + / − / ajustar) y porcentaje arriba a la derecha.

## Layout

Layout de árbol radial-orgánico calculado por capas:
- Raíz abajo al centro, tronco vertical hasta un punto de reparto.
- Ramas de primer nivel repartidas en abanico (izquierda / centro / derecha).
- Cada nivel hijo se reparte en un arco alrededor de su madre, con radio creciente según el número de descendientes para evitar solapes.
- Enlaces con curvas Bézier de grosor decreciente por profundidad.

## Detalles técnicos

- Se reescribe `src/components/GraphView.tsx` (la vista que usan `Index.tsx` y `MobileLayout.tsx`); `GraphViewV2.tsx` se deja como está.
- Transformación única `translate(pan) rotate(θ) scale(zoom)` sobre un grupo SVG; el hit-testing y el arrastre convierten coordenadas de pantalla a espacio del grafo con la matriz inversa.
- Listener `wheel` nativo no pasivo (`{ passive: false }`) con `deltaMode` normalizado y zoom exponencial anclado al cursor; pinch (`ctrlKey`) y dos dedos con Pointer Events y `touch-action: none`.
- Se conservan datos y contexto actuales (`NotesContext`, RPC `move_note`, colores, iconos, colapsos persistidos); solo cambia el render/interacción. El estado de colapso persistido se ignora en la carga inicial (todo abierto) y se guarda al plegar manualmente.
- Estilos con tokens semánticos de `index.css`; nodo = píldora `surface-glass`, punto superior con el color del tema.
- Móvil: mismos gestos, tamaños y separaciones reducidos.

## Fuera de alcance

- Sin cambios en el editor de notas, chat IA, tareas ni backend.
