import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Note, Category, ChecklistItem } from "@/types/notes";

const DEFAULT_CATEGORIES: Category[] = [
  { id: "personal", name: "Personal", icon: "📝", color: "30 80% 52%" },
  { id: "work", name: "Trabajo", icon: "💼", color: "220 70% 55%" },
  { id: "ideas", name: "Ideas", icon: "💡", color: "45 90% 55%" },
  { id: "projects", name: "Proyectos", icon: "🚀", color: "160 60% 45%" },
];

interface NotesContextType {
  notes: Note[];
  categories: Category[];
  selectedCategoryId: string | null;
  selectedNoteId: string | null;
  setSelectedCategoryId: (id: string | null) => void;
  setSelectedNoteId: (id: string | null) => void;
  addNote: (categoryId: string) => Note;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  addCategory: (name: string, icon: string) => void;
  deleteCategory: (id: string) => void;
  addChecklistItem: (noteId: string, text: string) => void;
  toggleChecklistItem: (noteId: string, itemId: string) => void;
  deleteChecklistItem: (noteId: string, itemId: string) => void;
  filteredNotes: Note[];
  selectedNote: Note | undefined;
  createNoteFromChat: (title: string, content: string, categoryId?: string) => Note;
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

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notes, setNotes] = useState<Note[]>(() => loadFromStorage("notes", []));
  const [categories, setCategories] = useState<Category[]>(() =>
    loadFromStorage("categories", DEFAULT_CATEGORIES)
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("notes", JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem("categories", JSON.stringify(categories));
  }, [categories]);

  const addNote = useCallback((categoryId: string) => {
    const note: Note = {
      id: crypto.randomUUID(),
      title: "Nueva nota",
      content: "",
      categoryId,
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
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setSelectedNoteId((prev) => (prev === id ? null : prev));
  }, []);

  const addCategory = useCallback((name: string, icon: string) => {
    setCategories((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, icon, color: "30 50% 50%" },
    ]);
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setNotes((prev) => prev.filter((n) => n.categoryId !== id));
  }, []);

  const addChecklistItem = useCallback((noteId: string, text: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? {
              ...n,
              checklist: [...n.checklist, { id: crypto.randomUUID(), text, completed: false }],
              updatedAt: new Date().toISOString(),
            }
          : n
      )
    );
  }, []);

  const toggleChecklistItem = useCallback((noteId: string, itemId: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? {
              ...n,
              checklist: n.checklist.map((i) =>
                i.id === itemId ? { ...i, completed: !i.completed } : i
              ),
              updatedAt: new Date().toISOString(),
            }
          : n
      )
    );
  }, []);

  const deleteChecklistItem = useCallback((noteId: string, itemId: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === noteId
          ? {
              ...n,
              checklist: n.checklist.filter((i) => i.id !== itemId),
              updatedAt: new Date().toISOString(),
            }
          : n
      )
    );
  }, []);

  const createNoteFromChat = useCallback((title: string, content: string, categoryId?: string) => {
    const catId = categoryId || categories[0]?.id || "personal";
    const note: Note = {
      id: crypto.randomUUID(),
      title,
      content,
      categoryId: catId,
      checklist: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setNotes((prev) => [note, ...prev]);
    setSelectedNoteId(note.id);
    setSelectedCategoryId(catId);
    return note;
  }, [categories]);

  const filteredNotes = selectedCategoryId
    ? notes.filter((n) => n.categoryId === selectedCategoryId)
    : notes;

  const selectedNote = notes.find((n) => n.id === selectedNoteId);

  return (
    <NotesContext.Provider
      value={{
        notes,
        categories,
        selectedCategoryId,
        selectedNoteId,
        setSelectedCategoryId,
        setSelectedNoteId,
        addNote,
        updateNote,
        deleteNote,
        addCategory,
        deleteCategory,
        addChecklistItem,
        toggleChecklistItem,
        deleteChecklistItem,
        filteredNotes,
        selectedNote,
        createNoteFromChat,
      }}
    >
      {children}
    </NotesContext.Provider>
  );
};
