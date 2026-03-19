import { useState } from "react";
import { useNotes } from "@/contexts/NotesContext";
import { Plus, Trash2, FolderOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const AppSidebar = () => {
  const { categories, selectedCategoryId, setSelectedCategoryId, addCategory, deleteCategory, notes, setSelectedNoteId } = useNotes();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📌");

  const handleAdd = () => {
    if (newName.trim()) {
      addCategory(newName.trim(), newIcon);
      setNewName("");
      setNewIcon("📌");
      setIsAdding(false);
    }
  };

  const countNotes = (catId: string) => notes.filter((n) => n.categoryId === catId).length;

  return (
    <aside className="w-64 h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-5 border-b border-sidebar-border">
        <h1 className="font-display text-xl font-bold text-sidebar-foreground tracking-tight">
          📒 Mis Notas
        </h1>
        <p className="text-xs text-muted-foreground mt-1 font-body">Organiza tus ideas</p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        <button
          onClick={() => { setSelectedCategoryId(null); setSelectedNoteId(null); }}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-all ${
            selectedCategoryId === null
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          }`}
        >
          <FolderOpen size={16} />
          <span>Todas</span>
          <span className="ml-auto text-xs text-muted-foreground">{notes.length}</span>
        </button>

        <AnimatePresence>
          {categories.map((cat) => (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              onClick={() => { setSelectedCategoryId(cat.id); setSelectedNoteId(null); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-all group ${
                selectedCategoryId === cat.id
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <span>{cat.icon}</span>
              <span className="truncate">{cat.name}</span>
              <span className="ml-auto text-xs text-muted-foreground">{countNotes(cat.id)}</span>
              <Trash2
                size={14}
                className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-destructive shrink-0"
                onClick={(e) => { e.stopPropagation(); deleteCategory(cat.id); }}
              />
            </motion.button>
          ))}
        </AnimatePresence>
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        {isAdding ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                value={newIcon}
                onChange={(e) => setNewIcon(e.target.value)}
                className="w-10 text-center bg-sidebar-accent rounded-md text-sm p-1.5"
                maxLength={2}
              />
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="Nombre..."
                className="flex-1 bg-sidebar-accent rounded-md text-sm px-3 py-1.5 text-sidebar-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-sidebar-ring"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} className="flex-1 bg-primary text-primary-foreground rounded-md text-xs py-1.5 font-medium hover:opacity-90 transition-opacity">
                Añadir
              </button>
              <button onClick={() => setIsAdding(false)} className="flex-1 bg-sidebar-accent text-sidebar-foreground rounded-md text-xs py-1.5 hover:opacity-80 transition-opacity">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
          >
            <Plus size={16} />
            Nueva categoría
          </button>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
