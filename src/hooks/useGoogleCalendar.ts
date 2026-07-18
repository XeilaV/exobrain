import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

export type GcalSyncStatus = "pending" | "synced" | "declined";

export interface GcalMapping {
  task_id: string;
  event_id: string | null;
  sync_status: GcalSyncStatus;
  note_id: string | null;
}

export interface IncomingEvent {
  event_id: string;
  title: string;
  notes: string;
  due_at: string | null;
  has_time: boolean;
  html_link?: string;
}

export function useGoogleCalendar() {
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [mappings, setMappings] = useState<Record<string, GcalMapping>>({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const [{ data: prof }, { data: rows }] = await Promise.all([
      supabase.from("profiles").select("google_calendar_connected, google_calendar_email").eq("id", user.id).maybeSingle(),
      supabase.from("google_calendar_sync").select("task_id, event_id, sync_status, note_id").eq("user_id", user.id),
    ]);
    setConnected(!!prof?.google_calendar_connected);
    setEmail(prof?.google_calendar_email ?? null);
    const map: Record<string, GcalMapping> = {};
    for (const r of rows ?? []) map[r.task_id] = r as GcalMapping;
    setMappings(map);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const connect = useCallback(async () => {
    const return_url = `${window.location.origin}/oauth/google-callback`;
    const { data, error } = await supabase.functions.invoke("google-calendar-oauth-start", {
      body: { return_url },
    });
    if (error || !data?.authorization_url) {
      toast.error("No se pudo iniciar la conexión con Google");
      console.error(error, data);
      return;
    }
    const popup = window.open(data.authorization_url, "gcal_oauth", "width=520,height=680");
    if (!popup) { toast.error("Permite popups para conectar Google Calendar"); return; }
    await new Promise<void>((resolve) => {
      const handler = (evt: MessageEvent) => {
        if (evt.origin !== window.location.origin) return;
        if (evt.data?.type === "gcal_oauth_done") {
          window.removeEventListener("message", handler);
          resolve();
        }
      };
      window.addEventListener("message", handler);
      const timer = setInterval(() => {
        if (popup.closed) { clearInterval(timer); window.removeEventListener("message", handler); resolve(); }
      }, 500);
    });
    await refresh();
    toast.success("Google Calendar conectado");
  }, [refresh]);

  const disconnect = useCallback(async () => {
    const { error } = await supabase.functions.invoke("google-calendar-disconnect", { body: {} });
    if (error) { toast.error("No se pudo desconectar"); return; }
    await refresh();
    toast.success("Google Calendar desconectado");
  }, [refresh]);

  const syncTask = useCallback(async (params: {
    note_id: string; task_id: string; title: string; notes?: string; due_at: string; has_time?: boolean;
  }) => {
    const { data, error } = await supabase.functions.invoke("google-calendar-sync-task", {
      body: { action: "upsert", ...params },
    });
    if (error) { toast.error("Error al sincronizar con Google Calendar"); console.error(error); return null; }
    await refresh();
    toast.success("Sincronizado con Google Calendar");
    return data;
  }, [refresh]);

  const declineTask = useCallback(async (note_id: string, task_id: string) => {
    await supabase.functions.invoke("google-calendar-sync-task", {
      body: { action: "decline", note_id, task_id },
    });
    await refresh();
  }, [refresh]);

  const removeTask = useCallback(async (note_id: string, task_id: string) => {
    const { error } = await supabase.functions.invoke("google-calendar-sync-task", {
      body: { action: "delete", note_id, task_id },
    });
    if (error) toast.error("Error al eliminar del calendario");
    else toast.success("Eliminado de Google Calendar");
    await refresh();
  }, [refresh]);

  const pull = useCallback(async (): Promise<{ incoming: IncomingEvent[] } | null> => {
    const { data, error } = await supabase.functions.invoke("google-calendar-pull", { body: {} });
    if (error) { console.error(error); return null; }
    return data;
  }, []);

  return { connected, email, mappings, loading, connect, disconnect, syncTask, declineTask, removeTask, pull, refresh };
}
