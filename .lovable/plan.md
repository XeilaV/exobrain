## Objetivo

En móvil el árbol no debe comprimirse hasta solapar nodos. En su lugar:

- Las ramas tendrán más separación aunque el árbol salga de la pantalla.
- Al abrir una rama, la vista se desplazará automáticamente hacia esa rama.
- El usuario podrá arrastrar el fondo para navegar libremente por todo el árbol.
- Habrá un botón de árbol para volver a ver el árbol completo.

## Cambios propuestos

### 1. Hacer que el árbol pueda salir de la pantalla

En `src/components/GraphView.tsx` quitaré la lógica que ahora fuerza el árbol a caber en el viewport:

- Eliminar el auto-escalado global que reduce todo el árbol cuando crece.
- Eliminar el clamp que obliga a cada nodo a quedarse dentro de los bordes de la pantalla.

Esto permite que las ramas mantengan su separación real en mobile, aunque algunas queden fuera de pantalla.

### 2. Aumentar separación entre ramas y nodos

Ajustaré el layout radial para móvil:

- Más distancia entre categorías.
- Más distancia entre nodo madre e hijas cuando se despliegan.
- Mayor abanico angular para hijas cuando una rama tiene varias notas.
- Radios por profundidad menos comprimidos en móvil.

La prioridad será evitar solapes visuales entre nodos y etiquetas.

### 3. Añadir navegación libre por el mapa

Añadiré un estado de desplazamiento del lienzo completo (`pan`) y aplicaré el desplazamiento al contenedor del árbol.

- Arrastrar el fondo moverá todo el árbol.
- Arrastrar un nodo seguirá moviendo ese nodo/subárbol como hasta ahora.
- El gesto de pan no interferirá con long-press, edición, enlaces ni post-it.

### 4. Foco automático al abrir una rama

Cuando el usuario haga doble click para desplegar una categoría o nota con hijas:

- Se detectará cuál fue el nodo abierto.
- Se calculará el área ocupada por esa rama y sus descendientes.
- El lienzo se desplazará para centrar esa rama en pantalla, respetando el espacio de los controles superiores y del chat inferior.
- No habrá zoom automático al abrir ramas; solo desplazamiento.

### 5. Botón para ver árbol completo

Añadiré un botón con icono de árbol en los controles superiores.

Al pulsarlo:

- Se calculará el bounding box de todo el árbol.
- El lienzo se recentrará.
- Si el árbol completo no cabe, se aplicará solo aquí un zoom-out temporal para verlo entero.
- Al volver a hacer pan manual o abrir una rama, el zoom volverá a `1`.

### 6. Verificación

Comprobaré especialmente en móvil:

- Abrir ramas con muchas hijas no genera solapes importantes.
- La rama abierta queda enfocada aunque el resto del árbol salga de pantalla.
- Se puede arrastrar el fondo hasta llegar a cualquier rama.
- El botón de árbol recupera la vista completa.
- No se rompen post-it, drag de nodos, long-press, filtros, creación de notas ni edición.