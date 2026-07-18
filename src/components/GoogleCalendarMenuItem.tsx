import { useState } from "react";
import { CalendarPlus, CalendarCheck2, CalendarX, Inbox, Loader2 } from "lucide-react";
import { useGoogleCalendar, type IncomingEvent } from "@/hooks/useGoogleCalendar";
import { useNotes } from "@/contexts/NotesContext";
import { toast } from "@/components/ui/sonner";
import type { ChecklistItem } from "@/types/notes";

interface Props {
  onClose: () => void;
}

const GoogleCalendarMenuItem = ({ onClose }: Props) => {
  const gcal = useGoogleCalendar();
  const { notes, updateNote } = useNotes();
  const [pulling, setPulling] = useState(false);
  const [incoming, setIncoming] = useState<IncomingEvent[] | null>(null);

  const openIncoming = async () => {
    setPulling(true);
    const res = await gcal.pull();
    setPulling(false);
    if (!res) return;
    if (res.incoming.length === 0) {
      toast.success("No hay eventos nuevos en Google Calendar");
      return;
    }
    setIncoming(res.incoming);
  };

  const importEvent = (evt: IncomingEvent) => {
    // Find first checklist note; if none, tell user
    const target = notes.find(n => n.noteType === "checklist");
    if (!target) {
      toast.error("Crea una lista primero para importar el evento");
      return;
    }
    const newItem: ChecklistItem = {
      id: crypto.randomUUID(),
      text: evt.title,
      completed: false,
      notes: evt.notes,
      dueAt: evt.due_at,
      hasTime: evt.has_time,
      updatedAt: new Date().toISOString(),
    };
    updateNote(target.id, { checklist: [...target.checklist, newItem] });
    setIncoming(prev => prev?.filter(e => e.event_id !== evt.event_id) ?? null);
    toast.success(`Añadido a "${target.title}"`);
  };

  if (gcal.loading) return null;

  return (
    <>
      {gcal.connected ? (
        <>
          <button
            onClick={openIncoming}
            className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
          >
            {pulling ? <Loader2 size={12} className="animate-spin" /> : <Inbox size={12} />}
            Buscar eventos en Google
          </button>
          <button
            onClick={async () => { await gcal.disconnect(); onClose(); }}
            className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-muted-foreground"
          >
            <CalendarX size={12} />Desconectar Google Calendar
          </button>
        </>
      ) : (
        <button
          onClick={async () => { await gcal.connect(); }}
          className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
        >
          <CalendarPlus size={12} />Conectar Google Calendar
        </button>
      )}

      {incoming && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" onClick={() => setIncoming(null)}>
          <div className="bg-card border border-border rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h3 className="font-heading text-foreground">Eventos nuevos en Google</h3>
              <button onClick={() => setIncoming(null)} className="text-muted-foreground min-h-9 min-w-9">✕</button>
            </div>
            <div className="overflow-y-auto p-3 space-y-2 flex-1">
              {incoming.map(evt => (
                <div key={evt.event_id} className="p-3 rounded-md bg-muted/50 border border-border">
                  <p className="text-sm font-body text-foreground font-medium">{evt.title}</p>
                  {evt.due_at && <p className="text-xs text-muted-foreground font-body mt-0.5">{new Date(evt.due_at).toLocaleString("es-ES")}</p>}
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => importEvent(evt)}
                      className="text-xs px-3 py-2 rounded bg-primary text-primary-foreground min-h-9 font-body flex items-center gap-1">
                      <CalendarCheck2 size={14} /> Importar
                    </button>
                    <button onClick={() => setIncoming(prev => prev?.filter(e => e.event_id !== evt.event_id) ?? null)}
                      className="text-xs px-3 py-2 rounded bg-muted min-h-9 font-body">
                      Ignorar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GoogleCalendarMenuItem;
