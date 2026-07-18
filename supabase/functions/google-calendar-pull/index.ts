import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY = "https://connector-gateway.lovable.dev";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return j({ error: "Unauthorized" }, 401);
    const anon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await anon.auth.getClaims(authHeader.slice(7));
    if (!claims?.claims) return j({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: cred } = await service
      .from("google_calendar_credentials")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (!cred) return j({ error: "not_connected" }, 400);

    const calendarId = cred.calendar_id ?? "primary";
    const since = cred.last_sync_at
      ? new Date(cred.last_sync_at).toISOString()
      : new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    const url = new URL(
      `${GATEWAY}/google_calendar/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    );
    url.searchParams.set("updatedMin", since);
    url.searchParams.set("showDeleted", "true");
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("maxResults", "50");

    const res = await fetch(url.toString(), {
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Connection-Api-Key": cred.connection_api_key,
      },
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("pull failed", res.status, text);
      return j({ error: "gcal_failed", status: res.status, details: text }, res.status);
    }
    const data = JSON.parse(text);
    const events = (data.items ?? []) as any[];

    // Load existing mappings to classify
    const { data: mappings } = await service
      .from("google_calendar_sync")
      .select("task_id, event_id")
      .eq("user_id", userId);
    const byEvent = new Map<string, string>();
    for (const m of mappings ?? []) if (m.event_id) byEvent.set(m.event_id, m.task_id);

    const incoming: any[] = [];
    const updated: any[] = [];
    const deleted: string[] = [];
    for (const e of events) {
      if (e.status === "cancelled") {
        const tid = byEvent.get(e.id);
        if (tid) deleted.push(tid);
        continue;
      }
      const own = e.extendedProperties?.private?.exobrain_task_id;
      if (own || byEvent.has(e.id)) {
        updated.push({
          task_id: own ?? byEvent.get(e.id),
          note_id: e.extendedProperties?.private?.exobrain_note_id ?? null,
          title: e.summary ?? "",
          notes: (e.description ?? "").replace(/\n\nDesde ExoBrain$/, ""),
          due_at: e.start?.dateTime ?? e.start?.date ?? null,
          has_time: !!e.start?.dateTime,
          updated: e.updated,
        });
      } else {
        incoming.push({
          event_id: e.id,
          title: e.summary ?? "(sin título)",
          notes: e.description ?? "",
          due_at: e.start?.dateTime ?? e.start?.date ?? null,
          has_time: !!e.start?.dateTime,
          html_link: e.htmlLink,
        });
      }
    }

    await service
      .from("google_calendar_credentials")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("user_id", userId);

    return j({ incoming, updated, deleted });
  } catch (e) {
    console.error(e);
    return j({ error: String(e) }, 500);
  }
});

function j(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
