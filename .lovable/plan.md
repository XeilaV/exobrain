## Problema

Cuando arrastras una nota o categoría, la nueva posición **no se está guardando en la base de datos**. Lo verifiqué consultando la BD directamente: tras varios drags, todas las columnas `pos_dx` / `pos_dy` siguen vacías. Por eso al recargar todo vuelve a la posición automática inicial.

## Causa raíz (nueva hipótesis)

El `useEffect` que registra los listeners globales `pointermove` / `pointerup` tiene como dependencia `positionsWithOffsets`, que se recalcula en **cada movimiento del puntero** (porque `setDragDelta` cambia de estado constantemente durante el arrastre). Esto provoca que React desmonte y vuelva a montar los listeners docenas de veces por segundo. En el momento exacto del `pointerup`, el listener activo a menudo ya no es el que tiene el estado de drag correcto, o se desuscribe justo antes — por eso `setNotePosition` / `setCategoryPosition` nunca llegan a ejecutarse y la BD nunca recibe el `PATCH`.

Los intentos anteriores fallaron porque trataban el problema como un bug de cálculo de posiciones, cuando en realidad es un bug de ciclo de vida de listeners: las posiciones se calculan bien, simplemente nunca llegan a guardarse.

## Solución

Montar los listeners de `pointermove` / `pointerup` **una sola vez** al montar el componente, y leer todos los valores que necesiten (posiciones actuales, mapa de padres, funciones de guardado) desde **refs** que se actualicen en cada render. Así los listeners siempre ven datos frescos sin necesidad de re-suscribirse.

## Cambios

Archivo único: `src/components/GraphView.tsx`

1. Añadir refs (`positionsRef`, `parentMapRef`, `setNotePosRef`, `setCatPosRef`) sincronizadas con sus valores reactivos vía `useEffect`.
2. Reescribir el `useEffect` de listeners de pointer con dependencias `[]` (se monta una vez), leyendo todo desde las refs.
3. El `onUp` recorre `positionsRef.current` y, para cada nodo que sea descendiente (o el propio) del nodo arrastrado, llama a `setNotePosRef.current` / `setCatPosRef.current` con su posición absoluta final — garantizando que el árbol entero queda fijado en la BD exactamente como se ve en pantalla.

## Verificación

Después de aplicar el cambio: arrastrar una categoría o nota desde el preview, esperar 1 s (debounce de 300 ms del save), y consultar la BD para confirmar que `pos_dx` / `pos_dy` ya no son `NULL`. Luego recargar y comprobar que los nodos aparecen en la posición exacta.
