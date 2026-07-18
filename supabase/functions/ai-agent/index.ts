import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { convertToModelMessages, streamText, tool, type UIMessage } from "npm:ai";
import { z } from "npm:zod";
import {
  createLovableAiGatewayProvider,
  getLovableAiGatewayRunId,
  getLovableAiGatewayResponseHeaders,
  withLovableAiGatewayRunIdHeader,
} from "../_shared/ai-gateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  if (!LOVABLE_API_KEY) {
    return new Response(JSON.stringify({ error: "LOVABLE_API_KEY is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: "Supabase environment is not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Validate user identity from the provided access token.
  const authHeader = req.headers.get("Authorization");
  const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const messages = (body.messages ?? []) as UIMessage[];
    const notesContext = body.notesContext as {
      id: string;
      title: string;
      category: string;
      noteType: string;
      content: string;
      checklist: { text: string; completed: boolean }[];
    }[] | undefined;
    const image = body.image as string | undefined;
    const audio = body.audio as string | undefined;

    let notesContextText = "";
    if (notesContext && notesContext.length > 0) {
      notesContextText = "\n\nNotas del usuario (solo lectura para el contexto):\n\n";
      for (const note of notesContext) {
        notesContextText += `--- Nota ID: ${note.id} | Título: "${note.title}" | Categoría: ${note.category} | Tipo: ${note.noteType} ---\n${note.content.slice(0, 800)}\n`;
        if (note.checklist && note.checklist.length > 0) {
          notesContextText += "Checklist:\n" + note.checklist.map((item) => `- [${item.completed ? "x" : " "}] ${item.text}`).join("\n") + "\n";
        }
        notesContextText += "\n";
      }
    }

    const systemContent = `Eres el asistente de Exobrain, una app de notas con mapa mental. Responde siempre en español. Sé conciso, útil y amable.

TIENES ACCESO A INTERNET. Puedes buscar información actual, recursos, ideas y ayudar a redactar notas.

Puedes proponer acciones en la app (crear notas, añadir contenido a notas existentes o crear categorías). NUNCA ejecutes un cambio directamente. Siempre devuelve una propuesta mediante una herramienta y pide confirmación al usuario. El usuario debe pulsar "Aplicar" en el chat para que se ejecute el cambio.

Reglas importantes:
- Si el usuario pide crear, añadir o modificar algo, usa la herramienta de propuesta correspondiente.
- Después de llamar a una herramienta de propuesta, explica claramente que la acción está pendiente de confirmación.
- Si el usuario pide información actual, eventos, recursos, etc., usa la herramienta web_search y responde con datos actualizados y fuentes cuando sea posible.
- Para notas de tipo "checklist" (tareas), genera items concretos y accionables.
- Para notas de tipo "texto", redacta en formato markdown enriquecido: usa negritas, títulos, listas, etc., siempre que mejore la legibilidad.

${notesContextText}

Cuando llames a una herramienta de propuesta, recuerda que aún no se ha realizado el cambio. El usuario debe confirmar.`;

    // Attach image/audio to the last user message as v4 file parts.
    const processedMessages = [...messages];
    if (image || audio) {
      const lastMsg = processedMessages[processedMessages.length - 1];
      if (lastMsg && lastMsg.role === "user") {
        const extraParts: any[] = [];
        if (image) {
          extraParts.push({
            type: "file",
            mediaType: image.match(/^data:audio\//) ? "audio" : "image",
            url: image,
          });
        }
        if (audio) {
          extraParts.push({
            type: "file",
            mediaType: "audio",
            url: audio,
          });
        }
        processedMessages[processedMessages.length - 1] = {
          ...lastMsg,
          parts: [...lastMsg.parts, ...extraParts],
        } as UIMessage;
      }
    }

    const initialRunId = getLovableAiGatewayRunId(req);
    const gateway = createLovableAiGatewayProvider(LOVABLE_API_KEY, initialRunId);
    const model = gateway("google/gemini-3.5-flash");

    const result = streamText({
      model,
      system: systemContent,
      messages: await convertToModelMessages(processedMessages),
      tools: {
        propose_create_note: tool({
          description: "Proponer crear una nueva nota. No ejecuta el cambio; devuelve los datos de la propuesta para que el usuario la confirme en el chat.",
          parameters: z.object({
            title: z.string().describe("Título de la nota"),
            content: z.string().describe("Contenido inicial en markdown"),
            noteType: z.enum(["text", "checklist"]).describe("Tipo de nota: texto o lista de tareas"),
            categoryId: z.string().optional().describe("ID de la categoría existente donde se creará la nota. Si no se indica, el usuario la podrá elegir al aplicar."),
            parentNoteId: z.string().optional().describe("ID de la nota madre, si la nueva nota debe ser hija de otra."),
          }),
          execute: async ({ title, content, noteType, categoryId, parentNoteId }) => {
            return {
              status: "pending",
              action: "create_note",
              title,
              content,
              noteType,
              categoryId: categoryId || null,
              parentNoteId: parentNoteId || null,
            };
          },
        }),
        propose_update_note: tool({
          description: "Proponer añadir o modificar contenido de una nota existente. No ejecuta el cambio; devuelve los datos de la propuesta para que el usuario la confirme en el chat.",
          parameters: z.object({
            noteId: z.string().describe("ID de la nota a modificar"),
            title: z.string().optional().describe("Nuevo título, si se quiere cambiar"),
            appendContent: z.string().optional().describe("Texto en markdown para añadir al final del contenido actual."),
            replaceContent: z.string().optional().describe("Texto en markdown para reemplazar el contenido actual. Solo usar si el usuario pide explícitamente reemplazar."),
            addChecklistItems: z.array(z.string()).optional().describe("Items de tarea para añadir a una lista."),
          }),
          execute: async ({ noteId, title, appendContent, replaceContent, addChecklistItems }) => {
            return {
              status: "pending",
              action: "update_note",
              noteId,
              title,
              appendContent,
              replaceContent,
              addChecklistItems,
            };
          },
        }),
        propose_create_category: tool({
          description: "Proponer crear una nueva categoría (tema) en el mapa. No ejecuta el cambio; devuelve los datos de la propuesta para que el usuario la confirme en el chat.",
          parameters: z.object({
            name: z.string().describe("Nombre del tema"),
            color: z.string().optional().describe("Color HSL, por ejemplo '30 50% 50%'"),
            icon: z.string().optional().describe("Emoji o icono representativo"),
          }),
          execute: async ({ name, color, icon }) => {
            return {
              status: "pending",
              action: "create_category",
              name,
              color: color || "30 50% 50%",
              icon: icon || "📌",
            };
          },
        }),
        web_search: tool({
          description: "Buscar información actual en internet. La búsqueda la realiza el modelo con acceso web; incluye la consulta en la respuesta para transparencia.",
          parameters: z.object({
            query: z.string().describe("Consulta de búsqueda en español"),
          }),
          execute: async ({ query }) => {
            // Gemini via Lovable AI Gateway has web access. The model will use it to answer.
            return { query, sources: [] };
          },
        }),
      },
      maxSteps: 5,
    });

    const response = result.toUIMessageStreamResponse({
      headers: getLovableAiGatewayResponseHeaders(undefined, corsHeaders),
    });

    return withLovableAiGatewayRunIdHeader(response, gateway, corsHeaders);
  } catch (e) {
    console.error("ai-agent error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
