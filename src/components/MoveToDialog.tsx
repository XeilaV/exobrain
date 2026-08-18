import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Search, Brain, FileText, ListChecks, Crosshair, ArrowLeft } from "lucide-react";
import { Note } from "@/types/notes";

interface Props {
  open: boolean;
  noteId: string | null;
  notes: Note[];
  brainName: string;
  onMove: (targetId: string | null) => void;
  onPickOnMap?: () => void;
  onCancel: () => void;
}

const MoveToDialog = ({ open, noteId, notes, brainName, onMove, onPickOnMap, onCancel }: Props) => {
  const [browseId, setBrowseId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<{ id: string | null } | null>(null);

  const note = notes.find(n => n.id === noteId) || null;

  useEffect(() => {
    if (open) { setBrowseId(null); setQuery(""); setPending(null); }
  }, [open, noteId]);

  const descendants = useMemo(() => {
    const ids = new Set<string>();
    if (!noteId) return ids;
    const walk = (id: string) => {
      for (const n of notes) if (n.parentNoteId === id && !ids.has(n.id)) { ids.add(n.id); walk(n.id); }
    };
    walk(noteId);
    return ids;
  }, [notes, noteId]);

  const isInvalid = (id: string) => id === noteId || descendants.has(id);

  const pathOf = (id: string): Note[] => {
    const chain: Note[] = [];
    let cur = notes.find(n => n.id === id);
    while (cur) {
      chain.unshift(cur);
      cur = cur.parentNoteId ? notes.find(n => n.id === cur!.parentNoteId) : undefined;
    }
    return chain;
  };

  const breadcrumb = browseId ? pathOf(browseId) : [];
  const level = notes
    .filter(n => (n.parentNoteId ?? null) === browseId)
    .sort((a, b) => a.title.localeCompare(b.title));

  const results = query.trim()
    ? notes
        .filter(n => n.title.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 40)
    : null;

  if (!open || !note) return null;

  const targetNote = pending && pending.id ? notes.find(n => n.id === pending.id) : null;
  const currentParent = note.parentNoteId ?? null;

  const Row = ({ n, showPath }: { n: Note; showPath?: boolean }) => {
    const invalid = isInvalid(n.id);
    const kids = notes.filter(c => c.parentNoteId === n.id).length;
    const path = showPath ? pathOf(n.id).slice(0, -1).map(p => p.title).join(" › ") : "";
    return (
      <div className={`flex items-center gap-1 rounded-lg border border-transparent ${invalid ? "opacity-40" : "hover:bg-muted"}`}>
        <button
          disabled={invalid}
          onClick={() => setPending({ id: n.id })}
          className="flex-1 min-w-0 flex items-center gap-2 px-2 py-2.5 text-left disabled:cursor-not-allowed"
        >
          <span className="text-sm shrink-0">{n.icon || (n.noteType === "checklist" ? "☑" : "📄")}</span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-body text-foreground">{n.title}</span>
            {showPath && path && <span className="block truncate text-[10px] font-body text-muted-foreground">{path}</span>}
            {!showPath && n.id === currentParent && <span className="block text-[10px] font-body text-muted-foreground">Madre actual</span>}
          </span>
        </button>
        {kids > 0 && (
          <button
            onClick={() => { setQuery(""); setBrowseId(n.id); }}
            className="px-2 py-2.5 text-muted-foreground hover:text-foreground shrink-0"
            title="Ver dentro"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-background/70 backdrop-blur-sm p-0 md:p-4"
        onClick={e => { e.stopPropagation(); onCancel(); }}
        onPointerDown={e => e.stopPropagation()}
      >
        <motion.div
          initial={{ y: 40, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 40, opacity: 0 }}
          className="bg-card border border-border rounded-t-2xl md:rounded-xl shadow-2xl w-full md:max-w-md max-h-[85vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-border">
            <h2 className="font-display text-lg font-bold text-foreground">Mover “{note.title}”</h2>
            <p className="text-xs font-body text-muted-foreground mt-0.5">
              Elige dónde colgarla. Se moverá con toda su descendencia.
            </p>
          </div>

          {pending ? (
            <div className="p-4 space-y-4">
              <div className="rounded-lg border border-border p-3 space-y-1">
                <p className="text-xs font-body text-muted-foreground">Nuevo destino</p>
                <p className="text-sm font-body text-foreground flex items-center gap-2">
                  {targetNote
                    ? <>{targetNote.icon || "📄"} {targetNote.title}</>
                    : <><Brain size={14} /> {brainName || "ExoBrain"} (rama principal)</>}
                </p>
                {targetNote && (
                  <p className="text-[11px] font-body text-muted-foreground">
                    {pathOf(targetNote.id).map(p => p.title).join(" › ")}
                  </p>
                )}
              </div>
              <p className="text-xs font-body text-muted-foreground">
                {descendants.size > 0
                  ? `Se moverán también sus ${descendants.size} nota${descendants.size === 1 ? "" : "s"} descendiente${descendants.size === 1 ? "" : "s"}. Los enlaces se mantienen.`
                  : "No tiene descendientes. Los enlaces se mantienen."}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPending(null)} className="flex-1 rounded-lg bg-muted text-foreground text-sm font-body py-2.5 min-h-11 md:min-h-0">
                  Atrás
                </button>
                <button onClick={() => onMove(pending.id)} className="flex-1 rounded-lg bg-primary text-primary-foreground text-sm font-body py-2.5 min-h-11 md:min-h-0">
                  Mover aquí
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-border space-y-2">
                <div className="flex items-center gap-2 bg-muted rounded-lg px-2">
                  <Search size={14} className="text-muted-foreground shrink-0" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar destino por nombre..."
                    className="flex-1 bg-transparent outline-none text-sm font-body py-2.5 text-foreground"
                  />
                </div>
                {onPickOnMap && (
                  <button
                    onClick={onPickOnMap}
                    className="w-full flex items-center gap-2 rounded-lg border border-border px-2 py-2.5 text-sm font-body text-foreground hover:bg-muted"
                  >
                    <Crosshair size={14} className="text-muted-foreground" />
                    Señalar destino en el mapa
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {results ? (
                  results.length === 0
                    ? <p className="text-sm font-body text-muted-foreground px-2 py-4 text-center">Sin resultados</p>
                    : results.map(n => <Row key={n.id} n={n} showPath />)
                ) : (
                  <>
                    <div className="flex items-center gap-1 flex-wrap text-[11px] font-body text-muted-foreground px-1 pb-1">
                      <button onClick={() => setBrowseId(null)} className="hover:text-foreground">{brainName || "ExoBrain"}</button>
                      {breadcrumb.map(b => (
                        <span key={b.id} className="flex items-center gap-1">
                          <ChevronRight size={11} />
                          <button onClick={() => setBrowseId(b.id)} className="hover:text-foreground">{b.title}</button>
                        </span>
                      ))}
                    </div>

                    {browseId ? (
                      <button
                        onClick={() => {
                          const parent = notes.find(n => n.id === browseId)?.parentNoteId ?? null;
                          setBrowseId(parent);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-2 text-sm font-body text-muted-foreground hover:bg-muted rounded-lg"
                      >
                        <ArrowLeft size={14} /> Subir un nivel
                      </button>
                    ) : null}

                    <button
                      onClick={() => setPending({ id: null })}
                      className="w-full flex items-center gap-2 px-2 py-2.5 rounded-lg hover:bg-muted text-left"
                    >
                      <Brain size={16} className="text-muted-foreground" />
                      <span className="text-sm font-body text-foreground">
                        {brainName || "ExoBrain"} <span className="text-muted-foreground">— rama principal</span>
                      </span>
                    </button>

                    {browseId && !isInvalid(browseId) && (
                      <button
                        onClick={() => setPending({ id: browseId })}
                        className="w-full flex items-center gap-2 px-2 py-2.5 rounded-lg hover:bg-muted text-left"
                      >
                        {notes.find(n => n.id === browseId)?.noteType === "checklist"
                          ? <ListChecks size={16} className="text-muted-foreground" />
                          : <FileText size={16} className="text-muted-foreground" />}
                        <span className="text-sm font-body text-foreground">
                          Colgar aquí: {notes.find(n => n.id === browseId)?.title}
                        </span>
                      </button>
                    )}

                    {level.length === 0
                      ? <p className="text-xs font-body text-muted-foreground px-2 py-3">No hay notas en este nivel.</p>
                      : level.map(n => <Row key={n.id} n={n} />)}
                  </>
                )}
              </div>
            </>
          )}

          <div className="p-3 border-t border-border">
            <button onClick={onCancel} className="w-full rounded-lg bg-muted text-foreground text-sm font-body py-2.5 min-h-11 md:min-h-0">
              Cancelar
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MoveToDialog;
