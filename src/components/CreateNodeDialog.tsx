import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, ListChecks, Folder } from "lucide-react";
import { Category, Note } from "@/types/notes";
import ColorPicker from "./ColorPicker";
import { DEFAULT_CATEGORY_COLOR } from "@/lib/categoryColors";

type Mode = "pick" | "category" | "note";

interface Props {
  open: boolean;
  categories: Category[];
  notes: Note[];
  defaultCategoryId?: string | null;
  onCreateCategory: (name: string, color: string) => void;
  onCreateNote: (categoryId: string, parentNoteId: string | null, type: "text" | "checklist", name: string) => void;
  onCancel: () => void;
}

const CreateNodeDialog = ({
  open, categories, notes, defaultCategoryId,
  onCreateCategory, onCreateNote, onCancel,
}: Props) => {
  const [mode, setMode] = useState<Mode>("pick");
  const [noteType, setNoteType] = useState<"text" | "checklist">("text");
  const [name, setName] = useState("");
  const [color, setColor] = useState(DEFAULT_CATEGORY_COLOR);
  const [categoryId, setCategoryId] = useState<string>("");
  const [parentNoteId, setParentNoteId] = useState<string>("");

  useEffect(() => {
    if (open) {
      setMode("pick");
      setName("");
      setColor(DEFAULT_CATEGORY_COLOR);
      setCategoryId(defaultCategoryId || categories[0]?.id || "");
      setParentNoteId("");
      setNoteType("text");
    }
  }, [open, defaultCategoryId, categories]);

  if (!open) return null;

  const hasCategories = categories.length > 0;
  const parentCandidates = notes.filter(n => n.categoryId === categoryId);

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (mode === "category") {
      onCreateCategory(trimmed, color);
    } else if (mode === "note") {
      if (!categoryId) return;
      onCreateNote(categoryId, parentNoteId || null, noteType, trimmed);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-xl shadow-2xl p-4 w-full max-w-sm space-y-4"
        onClick={e => e.stopPropagation()}
        role="dialog"
      >
        {mode === "pick" && (
          <>
            <h3 className="font-display text-base font-semibold text-foreground">Crear nuevo</h3>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => { setMode("category"); }}
                className="flex items-center gap-3 p-3 min-h-12 rounded-lg border border-border hover:bg-muted text-left"
              >
                <Folder size={18} className="text-muted-foreground shrink-0" />
                <div>
                  <div className="text-sm font-medium text-foreground">Tema</div>
                  <div className="text-xs text-muted-foreground">Nueva rama del árbol</div>
                </div>
              </button>
              <button
                onClick={() => { setMode("note"); setNoteType("text"); }}
                disabled={!hasCategories}
                className="flex items-center gap-3 p-3 min-h-12 rounded-lg border border-border hover:bg-muted text-left disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <FileText size={18} className="text-muted-foreground shrink-0" />
                <div>
                  <div className="text-sm font-medium text-foreground">Nota de texto</div>
                  <div className="text-xs text-muted-foreground">Editor con estilos</div>
                </div>
              </button>
              <button
                onClick={() => { setMode("note"); setNoteType("checklist"); }}
                disabled={!hasCategories}
                className="flex items-center gap-3 p-3 min-h-12 rounded-lg border border-border hover:bg-muted text-left disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ListChecks size={18} className="text-muted-foreground shrink-0" />
                <div>
                  <div className="text-sm font-medium text-foreground">Tasks</div>
                  <div className="text-xs text-muted-foreground">Lista de tareas</div>
                </div>
              </button>
            </div>
            {!hasCategories && (
              <p className="text-xs text-muted-foreground">Crea primero un tema para poder añadir notas.</p>
            )}
            <div className="flex justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2.5 md:px-3 md:py-1.5 min-h-11 md:min-h-0 rounded-md text-sm md:text-xs font-body text-muted-foreground hover:bg-muted"
              >Cancelar</button>
            </div>
          </>
        )}

        {mode === "category" && (
          <>
            <h3 className="font-display text-base font-semibold text-foreground">Nuevo tema</h3>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submit(); } if (e.key === "Escape") onCancel(); }}
              placeholder="Nombre del tema..."
              className="w-full bg-muted rounded-md text-base md:text-sm px-3 py-3 md:py-2 min-h-11 md:min-h-0 text-foreground outline-none focus:ring-2 focus:ring-ring font-body"
            />
            <div>
              <div className="text-xs text-muted-foreground mb-2">Color</div>
              <ColorPicker value={color} onChange={setColor} />
            </div>
            <div className="flex gap-2 justify-between">
              <button onClick={() => setMode("pick")} className="px-3 py-2 min-h-11 md:min-h-0 rounded-md text-xs text-muted-foreground hover:bg-muted">← Atrás</button>
              <div className="flex gap-2">
                <button onClick={onCancel} className="px-3 py-2 min-h-11 md:min-h-0 rounded-md text-xs text-muted-foreground hover:bg-muted">Cancelar</button>
                <button onClick={submit} disabled={!name.trim()} className="px-4 py-2 min-h-11 md:min-h-0 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40">Crear</button>
              </div>
            </div>
          </>
        )}

        {mode === "note" && (
          <>
            <h3 className="font-display text-base font-semibold text-foreground">
              {noteType === "checklist" ? "Nueva lista de tareas" : "Nueva nota"}
            </h3>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submit(); } if (e.key === "Escape") onCancel(); }}
              placeholder={noteType === "checklist" ? "Nombre de la lista..." : "Nombre de la nota..."}
              className="w-full bg-muted rounded-md text-base md:text-sm px-3 py-3 md:py-2 min-h-11 md:min-h-0 text-foreground outline-none focus:ring-2 focus:ring-ring font-body"
            />
            <div className="space-y-2">
              <label className="block">
                <span className="text-xs text-muted-foreground">Tema</span>
                <select
                  value={categoryId}
                  onChange={e => { setCategoryId(e.target.value); setParentNoteId(""); }}
                  className="mt-1 w-full bg-muted rounded-md text-sm px-3 py-2 min-h-11 md:min-h-0 text-foreground outline-none focus:ring-2 focus:ring-ring font-body"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-muted-foreground">Madre (opcional)</span>
                <select
                  value={parentNoteId}
                  onChange={e => setParentNoteId(e.target.value)}
                  className="mt-1 w-full bg-muted rounded-md text-sm px-3 py-2 min-h-11 md:min-h-0 text-foreground outline-none focus:ring-2 focus:ring-ring font-body"
                >
                  <option value="">— Sin madre (directo del tema) —</option>
                  {parentCandidates.map(n => (
                    <option key={n.id} value={n.id}>{n.title || "(sin título)"}</option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setNoteType("text")}
                  className={`flex-1 px-3 py-2 min-h-11 md:min-h-0 rounded-md text-xs border ${noteType === "text" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                >Texto</button>
                <button
                  onClick={() => setNoteType("checklist")}
                  className={`flex-1 px-3 py-2 min-h-11 md:min-h-0 rounded-md text-xs border ${noteType === "checklist" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                >Tasks</button>
              </div>
            </div>
            <div className="flex gap-2 justify-between">
              <button onClick={() => setMode("pick")} className="px-3 py-2 min-h-11 md:min-h-0 rounded-md text-xs text-muted-foreground hover:bg-muted">← Atrás</button>
              <div className="flex gap-2">
                <button onClick={onCancel} className="px-3 py-2 min-h-11 md:min-h-0 rounded-md text-xs text-muted-foreground hover:bg-muted">Cancelar</button>
                <button onClick={submit} disabled={!name.trim() || !categoryId} className="px-4 py-2 min-h-11 md:min-h-0 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40">Crear</button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default CreateNodeDialog;
