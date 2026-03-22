import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { Note, Category, ChecklistItem } from "@/types/notes";

const DEFAULT_CATEGORIES: Category[] = [
  { id: "personal", name: "Personal", icon: "📝", color: "30 80% 52%", parentId: null },
  { id: "work", name: "Trabajo", icon: "💼", color: "220 70% 55%", parentId: null },
  { id: "ideas", name: "Ideas", icon: "💡", color: "45 90% 55%", parentId: null },
];

interface NotesContextType {
  notes: Note[];
  categories: Category[];
  selectedCategoryId: string | null;
  selectedNoteId: string | null;
  activeView: "notes" | "graph";
  setActiveView: (v: "notes" | "graph") => void;
  setSelectedCategoryId: (id: string | null) => void;
  setSelectedNoteId: (id: string | null) => void;
  addNote: (categoryId: string, parentNoteId?: string | null) => Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  addCategory: (name: string, icon: string, parentId?: string | null) => void;
  updateCategory: (id: string, updates: Partial<Pick<Category, "name" | "icon">>) => void;
  deleteCategory: (id: string) => void;
  addChecklistItem: (noteId: string, text: string) => void;
  toggleChecklistItem: (noteId: string, itemId: string) => void;
  deleteChecklistItem: (noteId: string, itemId: string) => void;
  linkNotes: (noteIdA: string, noteIdB: string) => void;
  unlinkNotes: (noteIdA: string, noteIdB: string) => void;
  filteredNotes: Note[];
  selectedNote: Note | undefined;
  createNoteFromChat: (title: string, content: string, categoryId?: string) => Note;
  getChildNotes: (noteId: string) => Note[];
  getLinkedNotes: (noteId: string) => Note[];
  getParentNote: (noteId: string) => Note | undefined;
  getSubcategories: (categoryId: string) => Category[];
  getRootCategories: () => Category[];
  getCategoryPath: (categoryId: string) => Category[];
}

const NotesContext = createContext<NotesContextType | null>(null);

export const useNotes = () => {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used within NotesProvider");
  return ctx;
};

const loadFromStorage = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
};

const migrateNotes = (notes: Note[]): Note[] =>
  notes.map((n) => ({
    ...n,
    parentNoteId: n.parentNoteId ?? null,
    linkedNoteIds: n.linkedNoteIds ?? [],
  }));

