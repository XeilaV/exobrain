import { useState } from "react";
import { useNotes } from "@/contexts/NotesContext";
import { Plus, Trash2, FolderOpen, ChevronRight, ChevronDown, Network } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Category } from "@/types/notes";

const CategoryItem = ({
  category,
  depth = 0,
}: {
  category: Category;
  depth?: number;
}) => {
  const {
    categories,
    selectedCategoryId,
    setSelectedCategoryId,
    setSelectedNoteId,
    deleteCategory,
    notes,
    getSubcategories,
    addCategory,
  } = useNotes();
  const [expanded, setExpanded] = useState(true);
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [subName, setSubName] = useState("");
  const [subIcon, setSubIcon] = useState("📌");

  const subcats = getSubcategories(category.id);
  const hasChildren = subcats.length > 0;

  // Count notes in this category and all subcategories
  const countNotes = (catId: string): number => {
    let count = notes.filter((n) => n.categoryId === catId).length;
    categories.filter((c) => c.parentId === catId).forEach((c) => { count += countNotes(c.id); });
    return count;
  };

  const handleAddSub = () => {
    if (subName.trim()) {
      addCategory(subName.trim(), subIcon, category.id);
      setSubName("");
      setSubIcon("📌");
      setIsAddingSub(false);
    }
  };

  return (
    <div>
      <div className="flex items-center group">
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            className="p-0.5 rounded hover:bg-sidebar-accent/60 shrink-0 text-muted-foreground"
          >
            {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        ) : (
          <span className="w-[18px] shrink-0" />
        )}
        <button
          onClick={() => { setSelectedCategoryId(category.id); setSelectedNoteId(null); }}
          className={`flex-1 flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-body transition-all truncate ${
            selectedCategoryId === category.id
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
          }`}
          style={{ paddingLeft: `${depth * 8 + 4}px` }}
        >
          <span className="text-sm shrink-0">{category.icon}</span>
          <span className="truncate">{category.name}</span>
          <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">{countNotes(category.id)}</span>
        </button>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pr-1">
          <button
            onClick={(e) => { e.stopPropagation(); setIsAddingSub(true); }}
            className="p-0.5 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground"
            title="Añadir subtema"
          >
            <Plus size={12} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); deleteCategory(category.id); }}
            className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {isAddingSub && (
        <div className="ml-6 mt-1 mb-1 space-y-1.5">
          <div className="flex gap-1.5">
            <input
              value={subIcon}
              onChange={(e) => setSubIcon(e.target.value)}
              className="w-8 text-center bg-sidebar-accent rounded text-xs p-1"
              maxLength={2}
            />
            <input
              value={subName}
              onChange={(e) => setSubName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddSub()}
              placeholder="Subtema..."
              className="flex-1 bg-sidebar-accent rounded text-xs px-2 py-1 text-sidebar-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-sidebar-ring"
              autoFocus
            />
          </div>
          <div className="flex gap-1.5">
            <button onClick={handleAddSub} className="flex-1 bg-primary text-primary-foreground rounded text-[10px] py-1 font-medium hover:opacity-90">Añadir</button>
            <button onClick={() => setIsAddingSub(false)} className="flex-1 bg-sidebar-accent text-sidebar-foreground rounded text-[10px] py-1 hover:opacity-80">Cancelar</button>
          </div>
        </div>
      )}

      <AnimatePresence>
        {expanded && subcats.map((sub) => (
          <motion.div
            key={sub.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="ml-2"
          >
            <CategoryItem category={sub} depth={depth + 1} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const AppSidebar = () => {
  const { selectedCategoryId, setSelectedCategoryId, notes, setSelectedNoteId, getRootCategories, addCategory, activeView, setActiveView } = useNotes();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📌");

  const rootCategories = getRootCategories();

  const handleAdd = () => {
    if (newName.trim()) {
      addCategory(newName.trim(), newIcon, null);
      setNewName("");
      setNewIcon("📌");
      setIsAdding(false);
    }
  };

  return (
    <aside className="w-64 h-full bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-5 border-b border-sidebar-border">
        <h1 className="font-display text-xl font-bold text-sidebar-foreground tracking-tight">
          📒 Mis Notas
        </h1>
        <p className="text-xs text-muted-foreground mt-1 font-body">Organiza tus ideas</p>
      </div>

      {/* View toggle */}
      <div className="px-3 pt-3 flex gap-1">
        <button
          onClick={() => setActiveView("notes")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-body transition-all ${
            activeView === "notes"
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-muted-foreground hover:bg-sidebar-accent/50"
          }`}
        >
          <FolderOpen size={13} />
          Notas
        </button>
        <button
          onClick={() => setActiveView("graph")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-body transition-all ${
            activeView === "graph"
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "text-muted-foreground hover:bg-sidebar-accent/50"
          }`}
        >
          <Network size={13} />
          Mapa
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto scrollbar-thin">
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
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">{notes.length}</span>
        </button>

        {rootCategories.map((cat) => (
          <CategoryItem key={cat.id} category={cat} />
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        {isAdding ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input value={newIcon} onChange={(e) => setNewIcon(e.target.value)} className="w-10 text-center bg-sidebar-accent rounded-md text-sm p-1.5" maxLength={2} />
              <input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAdd()} placeholder="Nombre..." className="flex-1 bg-sidebar-accent rounded-md text-sm px-3 py-1.5 text-sidebar-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-sidebar-ring" autoFocus />
            </div>
            <div className="flex gap-2">
              <button onClick={handleAdd} className="flex-1 bg-primary text-primary-foreground rounded-md text-xs py-1.5 font-medium hover:opacity-90 transition-opacity">Añadir</button>
              <button onClick={() => setIsAdding(false)} className="flex-1 bg-sidebar-accent text-sidebar-foreground rounded-md text-xs py-1.5 hover:opacity-80 transition-opacity">Cancelar</button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
          >
            <Plus size={16} />
            Nuevo tema
          </button>
        )}
      </div>
    </aside>
  );
};

export default AppSidebar;
