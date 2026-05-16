Entendido: el problema no es solo que “no guarde el drag”, es que el mapa sigue teniendo un layout automático que vuelve a mandar cuando recargas o despliegas. La solución tiene que hacer que tus posiciones manuales sean la única fuente de verdad después de que coloques algo.

Plan de implementación:

1. Cambiar el modelo mental del grafo
- El auto-layout solo se usará para dar una posición inicial a elementos que nunca tuvieron posición guardada.
- En cuanto un elemento exista en pantalla, su posición absoluta se guardará y se reutilizará siempre.
- Al recargar, no se recalculará la posición de notas/categorías que ya tengan posición.

2. Guardar también al desplegar
- Cuando despliegas una categoría o nota y aparecen hijos que todavía no tienen posición, se les asignará una posición inicial cercana al padre.
- Esa posición se guardará inmediatamente.
- Después de eso, esos hijos ya no volverán a alinearse automáticamente al plegar/desplegar o recargar.

3. No forzar abierto/cerrado por defecto
- Revertiré el cambio que dejó todo desplegado porque eso no es lo que pediste.
- El estado abierto/cerrado será exactamente el último que tú dejaste.
- Nuevos temas/notas podrán empezar cerrados, pero una vez los abras o cierres, ese estado se conserva.

4. Quitar reposicionamientos invisibles
- Eliminaré del render cualquier dependencia que haga que las posiciones cambien por tamaño de pantalla, número de nodos, apertura/cierre o recálculo del árbol.
- Las coordenadas guardadas `pos_dx` / `pos_dy` se tratarán como coordenadas absolutas de pantalla del lienzo actual, no como offsets relativos al árbol automático.

5. Arreglar el guardado del arrastre de forma verificable
- Al soltar un nodo, guardaré directamente la posición final exacta del nodo arrastrado y de los descendientes visibles que se movieron con él.
- Quitaré el guardado con debounce para posiciones, o lo dejaré como guardado inmediato, para evitar que recargar rápido pierda el cambio.
- Revisaré errores de red al guardar posiciones para no asumir que se guardó si el backend rechazó el cambio.

6. Prueba obligatoria antes de terminar
- Probaré en el navegador: desplegar, mover varios elementos, recargar y comparar la posición antes/después.
- Revisaré la base de datos para confirmar que las coordenadas dejan de estar vacías.
- Repetiré en desktop y en viewport móvil.

Archivos previstos:
- `src/components/GraphView.tsx`: separar layout inicial de posiciones guardadas y eliminar realineación al desplegar/recargar.
- `src/contexts/NotesContext.tsx`: guardar posiciones inmediatamente y conservar correctamente el estado abierto/cerrado.

Resultado esperado:
- Si dejas el árbol dibujado de una forma, al recargar vuelve exactamente igual.
- Si despliegas ramas, las colocas y recargas, siguen donde las dejaste.
- Nada se autoalinea, autoabre, autocierra o se recoloca después de que tú lo hayas colocado.