// Remove subcategories on load - flatten to root only
const migrateCategories = (cats: Category[]): Category[] =>
  cats.map((c) => ({ ...c, parentId: null }));

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<Note[]>(() => migrateNotes(loadFromStorage("notes", [])));
  const [categories, setCategories] = useState<Category[]>(() =>
    migrateCategories(loadFromStorage("categories", DEFAULT_CATEGORIES))
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"notes" | "graph">("notes");

  useEffect(() => { localStorage.setItem("notes", JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem("categories", JSON.stringify(categories)); }, [categories]);

  const addNote = useCallback((categoryId: string, parentNoteId?: string | null) => {
    const note: Note = {
      id: crypto.randomUUID(),
      title: "Nueva nota",
      content: "",
      // Child notes inherit parent's category
      categoryId: parentNoteId
        ? (() => {
            const stored = localStorage.getItem("notes");
            const allNotes: Note[] = stored ? JSON.parse(stored) : [];
            const parent = allNotes.find((n) => n.id === parentNoteId);
            return parent?.categoryId || categoryId;
          })()
        : categoryId,
      parentNoteId: parentNoteId ?? null,
      linkedNoteIds: [],
      checklist: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => [note, ...prev]);
    setSelectedNoteId(note.id);
    return note;
  }, []);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n))
    );
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((prev) => {
      return prev
        .filter((n) => n.id !== id)
        .map((n) => ({
          ...n,
          parentNoteId: n.parentNoteId === id ? null : n.parentNoteId,
          linkedNoteIds: n.linkedNoteIds.filter((lid) => lid !== id),
        }));
    });
    setSelectedNoteId((prev) => (prev === id ? null : prev));
  }, []);

  const addCategory = useCallback((name: string, icon: string, _parentId?: string | null) => {
    setCategories((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, icon, color: "30 50% 50%", parentId: null },
    ]);
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<Pick<Category, "name" | "icon">>) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setNotes((prev) => prev.filter((n) => n.categoryId !== id));
  }, []);

  const addChecklistItem = useCallback((noteId: string, text: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? { ...n, checklist: [...n.checklist, { id: crypto.randomUUID(), text, completed: false }], updatedAt: new Date().toISOString() }
          : n
      )
    );
  }, []);

  const toggleChecklistItem = useCallback((noteId: string, itemId: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? { ...n, checklist: n.checklist.map((i) => i.id === itemId ? { ...i, completed: !i.completed } : i), updatedAt: new Date().toISOString() }
          : n
      )
    );
  }, []);

  const deleteChecklistItem = useCallback((noteId: string, itemId: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? { ...n, checklist: n.checklist.filter((i) => i.id !== itemId), updatedAt: new Date().toISOString() }
          : n
      )
    );
  }, []);

  const linkNotes = useCallback((noteIdA: string, noteIdB: string) => {
    if (noteIdA === noteIdB) return;
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === noteIdA && !n.linkedNoteIds.includes(noteIdB)) {
          return { ...n, linkedNoteIds: [...n.linkedNoteIds, noteIdB], updatedAt: new Date().toISOString() };
        }
        if (n.id === noteIdB && !n.linkedNoteIds.includes(noteIdA)) {
          return { ...n, linkedNoteIds: [...n.linkedNoteIds, noteIdA], updatedAt: new Date().toISOString() };
        }
        return n;
      })
    );
  }, []);

  const unlinkNotes = useCallback((noteIdA: string, noteIdB: string) => {
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === noteIdA) return { ...n, linkedNoteIds: n.linkedNoteIds.filter((id) => id !== noteIdB) };
        if (n.id === noteIdB) return { ...n, linkedNoteIds: n.linkedNoteIds.filter((id) => id !== noteIdA) };
        return n;
      })
    );
  }, []);

  const createNoteFromChat = useCallback((title: string, content: string, categoryId?: string) => {
    const catId = categoryId || categories[0]?.id || "personal";
    const note: Note = {
      id: crypto.randomUUID(),
      title,
      content,
      categoryId: catId,
      parentNoteId: null,
      linkedNoteIds: [],
      checklist: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => [note, ...prev]);
    setSelectedNoteId(note.id);
    setSelectedCategoryId(catId);
    return note;
  }, [categories]);

  const getChildNotes = useCallback((noteId: string) => notes.filter((n) => n.parentNoteId === noteId), [notes]);
  const getLinkedNotes = useCallback((noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return [];
    return notes.filter((n) => note.linkedNoteIds.includes(n.id));
  }, [notes]);
  const getParentNote = useCallback((noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note?.parentNoteId) return undefined;
    return notes.find((n) => n.id === note.parentNoteId);
  }, [notes]);

  // No subcategories - return empty
  const getSubcategories = useCallback((_categoryId: string) => [] as Category[], []);
  const getRootCategories = useCallback(() => categories, [categories]);
  const getCategoryPath = useCallback((categoryId: string): Category[] => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? [cat] : [];
  }, [categories]);

  const filteredNotes = selectedCategoryId
    ? notes.filter((n) => n.categoryId === selectedCategoryId)
    : notes;

  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  return (
    <NotesContext.Provider
      value={{
        notes, categories, selectedCategoryId, selectedNoteId, activeView, setActiveView,
        setSelectedCategoryId, setSelectedNoteId,
        addNote, updateNote, deleteNote, addCategory, updateCategory, deleteCategory,
        addChecklistItem, toggleChecklistItem, deleteChecklistItem,
        linkNotes, unlinkNotes,
        filteredNotes, selectedNote, createNoteFromChat,
        getChildNotes, getLinkedNotes, getParentNote,
        getSubcategories, getRootCategories, getCategoryPath,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
};
