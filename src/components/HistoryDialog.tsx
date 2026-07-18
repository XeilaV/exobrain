import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useNotes } from "@/contexts/NotesContext";
import { History, RotateCcw, FileText, ListChecks } from "lucide-react";
import { toast } from "sonner";
import type { ChecklistItem } from "@/types/notes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HistoryRow {
  id: string;
  note_id: string;
  content: string;
  checklist: ChecklistItem[];
  source: string;
  created_at: string;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const preview = (row: HistoryRow) => {
  if (row.checklist && row.checklist.length) {
    return row.checklist.slice(0, 3).map((i) => `• ${i.text}`).join(" ");
  }
  const text = (row.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 120 ? text.slice(0, 120) + "…" : text || "(vacío)";
};

export default function HistoryDialog({ open, onOpenChange }: Props) {
  const { notes, updateNote, setSelectedNoteId } = useNotes();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("note_versions")
        .select("id, note_id, content, checklist, source, created_at")
        .order("created_at", { ascending: false })
        .limit(80);
      if (!cancelled) {
        if (error) {
          console.error("history load error:", error);
          toast.error("No se pudo cargar el historial");
        } else {
          setRows((data || []) as any);
        }
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const noteById = new Map(notes.map((n) => [n.id, n]));

  const restore = async (row: HistoryRow) => {
    const note = noteById.get(row.note_id);
    if (!note) {
      toast.error("La nota original ya no existe");
      return;
    }
    updateNote(row.note_id, {
      content: row.content,
      checklist: row.checklist || [],
    });
    toast.success("Versión restaurada");
    onOpenChange(false);
    setSelectedNoteId(row.note_id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <History size={18} /> Historial
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto flex-1 -mx-2 px-2">
          {loading && (
            <p className="text-sm text-muted-foreground py-8 text-center">Cargando…</p>
          )}
          {!loading && rows.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Aún no hay historial. Al editar tus notas se guardan versiones automáticas.
            </p>
          )}
          <ul className="space-y-2">
            {rows.map((row) => {
              const note = noteById.get(row.note_id);
              const isChecklist = row.checklist && row.checklist.length > 0;
              return (
                <li
                  key={row.id}
                  className="border border-border rounded-lg p-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-body">
                        {isChecklist ? <ListChecks size={12} /> : <FileText size={12} />}
                        <span className="truncate font-medium text-foreground">
                          {note?.title || "(nota eliminada)"}
                        </span>
                        <span>·</span>
                        <span>{formatDate(row.created_at)}</span>
                        {row.source && row.source !== "user" && (
                          <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] uppercase">
                            {row.source}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2 font-body">
                        {preview(row)}
                      </p>
                    </div>
                    {note && (
                      <button
                        onClick={() => restore(row)}
                        className="shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors font-body"
                        title="Restaurar esta versión"
                      >
                        <RotateCcw size={12} /> Restaurar
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
