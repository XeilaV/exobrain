import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useNotes } from "@/contexts/NotesContext";
import { History, RotateCcw, FileText, ListChecks, ChevronDown, ChevronRight, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import type { ChecklistItem } from "@/types/notes";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface HistoryRow {
  id: string;
  note_id: string;
  title: string;
  content: string;
  checklist: ChecklistItem[];
  note_type: string;
  event_type: string;
  source: string;
  created_at: string;
}

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const stripHtml = (html: string) =>
  (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const preview = (row: HistoryRow) => {
  if (row.checklist && row.checklist.length) {
    return row.checklist.slice(0, 3).map((i) => `• ${i.text}`).join(" ");
  }
  const text = stripHtml(row.content);
  return text.length > 120 ? text.slice(0, 120) + "…" : text || "(vacío)";
};

// Word-level diff summary between two plain text blobs.
const describeTextChange = (prev: string, curr: string): string[] => {
  const a = stripHtml(prev);
  const b = stripHtml(curr);
  if (a === b) return ["Sin cambios en el texto"];
  const aw = a ? a.split(/\s+/) : [];
  const bw = b ? b.split(/\s+/) : [];
  const setA = new Set(aw);
  const setB = new Set(bw);
  const added = bw.filter((w) => !setA.has(w));
  const removed = aw.filter((w) => !setB.has(w));
  const out: string[] = [];
  const diff = bw.length - aw.length;
  if (diff > 0) out.push(`+${diff} palabra${diff === 1 ? "" : "s"}`);
  else if (diff < 0) out.push(`${diff} palabra${diff === -1 ? "" : "s"}`);
  else out.push("Se reescribió el texto");
  if (added.length) out.push(`Añadido: "${added.slice(0, 8).join(" ")}${added.length > 8 ? "…" : ""}"`);
  if (removed.length) out.push(`Eliminado: "${removed.slice(0, 8).join(" ")}${removed.length > 8 ? "…" : ""}"`);
  return out;
};

const describeChecklistChange = (
  prev: ChecklistItem[] = [],
  curr: ChecklistItem[] = []
): string[] => {
  const prevMap = new Map(prev.map((i) => [i.id, i]));
  const currMap = new Map(curr.map((i) => [i.id, i]));
  const added = curr.filter((i) => !prevMap.has(i.id));
  const removed = prev.filter((i) => !currMap.has(i.id));
  const toggled: string[] = [];
  const renamed: string[] = [];
  for (const [id, c] of currMap) {
    const p = prevMap.get(id);
    if (!p) continue;
    if (p.completed !== c.completed)
      toggled.push(`${c.completed ? "✓" : "○"} ${c.text}`);
    if (p.text !== c.text) renamed.push(`"${p.text}" → "${c.text}"`);
  }
  const out: string[] = [];
  if (added.length) out.push(`Añadidos ${added.length}: ${added.map((i) => `"${i.text}"`).join(", ")}`);
  if (removed.length) out.push(`Eliminados ${removed.length}: ${removed.map((i) => `"${i.text}"`).join(", ")}`);
  if (toggled.length) out.push(`Marcados: ${toggled.join(", ")}`);
  if (renamed.length) out.push(`Editados: ${renamed.join(", ")}`);
  if (!out.length) out.push("Sin cambios en la lista");
  return out;
};

export default function HistoryDialog({ open, onOpenChange }: Props) {
  const { notes, restoreVersion, recoverDeletedVersion, setSelectedNoteId } = useNotes();
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [workingId, setWorkingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("note_versions")
        .select("id, note_id, title, content, checklist, note_type, event_type, source, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
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
    return () => {
      cancelled = true;
    };
  }, [open]);

  const noteById = useMemo(() => new Map(notes.map((n) => [n.id, n])), [notes]);

  // For each row, find its previous version (older) of the same note.
  const prevByRowId = useMemo(() => {
    const map = new Map<string, HistoryRow | null>();
    // rows are sorted desc by created_at → previous is the next occurrence with same note_id
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      let prev: HistoryRow | null = null;
      for (let j = i + 1; j < rows.length; j++) {
        if (rows[j].note_id === r.note_id) {
          prev = rows[j];
          break;
        }
      }
      map.set(r.id, prev);
    }
    return map;
  }, [rows]);

  const restore = async (row: HistoryRow) => {
    const note = noteById.get(row.note_id);
    setWorkingId(row.id);
    const ok = note
      ? await restoreVersion(row.note_id, row.id)
      : !!(await recoverDeletedVersion(row.id));
    setWorkingId(null);
    if (!ok) return;
    onOpenChange(false);
    if (note) setSelectedNoteId(row.note_id);
  };

  const eventLabel = (eventType?: string) => {
    switch (eventType) {
      case "delete": return "Borrada";
      case "pre_restore": return "Antes de restaurar";
      case "recover_deleted": return "Recuperada";
      default: return "Edición";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-4xl h-[92vh] max-h-[92vh] flex flex-col p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading">
            <History size={18} /> Historial real
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
              const isDeleted = !note || row.event_type === "delete";
              const isChecklist = row.note_type === "checklist" || (row.checklist && row.checklist.length > 0);
              const isOpen = expandedId === row.id;
              const prev = prevByRowId.get(row.id) ?? null;
              const changes = isChecklist
                ? describeChecklistChange(prev?.checklist || [], row.checklist || [])
                : describeTextChange(prev?.content || "", row.content || "");
              const isFirst = !prev;
              return (
                <li
                  key={row.id}
                  className="border border-border rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div className="p-3 flex items-start justify-between gap-3">
                    <button
                      onClick={() => setExpandedId(isOpen ? null : row.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground font-body">
                        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                        {row.event_type === "delete" ? <Trash2 size={12} /> : isChecklist ? <ListChecks size={12} /> : <FileText size={12} />}
                        <span className="font-medium text-foreground truncate max-w-[180px] sm:max-w-sm">
                          {row.title || note?.title || "Nota sin título"}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-muted text-[10px] uppercase">
                          {eventLabel(row.event_type)}
                        </span>
                        {isDeleted && (
                          <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-[10px] uppercase text-destructive">
                            recuperable
                          </span>
                        )}
                        <span>{formatDate(row.created_at)}</span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2 font-body">
                        {preview(row)}
                      </p>
                    </button>
                    <button
                      onClick={() => restore(row)}
                      disabled={workingId === row.id}
                      className="shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors font-body disabled:opacity-60"
                      title={note ? "Restaurar esta versión" : "Recuperar esta nota"}
                    >
                      {note ? <RotateCcw size={12} /> : <Undo2 size={12} />}
                      <span className="hidden sm:inline">{note ? "Restaurar" : "Recuperar"}</span>
                    </button>
                  </div>
                  {isOpen && (
                    <div className="px-3 pb-3 border-t border-border/60 pt-2 space-y-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                          Cambios
                        </p>
                        {isFirst ? (
                          <p className="text-sm font-body">Primera versión guardada.</p>
                        ) : (
                          <ul className="text-sm font-body space-y-0.5 list-disc list-inside">
                            {changes.map((c, i) => (
                              <li key={i}>{c}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {!isFirst && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div className="rounded-md bg-muted/40 p-2">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                              Antes
                            </p>
                            {isChecklist ? (
                              <ul className="text-xs space-y-0.5">
                                {(prev?.checklist || []).map((i) => (
                                  <li key={i.id}>
                                    {i.completed ? "✓" : "○"} {i.text}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs whitespace-pre-wrap">
                                {stripHtml(prev?.content || "") || "(vacío)"}
                              </p>
                            )}
                          </div>
                          <div className="rounded-md bg-muted/40 p-2">
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                              Ahora
                            </p>
                            {isChecklist ? (
                              <ul className="text-xs space-y-0.5">
                                {(row.checklist || []).map((i) => (
                                  <li key={i.id}>
                                    {i.completed ? "✓" : "○"} {i.text}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs whitespace-pre-wrap">
                                {stripHtml(row.content) || "(vacío)"}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                      <div className="rounded-md bg-muted/40 p-2">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                          Versión completa
                        </p>
                        {isChecklist ? (
                          <ul className="text-xs space-y-0.5">
                            {(row.checklist || []).map((i) => (
                              <li key={i.id}>
                                {i.style === "bullet" ? "•" : i.completed ? "✓" : "○"} {i.text}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs whitespace-pre-wrap max-h-64 overflow-y-auto font-body">
                            {stripHtml(row.content) || "(vacío)"}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
