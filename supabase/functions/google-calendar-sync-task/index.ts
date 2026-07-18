import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY = "https://connector-gateway.lovable.dev";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type Body = {
  action: "upsert" | "delete" | "decline";
  note_id: string;
  task_id: string;
  title?: string;
  notes?: string;
  due_at?: string | null;
  has_time?: boolean;
};

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
    const { data: claims, error: cErr } = await anon.auth.getClaims(authHeader.slice(7));
    if (cErr || !claims?.claims) return j({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const body = (await req.json()) as Body;
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up existing mapping
    const { data: existing } = await service
      .from("google_calendar_sync")
      .select("*")
      .eq("task_id", body.task_id)
      .maybeSingle();

    if (body.action === "decline") {
      await service.from("google_calendar_sync").upsert({
        task_id: body.task_id,
        user_id: userId,
        note_id: body.note_id,
        sync_status: "declined",
        updated_at: new Date().toISOString(),
      });
      return j({ ok: true, sync_status: "declined" });
    }

    // Load connection key
    const { data: cred } = await service
      .from("google_calendar_credentials")
      .select("connection_api_key, calendar_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!cred) return j({ error: "not_connected" }, 400);

    const calendarId = existing?.calendar_id ?? cred.calendar_id ?? "primary";
    const gcalHeaders = {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_API_KEY,
      "X-Connection-Api-Key": cred.connection_api_key,
    };

    if (body.action === "delete") {
      if (existing?.event_id) {
        const del = await fetch(
          `${GATEWAY}/google_calendar/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existing.event_id)}`,
          { method: "DELETE", headers: gcalHeaders },
        );
        if (!del.ok && del.status !== 404 && del.status !== 410) {
          const t = await del.text();
          console.error("delete event failed", del.status, t);
        }
      }
      await service.from("google_calendar_sync").delete().eq("task_id", body.task_id);
      return j({ ok: true });
    }

    // upsert event
    if (!body.due_at) return j({ error: "due_at required" }, 400);
    const start = buildStart(body.due_at, body.has_time);
    const end = buildEnd(body.due_at, body.has_time);
    const event = {
      summary: body.title ?? "Tarea",
      description: (body.notes ?? "") + "\n\nDesde ExoBrain",
      start, end,
      extendedProperties: {
        private: { exobrain_task_id: body.task_id, exobrain_note_id: body.note_id },
      },
    };

    let eventId = existing?.event_id;
    let resp: Response;
    if (eventId) {
      resp = await fetch(
        `${GATEWAY}/google_calendar/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        { method: "PATCH", headers: gcalHeaders, body: JSON.stringify(event) },
      );
    } else {
      resp = await fetch(
        `${GATEWAY}/google_calendar/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
        { method: "POST", headers: gcalHeaders, body: JSON.stringify(event) },
      );
    }
    const text = await resp.text();
    if (!resp.ok) {
      console.error("event upsert failed", resp.status, text);
      return j({ error: "gcal_failed", status: resp.status, details: text }, resp.status);
    }
    const evt = JSON.parse(text);
    eventId = evt.id;

    await service.from("google_calendar_sync").upsert({
      task_id: body.task_id,
      user_id: userId,
      note_id: body.note_id,
      event_id: eventId,
      calendar_id: calendarId,
      sync_status: "synced",
      last_google_update: evt.updated ?? new Date().toISOString(),
      last_local_update: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return j({ ok: true, event_id: eventId, html_link: evt.htmlLink });
  } catch (e) {
    console.error(e);
    return j({ error: String(e) }, 500);
  }
});

function buildStart(dueAt: string, hasTime?: boolean) {
  const d = new Date(dueAt);
  if (hasTime) return { dateTime: d.toISOString() };
  return { date: dueAt.slice(0, 10) };
}
function buildEnd(dueAt: string, hasTime?: boolean) {
  const d = new Date(dueAt);
  if (hasTime) {
    const end = new Date(d.getTime() + 30 * 60 * 1000);
    return { dateTime: end.toISOString() };
  }
  const next = new Date(dueAt);
  next.setUTCDate(next.getUTCDate() + 1);
  return { date: next.toISOString().slice(0, 10) };
}

function j(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
