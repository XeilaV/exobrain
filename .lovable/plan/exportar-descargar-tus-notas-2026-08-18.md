# Exportar / descargar tus notas

Añadir una opción "Descargar mis datos" en el menú de perfil (junto a Historial) que genera y descarga un archivo con todos tus temas y notas actuales, con su contenido completo.

## Qué incluye la exportación

- Temas (nombre, icono, color)
- Notas: título, icono, tipo (texto o lista), contenido, ítems de la lista con sus subtareas y fechas, nota madre, notas enlazadas y fechas de creación/actualización

Se exportan dos formatos en la misma acción:
- **JSON**: copia fiel y completa, apta para respaldo o reimportación futura
- **Markdown**: un archivo legible con los temas como secciones y las notas debajo

## Cómo funciona

- Botón en el menú de perfil: "Descargar mis notas"
- Un pequeño diálogo permite elegir formato (JSON o Markdown) antes de descargar
- La descarga se genera en el navegador a partir de tus datos ya cargados y de una consulta de respaldo a la base de datos, así que siempre refleja el estado actual
- Solo se descargan tus propios datos (las reglas de acceso ya limitan cada usuario a lo suyo)

## Detalles técnicos

- Nuevo `src/lib/exportNotes.ts`: consulta `categories` y `notes` del usuario, construye el JSON y el Markdown, y dispara la descarga vía `Blob` + enlace temporal
- Nuevo `src/components/ExportDialog.tsx`: selector de formato y botón de descarga
- `src/components/GraphView.tsx`: añadir la entrada de menú y montar el diálogo junto a `HistoryDialog`
- Nombre de archivo: `exobrain-<brain_name>-YYYY-MM-DD.json` / `.md`
- Sin cambios en la base de datos
