import { useNotes } from "@/contexts/NotesContext";
import { Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NotesList = () => {
  const {
    filteredNotes,
    selectedNoteId,
    setSelectedNoteId,
    addNote,
    deleteNote,
    selectedCategoryId,
    categories,
    notes,
  } = useNotes();

  const getCategoryIcon = (catId: string) =>
    categories.find((c) => c.id === catId)?.icon || "📝";

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
  };

  // Group by root notes first, then children beneath
  const rootNotes = filteredNotes.filter((n) => !n.parentNoteId || !filteredNotes.some((fn) => fn.id === n.parentNoteId));
  const childNotesOf = (parentId: string) => filteredNotes.filter((n) => n.parentNoteId === parentId);

  const renderNote = (note: typeof filteredNotes[0], depth = 0) => {
    const children = childNotesOf(note.id);
    return (
      <div key={note.id}>
        <motion.button
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          onClick={() => setSelectedNoteId(note.id)}
          className={`w-full text-left p-3 rounded-lg transition-all group ${
            selectedNoteId === note.id
              ? "bg-primary/10 border border-primary/20"
              : "hover:bg-muted/50 border border-transparent"
          }`}
          style={{ paddingLeft: `${12 + depth * 16}px` }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1">
                {depth > 0 && <span className="text-[10px] text-muted-foreground">↳</span>}
                <span className="text-xs">{getCategoryIcon(note.categoryId)}</span>
                <h3 className="text-sm font-medium truncate text-card-foreground font-body">
                  {note.title}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2 font-body">
                {note.content || "Sin contenido..."}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] text-muted-foreground">{formatDate(note.updatedAt)}</span>
                {note.checklist.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    ✓ {note.checklist.filter((i) => i.completed).length}/{note.checklist.length}
                  </span>
                )}
                {note.linkedNoteIds.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">🔗 {note.linkedNoteIds.length}</span>
                )}
              </div>
            </div>
            <Trash2
              size={14}
              className="opacity-0 group-hover:opacity-50 hover:!opacity-100 text-destructive mt-0.5 shrink-0 transition-opacity"
              onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
            />
          </div>
        </motion.button>
        {children.map((child) => renderNote(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="w-72 h-full border-r border-border bg-card flex flex-col">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-card-foreground">
          {selectedCategoryId
            ? categories.find((c) => c.id === selectedCategoryId)?.name || "Notas"
            : "Todas las notas"}
        </h2>
        <button
          onClick={() => addNote(selectedCategoryId || categories[0]?.id || "personal")}
          className="p-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-0.5">
        <AnimatePresence>
          {filteredNotes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <p className="text-3xl mb-3">📝</p>
              <p>No hay notas aún</p>
              <p className="text-xs mt-1">Crea una nueva nota para empezar</p>
            </div>
          ) : (
            rootNotes.map((note) => renderNote(note))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default NotesList;
