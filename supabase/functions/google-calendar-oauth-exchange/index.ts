import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY = "https://connector-gateway.lovable.dev";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const CLIENT_API_KEY = Deno.env.get("GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY")!;

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
    const { data, error } = await anon.auth.getClaims(authHeader.slice(7));
    if (error || !data?.claims) return j({ error: "Unauthorized" }, 401);
    const userId = data.claims.sub as string;

    const { code } = await req.json();
    if (!code) return j({ error: "code required" }, 400);

    const res = await fetch(`${GATEWAY}/api/v1/app-users/oauth2/exchange`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Client-Api-Key": CLIENT_API_KEY,
      },
      body: JSON.stringify({ code }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error("exchange failed", res.status, text);
      return j({ error: "exchange_failed", status: res.status, details: text }, res.status);
    }
    const payload = JSON.parse(text);
    const connectionKey: string | undefined =
      payload.connection_api_key || payload.credential_api_key || payload.api_key || payload.key;
    if (!connectionKey) {
      console.error("no connection key in payload", payload);
      return j({ error: "no_connection_key", payload }, 500);
    }

    // Try to fetch user email via Google userinfo
    let email: string | null = null;
    try {
      const ui = await fetch(`${GATEWAY}/google_calendar/oauth2/v1/userinfo`, {
        headers: {
          "Lovable-API-Key": LOVABLE_API_KEY,
          "X-Connection-Api-Key": connectionKey,
        },
      });
      if (ui.ok) {
        const info = await ui.json();
        email = info.email ?? null;
      }
    } catch (_) { /* noop */ }

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await service.from("google_calendar_credentials").upsert({
      user_id: userId,
      connection_api_key: connectionKey,
      email,
      updated_at: new Date().toISOString(),
    });
    await service.from("profiles").update({
      google_calendar_connected: true,
      google_calendar_email: email,
    }).eq("id", userId);

    return j({ ok: true, email });
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
