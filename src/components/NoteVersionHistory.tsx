import { useState, useEffect } from "react";
import { useNotes } from "@/contexts/NotesContext";
import { History, X, RotateCcw, Clock, Bot, FileEdit, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { NoteVersion } from "@/contexts/NotesContext";
import { toast } from "sonner";

interface NoteVersionHistoryProps {
  noteId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const sourceLabel = (source: string) => {
  if (source === "ai") return { icon: <Bot size={12} />, label: "IA" };
  if (source === "manual" || source === "user") return { icon: <FileEdit size={12} />, label: "Manual" };
  return { icon: <Clock size={12} />, label: "Auto" };
};

const NoteVersionHistory = ({ noteId, isOpen, onClose }: NoteVersionHistoryProps) => {
  const { getNoteVersions, restoreVersion } = useNotes();
  const [versions, setVersions] = useState<NoteVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !noteId) {
      setVersions([]);
      setExpandedId(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    getNoteVersions(noteId).then((data) => {
      if (mounted) {
        setVersions(data);
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [isOpen, noteId, getNoteVersions]);

  const handleRestore = async (versionId: string) => {
    if (!noteId) return;
    const ok = await restoreVersion(noteId, versionId);
    if (ok) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[60]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(92vw,520px)] max-h-[80vh] bg-card border border-border rounded-2xl shadow-2xl z-[70] flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <History size={18} className="text-primary" />
                <h2 className="font-display font-semibold text-foreground text-base">Historial de versiones</h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 min-h-11 min-w-11 md:min-h-0 md:min-w-0 md:p-1 flex items-center justify-center"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!noteId && (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  No hay una nota seleccionada.
                </div>
              )}
              {noteId && loading && (
                <div className="text-center text-muted-foreground py-8 text-sm flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  Cargando versiones...
                </div>
              )}
              {noteId && !loading && versions.length === 0 && (
                <div className="text-center text-muted-foreground py-8 text-sm">
                  Aún no hay versiones guardadas. El historial se genera automáticamente al editar la nota o aplicar sugerencias de la IA.
                </div>
              )}
              {versions.map((version) => {
                const isExpanded = expandedId === version.id;
                const meta = sourceLabel(version.source);
                return (
                  <div
                    key={version.id}
                    className="border border-border rounded-xl bg-muted/40 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : version.id)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-muted-foreground">{meta.icon}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {meta.label} · {format(new Date(version.createdAt), "d MMM yyyy HH:mm", { locale: es })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true, locale: es })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 space-y-2">
                            {version.content && (
                              <div className="bg-card rounded-lg p-2.5 text-xs text-foreground max-h-32 overflow-y-auto whitespace-pre-wrap font-body border border-border">
                                {version.content.length > 300 ? version.content.slice(0, 300) + "..." : version.content}
                              </div>
                            )}
                            {version.checklist && version.checklist.length > 0 && (
                              <div className="bg-card rounded-lg p-2.5 text-xs text-foreground border border-border">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">Lista</p>
                                <ul className="space-y-1 max-h-32 overflow-y-auto">
                                  {version.checklist.map((item) => (
                                    <li key={item.id} className={`flex items-center gap-1.5 ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                                      <span>{item.completed ? "☑" : "☐"}</span>
                                      <span className="font-body">{item.text || <span className="italic text-muted-foreground/60">Sin título</span>}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            <button
                              onClick={() => handleRestore(version.id)}
                              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                            >
                              <RotateCcw size={14} /> Restaurar esta versión
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NoteVersionHistory;
