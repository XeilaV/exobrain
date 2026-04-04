import { useState } from "react";
import { useNotes } from "@/contexts/NotesContext";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Trash2, FolderOpen, Pencil, Check, X, LogOut } from "lucide-react";
import { Category } from "@/types/notes";

const CategoryRow = ({ category }: { category: Category }) => {
  const {
    selectedCategoryId,
    setSelectedCategoryId,
    setSelectedNoteId,
    deleteCategory,
    updateCategory,
    notes,
  } = useNotes();

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category.name);
  const [editIcon, setEditIcon] = useState(category.icon);

  const noteCount = notes.filter((n) => n.categoryId === category.id).length;

  const saveEdit = () => {
    const name = editName.trim();
    if (name) {
      updateCategory(category.id, { name, icon: editIcon });
    } else {
      setEditName(category.name);
      setEditIcon(category.icon);
    }
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1.5">
        <input
          value={editIcon}
          onChange={(e) => setEditIcon(e.target.value)}
          className="w-8 text-center bg-sidebar-accent rounded text-xs p-1"
          maxLength={2}
        />
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit();
            if (e.key === "Escape") { setEditName(category.name); setEditIcon(category.icon); setIsEditing(false); }
          }}
          className="flex-1 bg-sidebar-accent rounded text-xs px-2 py-1 text-sidebar-foreground outline-none focus:ring-1 focus:ring-sidebar-ring"
          autoFocus
        />
        <button onClick={saveEdit} className="p-0.5 rounded hover:bg-sidebar-accent text-primary"><Check size={12} /></button>
        <button onClick={() => { setEditName(category.name); setEditIcon(category.icon); setIsEditing(false); }} className="p-0.5 rounded hover:bg-sidebar-accent text-muted-foreground"><X size={12} /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center group">
      <button
        data-category-select
        onClick={() => { setSelectedCategoryId(category.id); setSelectedNoteId(null); }}
        className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-body transition-all truncate ${
          selectedCategoryId === category.id
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50"
        }`}
      >
        <span className="text-sm shrink-0">{category.icon}</span>
        <span className="truncate">{category.name}</span>
        <span className="ml-auto text-[10px] text-muted-foreground tabular-nums">{noteCount}</span>
      </button>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pr-1">
        <button
          onClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditName(category.name); setEditIcon(category.icon); }}
          className="p-0.5 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-sidebar-foreground"
          title="Editar"
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); deleteCategory(category.id); }}
          className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

const AppSidebar = () => {
  const { selectedCategoryId, setSelectedCategoryId, notes, setSelectedNoteId, categories, addCategory } = useNotes();
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📌");

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

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto scrollbar-thin">
        <button
          data-all-notes
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

        {categories.map((cat) => (
          <CategoryRow key={cat.id} category={cat} />
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
              <button onClick={() => { setIsAdding(false); setNewName(""); setNewIcon("📌"); }} className="flex-1 bg-sidebar-accent text-sidebar-foreground rounded-md text-xs py-1.5 hover:opacity-80 transition-opacity">Cancelar</button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsAdding(true); }}
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
