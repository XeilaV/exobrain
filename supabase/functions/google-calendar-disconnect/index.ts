import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
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

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  await service.from("google_calendar_credentials").delete().eq("user_id", userId);
  await service.from("google_calendar_sync").delete().eq("user_id", userId);
  await service.from("profiles").update({
    google_calendar_connected: false,
    google_calendar_email: null,
  }).eq("id", userId);
  return j({ ok: true });
});

function j(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
