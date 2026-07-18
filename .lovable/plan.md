## Objetivo

Convertir el asistente en un **compañero de conversación con acceso a internet**. Solo lee, busca y debate — **no crea, ni edita, ni borra** nada en ExoBrain. Sirve para explorar temas, contrastar ideas y traer información actualizada de la web.

## Comportamiento

- Responde siempre en español, tono cercano, estilo "brainstorming".
- Tiene contexto de tus notas actuales (solo lectura) para referenciarlas cuando venga al caso ("según tu nota 'Recetas'…").
- Puede buscar en internet cuando el tema lo pida (noticias, datos actuales, referencias, definiciones, ejemplos).
- Cita fuentes cuando use resultados de la web (título + enlace).
- Nunca modifica notas. Si le pides "añade esto a mi lista", responde con el texto listo para copiar y te sugiere que lo pegues tú.

## Cambios técnicos

### Edge Function `ai-agent`
- Quitar todas las tools de propuesta (`propose_create_note`, `propose_update_note`, `propose_create_category`).
- Mantener solo una tool: `web_search`, implementada de verdad con una llamada al buscador (usaremos el mismo servicio de búsqueda web que ya tienes disponible en el gateway; si no está, se usa `google/gemini-3.5-flash` que trae grounding web nativo y ya devuelve resultados citados — este es el camino por defecto porque no requiere claves extra).
- Modelo por defecto: `google/gemini-3.5-flash` (rápido, con acceso web nativo).
- System prompt reescrito y reforzado:
  - Rol: "compañero de pensamiento" que ayuda a explorar temas.
  - Regla dura: **prohibido** proponer o simular acciones sobre notas.
  - Cuando cite web, formato `- Fuente: [título](url)`.
  - Concisión: respuestas por defecto en 4-8 líneas salvo que se pida más.
- Devolver las citas de grounding al frontend como parte del stream (ya soportado por el AI SDK).

### Frontend `ChatPanel.tsx`
- Quitar el renderizado de "propuestas con botones Aplicar/Descartar" y toda la lógica de `applyAiAction`.
- Añadir renderizado de **fuentes** al final de los mensajes que las incluyan (lista de enlaces clicables, `target="_blank" rel="noopener"`).
- Añadir un indicador sutil "Buscando en internet…" mientras se ejecuta la tool.
- Placeholder del input: "Pregunta, debate o pide ideas…".

### Historial de versiones y tools de escritura
- **Se mantiene** el historial de versiones de notas por si editas tú a mano (útil aunque la IA no toque nada).
- La Edge Function `ai-agent` deja de tener capacidad de escritura, así que la tabla `note_versions` y el trigger siguen funcionando solo para cambios manuales.

## Fuera de alcance
- Crear, editar o borrar notas desde la IA.
- API key propia de OpenAI (se puede añadir después si quieres cambiar de modelo).
- Guardar el historial del chat entre sesiones (sigue como está: efímero).

## Pasos
1. Reescribir `supabase/functions/ai-agent/index.ts`: nuevo system prompt, quitar tools de escritura, dejar solo búsqueda web, activar grounding de Gemini.
2. Simplificar `ChatPanel.tsx`: eliminar UI de propuestas, añadir render de fuentes y estado "buscando".
3. Probar: preguntar "¿qué novedades hay sobre X esta semana?" y verificar que responde con enlaces; pedirle "crea una nota" y verificar que se niega amablemente y da el contenido para copiar.
