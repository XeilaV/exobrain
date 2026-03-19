import { useNotes } from "@/contexts/NotesContext";
import { useState } from "react";
import { Plus, Trash2, Check, Square, CheckSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NoteEditor = () => {
  const {
    selectedNote,
    updateNote,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    categories,
  } = useNotes();
  const [newItemText, setNewItemText] = useState("");

  if (!selectedNote) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <p className="text-5xl mb-4">✍️</p>
          <p className="font-display text-lg">Selecciona o crea una nota</p>
          <p className="text-sm mt-1">para empezar a escribir</p>
        </div>
      </div>
    );
  }

  const handleAddItem = () => {
    if (newItemText.trim()) {
      addChecklistItem(selectedNote.id, newItemText.trim());
      setNewItemText("");
    }
  };

  const completedCount = selectedNote.checklist.filter((i) => i.completed).length;

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      <div className="p-6 border-b border-border">
        <input
          value={selectedNote.title}
          onChange={(e) => updateNote(selectedNote.id, { title: e.target.value })}
          className="w-full font-display text-2xl font-bold bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
          placeholder="Título de la nota..."
        />
        <div className="flex items-center gap-3 mt-2">
          <select
            value={selectedNote.categoryId}
            onChange={(e) => updateNote(selectedNote.id, { categoryId: e.target.value })}
            className="text-xs bg-muted text-muted-foreground rounded-md px-2 py-1 outline-none font-body"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>
          <span className="text-xs text-muted-foreground">
            {new Date(selectedNote.updatedAt).toLocaleDateString("es-ES", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
        <textarea
          value={selectedNote.content}
          onChange={(e) => updateNote(selectedNote.id, { content: e.target.value })}
          className="w-full min-h-[200px] bg-transparent outline-none text-foreground font-body text-sm leading-relaxed resize-none placeholder:text-muted-foreground"
          placeholder="Escribe tu nota aquí..."
        />

        {/* Checklist */}
        <div className="border-t border-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
              <CheckSquare size={16} className="text-primary" />
              Checklist
              {selectedNote.checklist.length > 0 && (
                <span className="text-xs text-muted-foreground font-body font-normal">
                  {completedCount}/{selectedNote.checklist.length}
                </span>
              )}
            </h3>
          </div>

          <div className="space-y-1.5">
            <AnimatePresence>
              {selectedNote.checklist.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-2.5 group"
                >
                  <button
                    onClick={() => toggleChecklistItem(selectedNote.id, item.id)}
                    className="text-primary hover:opacity-80 transition-opacity shrink-0"
                  >
                    {item.completed ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                  <span
                    className={`flex-1 text-sm font-body ${
                      item.completed
                        ? "line-through text-muted-foreground"
                        : "text-foreground"
                    }`}
                  >
                    {item.text}
                  </span>
                  <Trash2
                    size={14}
                    className="opacity-0 group-hover:opacity-50 hover:!opacity-100 text-destructive cursor-pointer transition-opacity"
                    onClick={() => deleteChecklistItem(selectedNote.id, item.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <input
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddItem()}
              placeholder="Añadir tarea..."
              className="flex-1 text-sm bg-muted rounded-md px-3 py-2 outline-none text-foreground placeholder:text-muted-foreground font-body focus:ring-1 focus:ring-ring"
            />
            <button
              onClick={handleAddItem}
              className="p-2 rounded-md bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;
