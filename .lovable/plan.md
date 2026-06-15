Voy a replantear el grafo para dejar de perseguir posiciones libres que se salen de pantalla y pasar a un modelo estable tipo árbol, como la imagen de referencia.

## Objetivo

- Que el mapa siempre encaje dentro de la pantalla.
- Que al abrir la app aparezca al menos el tronco/raíz y las notas madre/temas.
- Que las ramas puedan abrirse y comprimirse.
- Que al recargar se mantenga qué estaba abierto/cerrado.
- Que se puedan seguir añadiendo temas, notas hijas y subnotas.
- Que haya una posición clara de “volver al árbol ordenado” si el usuario mueve o descoloca elementos.

## Plan de implementación

1. **Rehacer el layout del árbol**
   - Sustituir el cálculo actual que puede salirse de pantalla por un layout centrado y escalado dentro del viewport.
   - Mantener la forma de árbol neuronal: raíz abajo, temas/madres sobre el tronco y ramas hacia arriba.
   - Calcular automáticamente separación horizontal y vertical según el tamaño de pantalla y el número de elementos visibles.

2. **Eliminar el comportamiento que intenta conservar coordenadas absolutas fuera de pantalla**
   - Las posiciones manuales dejarán de forzar que el árbol se salga de la vista.
   - Si hay posiciones antiguas guardadas que están fuera de pantalla, no dominarán el layout inicial.
   - El árbol tendrá una distribución predecible y visible al recargar.

3. **Estado abierto/cerrado persistente**
   - Los temas/madres aparecerán visibles por defecto.
   - Las notas hijas aparecerán solo si su madre/tema está desplegado.
   - Al abrir o cerrar ramas, ese estado se guardará y se restaurará tras recargar.

4. **Añadir un botón de “recentrar / ordenar árbol”**
   - Añadir un control sencillo para volver al árbol ordenado y ajustado a pantalla.
   - Esto servirá como posición segura a la que volver cuando el mapa quede descolocado.

5. **Mantener creación de notas y ramas**
   - El menú actual para añadir tema, nota, lista y nota hija se mantiene.
   - Al crear una nota nueva, aparecerá dentro del árbol ordenado, cerca de su madre.

6. **Verificación manual**
   - Probaré en la vista móvil actual:
     - abrir ramas,
     - añadir una nota hija,
     - cerrar y abrir temas,
     - recargar,
     - comprobar que el árbol sigue visible y conserva el estado abierto/cerrado.

## Detalles técnicos

- Archivo principal: `src/components/GraphView.tsx`.
- Archivo de estado/persistencia: `src/contexts/NotesContext.tsx`.
- No cambiaré la interfaz a listas ni sidebars; seguirá siendo solo el grafo.
- No usaré la imagen subida como asset directo; la usaré como referencia visual para la forma del árbol.