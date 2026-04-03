import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, notesContext, image, audio } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemContent = `Eres un asistente conversacional dentro de una app de notas llamada Exobrain. Responde siempre en español. Sé conciso y útil.

NO puedes crear, modificar ni eliminar notas. Solo puedes conversar con el usuario, responder preguntas, dar ideas y ayudarle a reflexionar.

Si el usuario te pide crear o modificar una nota, explícale amablemente que debe hacerlo directamente en la app.

Puedes analizar imágenes que el usuario te envíe y describir o responder preguntas sobre ellas.
Si el usuario te envía audio, transcríbelo y responde según su contenido.`;

    if (notesContext && notesContext.length > 0) {
      systemContent += `\n\nEl usuario tiene las siguientes notas en su app (incluyendo checklists). Puedes referenciarlas para responder preguntas sobre su contenido:\n\n`;
      for (const note of notesContext) {
        systemContent += `--- Nota: "${note.title}" (Categoría: ${note.category}) ---\n${note.content}\n\n`;
      }
    }

    // Build the last user message with multimodal content if image/audio provided
    const processedMessages = [...messages];
    if (image || audio) {
      const lastMsg = processedMessages[processedMessages.length - 1];
      if (lastMsg && lastMsg.role === "user") {
        const contentParts: any[] = [];
        if (lastMsg.content) {
          contentParts.push({ type: "text", text: lastMsg.content });
        }
        if (image) {
          contentParts.push({
            type: "image_url",
            image_url: { url: image },
          });
        }
        if (audio) {
          contentParts.push({
            type: "input_audio",
            input_audio: { data: audio.split(",")[1] || audio, format: "wav" },
          });
        }
        processedMessages[processedMessages.length - 1] = {
          role: "user",
          content: contentParts,
        };
      }
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemContent },
          ...processedMessages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes alcanzado. Inténtalo de nuevo en unos momentos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados. Añade fondos en Settings > Workspace > Usage." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Error del servicio AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
