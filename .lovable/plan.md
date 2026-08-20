# Arreglar el guardado de posiciones y las ramas que se desconectan

Los dos fallos que describes tienen causas distintas y ambas están confirmadas leyendo el código actual.

## Por qué las ramas se desconectan al mover

Cada rama guarda su trazo dibujado de forma estática. Al arrastrar un nodo, el trazo solo se vuelve a calcular si el desplazamiento pertenece **al propio nodo o a su madre directa**. Pero mover una madre desplaza también a hijas, nietas y siguientes niveles (herencia de desplazamiento), y esos tramos siguen dibujados en su sitio antiguo: el nodo se va y la rama se queda.

Arreglo: recalcular siempre el trazo a partir de la posición real de los dos extremos, usando el mismo motivo Bézier ya asignado. El dibujo no cambia cuando nada se ha movido, y deja de romperse cuando algo se mueve.

## Por qué al recargar los nodos cambian de sitio

Lo que se guarda es un desplazamiento en píxeles respecto al reparto automático, pero ese reparto automático **no es estable**:

- Depende del tamaño de la ventana: la raíz se coloca en el centro horizontal y a una distancia fija del borde inferior, y las ramas usan longitudes distintas en móvil. Con otra ventana, otro reparto base, y el desplazamiento guardado ya no cae donde tú lo dejaste.
- Depende de lo plegado/oculto que estuviera el árbol en la sesión: al plegar o esconder una rama se recalculan pesos y ángulos de las hermanas, así que el reparto base con el que guardaste no es el que se reconstruye al recargar.

Arreglo:

1. Construir el esqueleto en un **espacio de coordenadas fijo** (origen propio, longitudes constantes), y adaptar al viewport y al móvil solo con la cámara (zoom/pan). El reparto base pasa a ser idéntico en cualquier pantalla.
2. Generar la geometría **siempre con todas las notas**, ignorando plegados y filtros de visibilidad; plegar u ocultar pasa a ser solo cuestión de qué se pinta. Así el reparto base no se mueve nunca y el desplazamiento guardado sigue siendo válido.
3. Aplicar los desplazamientos guardados en la hidratación inicial ya funciona; con la base estable, empezará a coincidir.

## Efecto secundario a corregir

Cada arrastre guarda en la nota y eso dispara una entrada nueva en el historial de versiones. Se ajustará para que un cambio que solo toque la posición no genere versión, y el historial deje de llenarse de ruido.

## Detalles técnicos

- `src/components/GraphViewV2.tsx`: eliminar la condición `moved` y calcular siempre `motifPath(from, to, edge.motif, edge.mirror)`; pasar `collapsed`/`hiddenRootIds` fuera de `buildTreeSkeleton` y filtrar en render; construir el esqueleto con `rootX: 0`, `rootY: 0` y `compact: false` fijos, encajando el árbol en pantalla mediante el `pan`/`viewZoom` inicial ya existente.
- `src/lib/treeGeometry.ts`: quitar la dependencia de `compact` en longitudes (o fijarla), y devolver el `bbox` del esqueleto para el encuadre inicial.
- Migración en la base de datos: en `snapshot_note_version()`, salir sin registrar versión cuando la actualización solo cambia `pos_dx`/`pos_dy`.
- Verificación con navegador: arrastrar una rama madre y comprobar que los tramos hijos siguen unidos; recargar y comprobar que los nodos quedan en el mismo sitio; repetir con la ventana redimensionada.
