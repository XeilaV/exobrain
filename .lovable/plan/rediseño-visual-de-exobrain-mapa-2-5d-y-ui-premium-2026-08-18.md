# Rediseño visual de Exobrain: mapa 2.5D y UI premium

Evolución puramente visual y de navegación. No se toca la base de datos, la jerarquía unificada, la IA, el historial, las tareas ni la exportación.

## Qué se conserva (sin cambios de lógica)

- Todo el backend: notas, jerarquía, enlaces, versiones, adjuntos, Google Calendar.
- `NotesContext` completo (`moveNote`, `canMoveTo`, `getRootNotes`, colapsos, colores).
- Layout radial, cálculo de ramas, arrastre de nodos, gestos (1 dedo mover nodo / 2 dedos pan y zoom), long-press para crear, modo enlazar, `MoveToDialog`, `CreateNodeDialog`, `TaskSheet`, `HistoryDialog`, `ExportDialog`, chat IA.
- Acciones actuales del menú de nodo: editar, color, icono, enlazar, crear hija, mover a…, eliminar.

## Mapa / árbol

- **Ramas orgánicas con grosor variable**: cada arista pasa de trazo uniforme a un trazo cuyo ancho depende de la profundidad y del número de descendientes (grueso cerca del tronco, fino en las hojas). Se añade un ligero doblado de la curva y un segundo trazo translúcido detrás para dar volumen.
- **Sensación 2.5D**: gradiente de color por rama a lo largo del trazo, halo suave bajo el tronco, sombras muy sutiles bajo cada nodo y una leve variación de escala/opacidad según la profundidad, de modo que los niveles profundos parezcan más lejanos.
- **Foco progresivo por rama**: al abrir o acercarse a una rama, esa rama sube de opacidad, escala y nitidez; el resto del árbol baja a opacidad reducida y desenfoque ligero sin desaparecer ni dejar de ser clicable. Al alejar el zoom o cerrar la rama, todo vuelve progresivamente al estado global.
- **Detalle por nivel de zoom**: con zoom bajo se ven solo ramas principales y etiquetas grandes; al acercar aparecen contadores, iconos y niveles internos.
- Nodos siempre legibles: fondo sólido tipo píldora, texto con contraste alto, tamaño mínimo garantizado en móvil.

## Interfaz

- **Tema claro por defecto** con fondo casi blanco y textura muy tenue; se mantiene el toggle a modo oscuro.
- Superficies con transparencia suave, bordes finos y sombras ligeras; el color de cada rama actúa solo como acento.
- Se reducen los controles visibles: barra superior mínima (nombre del brain, buscador/filtros, perfil, tema) y un grupo compacto de zoom/centrar abajo.
- **Nota en panel lateral derecho**: la nota deja de abrirse como post-it flotante encima del mapa y pasa a un panel contextual a la derecha que no tapa el árbol; el mapa se reencuadra para que el nodo activo quede visible. El panel muestra título, tipo, contenido, notas hijas, enlaces y las acciones (editar, mover a…, color, icono, crear hija, eliminar).
- En móvil ese panel se convierte en una hoja inferior a pantalla casi completa, con el mismo contenido.

## Detalles técnicos

- `src/components/GraphView.tsx`: nueva capa de render de aristas (grosor por profundidad, gradientes SVG, capa de halo), sistema de "foco de rama" derivado del nodo activo/expandido y del nivel de zoom, y limpieza de la barra de controles. Se reutilizan `positions`, `edges`, `pathBetween`, `fitFullTree` y todo el manejo de punteros.
- `src/components/NotePostIt.tsx`: se reestructura como panel lateral (`side panel` en escritorio, `sheet` en móvil) manteniendo props, editor TipTap, checklists, adjuntos, breadcrumbs y "Mover a…".
- `src/index.css` y `tailwind.config.ts`: nuevos tokens semánticos para superficies translúcidas, sombras suaves y profundidad; tema claro como predeterminado en `useTheme`.
- `src/components/ChatPanel.tsx`: solo ajuste de estilo al nuevo lenguaje visual.
- Sin migraciones ni cambios en edge functions.
