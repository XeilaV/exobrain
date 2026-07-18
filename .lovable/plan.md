## Objetivo
Cumplir mínimos WCAG/UX en móvil: texto legible (≥12–14px) y tap targets ≥44×44px, sin romper el diseño denso de escritorio.

## Estrategia
Usar breakpoints Tailwind (`md:` = ≥768px) para mantener las tallas compactas actuales en desktop y aumentar solo en móvil. No se toca funcionalidad ni layout.

Umbrales:
- Cuerpo mínimo móvil: `text-sm` (14px). Metadatos/badges: `text-xs` (12px). Nada por debajo de 12px en móvil.
- Iconos interactivos: mínimo 18px móvil / 12–14px desktop.
- Tap targets: `min-h-11 min-w-11` (44px) en móvil para todo botón/enlace pulsable. `p-2` mínimo en menús desplegables.

## Cambios por archivo

### `src/components/NotePostIt.tsx`
- Breadcrumb header (línea 185): `text-[10px]` → `text-xs md:text-[10px]`; iconos `size={8/9}` → `size={12}` en móvil vía clase o duplicar prop.
- Badges categoría/tipo, chips Madre/Hijas/Enlazadas (líneas 226–355): `text-[10px]` → `text-xs md:text-[10px]`, `px-2 py-1` → `px-2.5 py-2 md:px-2 md:py-1`.
- Barra de acciones (Enlazar, Hija, Lista, Archivo, Borrar): `text-[10px]` → `text-xs md:text-[10px]`, añadir `min-h-11 md:min-h-0` a los botones, iconos `size={10}` → `size={14}` en móvil.
- Buscador de enlace y items del picker: `text-[10px]` → `text-sm md:text-[10px]`, `py-1` → `py-2 md:py-1`.
- Labels "Madre/Hijas/Enlazadas" (`text-[9px]`) → `text-[11px] md:text-[9px]`.
- Contadores/fechas footer: subir a `text-xs md:text-[9px]`.
- Botones ▲/▼/🗑 de items de lista (móvil): pasar de `p-0.5` a `p-2 min-h-11 min-w-11` e iconos a `size={20}`. Texto del item ya `text-sm` — dejar.
- Botones ✕ y maximizar del header: garantizar `min-h-11 min-w-11` en móvil.
- Copy/Trash de items desktop: sin cambios.

### `src/components/GraphView.tsx`
- Menú contextual (líneas 895–981) y menú de usuario (1068–1082): `text-xs px-3 py-2` → `text-sm px-3 py-3 min-h-11 md:text-xs md:py-2 md:min-h-0`.
- Panel de temas (1153, 1162): items `py-1.5` → `py-2.5 md:py-1.5`, `text-xs` → `text-sm md:text-xs`, contador visible → `text-xs md:text-[10px]`.
- Diálogo color/nombre de categoría (999–1228): inputs y botones `text-xs py-1/1.5` → `text-sm py-2.5 md:text-xs md:py-1.5`.
- Etiquetas de nodos del árbol (826, 869): `text-xs`/`text-[9px]` → `text-sm md:text-xs` y `text-[11px] md:text-[9px]`. Verificar que no rompan el layout radial midiendo con el ancho actual; si genera solape, mantener `text-[9px]` solo cuando el nodo esté colapsado y `text-[11px]` cuando expandido.
- Toast "modo pan/zoom" (729): ya OK.

### `src/components/NameInputDialog.tsx`
- Botones Crear/Cancelar (63, 67): `text-xs px-3 py-1.5` → `text-sm px-4 py-2.5 min-h-11 md:text-xs md:py-1.5 md:min-h-0`.
- Input: garantizar `text-base` en móvil (evita zoom iOS).

### `src/components/RichTextEditor.tsx`
- Toolbar (54): botones de formato con `min-h-11 min-w-11 md:min-h-0 md:min-w-0` en móvil e iconos ≥18px.

## Notas
- Sin cambios en `index.css` ni tokens de color — solo tamaños via clases utility.
- Sin cambios en datos ni contextos.
- Verificación: cargar preview en 393×723 (móvil actual) tras cambios y comprobar que los botones de item de lista y menús son cómodos y el texto es legible.
