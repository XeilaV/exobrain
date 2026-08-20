# Fijar exactamente la distribución actual del árbol

Sí es viable. Las 65 notas actuales conservan coordenadas absolutas en la base de datos, por lo que la distribución de la captura puede convertirse en la geometría canónica del árbol sin reconstruirla ni aproximarla.

En pantallas con otra proporción, la composición mantendrá exactamente sus posiciones relativas y se escalará de forma uniforme para mostrarse completa. No se deformará ni se redistribuirá.

## Distribución fija

- Usar exclusivamente las coordenadas absolutas guardadas de cada nota; el reparto automático dejará de intervenir sobre nodos existentes.
- Fijar también el origen de ExoBrain, el tronco y sus puntos de unión en coordenadas de mundo estables, independientes del viewport.
- Mantener cada rama conectada entre las coordenadas fijas reales de madre e hija, reutilizando los motivos Bézier actuales.
- Eliminar cualquier recálculo geométrico provocado por recarga, cambio de tamaño, selección, zoom, plegado, filtro o apertura de una nota.
- Conservar pan y zoom como navegación de cámara: nunca modificarán coordenadas del árbol.
- Al abrir o redimensionar la pantalla, aplicar únicamente una escala global uniforme para que la composición completa quepa; no mover nodos entre sí.

## Bloquear movimientos y controles de posición

- Desactivar por completo el arrastre de nodos y eliminar su cursor/estado de drag.
- Eliminar el botón **Guardar disposición** y toda su lógica.
- Eliminar el botón **Restablecer vista** que borra coordenadas o vuelve al reparto automático.
- Retirar la siembra automática actual que vuelve a calcular posiciones ausentes según el tamaño de pantalla.

## Notas nuevas: hueco local mínimo

- Al crear una nota, asignarle una posición cercana a su madre usando huecos cortos y fijos alrededor de ella.
- Si el hueco está ocupado, desplazar únicamente las hermanas vecinas estrictamente necesarias y con un límite pequeño de distancia; nunca redistribuir ramas completas ni mover nodos lejanos.
- Persistir en ese mismo momento la posición de la nueva nota y cualquier ajuste local, para que una recarga reproduzca el resultado exacto.
- Aplicar la misma regla a notas creadas desde los diálogos, el editor o el asistente.
- Si no existe un hueco dentro del límite permitido, ampliar solo esa ramificación hacia fuera mediante un tramo corto adicional, sin tocar el resto del árbol.

## Detalles técnicos

- `GraphViewV2`: convertir las posiciones guardadas en única fuente geométrica; separar definitivamente geometría y cámara; retirar drag, offsets, guardado manual, reseteo y auto-siembra.
- Geometría del tronco: sustituir sus anclajes dependientes de `size.w/size.h` por anclajes fijos en el mismo sistema de coordenadas que las 65 notas guardadas.
- Colocación nueva: añadir un asignador determinista local que pruebe posiciones alrededor de la madre, mida colisiones y aplique desplazamientos acotados solo a vecinas inmediatas.
- Contexto de notas: guardar automáticamente el pequeño lote de coordenadas resultante; no exponer acciones manuales de guardar o limpiar posiciones en esta vista.

## Verificación

- Comparar la composición antes y después de varias recargas: mismas coordenadas y mismas uniones.
- Verificar escritorio y móvil: misma silueta y proporciones, únicamente escalada completa.
- Confirmar que ningún nodo se puede arrastrar y que selección, zoom, pan, filtros y plegado no cambian la geometría.
- Crear notas en ramas despejadas y densas: solo cambia localmente la zona inmediata, el resultado queda guardado y permanece idéntico tras recargar.