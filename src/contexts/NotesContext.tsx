import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { Note, Category, ChecklistItem, NoteType } from "@/types/notes";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface NotesContextType {
  notes: Note[];
  categories: Category[];
  selectedCategoryId: string | null;
  selectedNoteId: string | null;
  activeView: "notes" | "graph";
  loading: boolean;
  setActiveView: (v: "notes" | "graph") => void;
  setSelectedCategoryId: (id: string | null) => void;
  setSelectedNoteId: (id: string | null) => void;
  addNote: (categoryId: string, parentNoteId?: string | null, noteType?: NoteType) => Promise<Note | null>;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  addCategory: (name: string, icon: string, color?: string, parentId?: string | null) => void;
  updateCategory: (id: string, updates: Partial<Pick<Category, "name" | "icon" | "color">>) => void;
  deleteCategory: (id: string) => void;
  addChecklistItem: (noteId: string, text: string) => void;
  toggleChecklistItem: (noteId: string, itemId: string) => void;
  deleteChecklistItem: (noteId: string, itemId: string) => void;
  toggleNoteCollapsed: (noteId: string) => void;
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
  brainName: string;
  setBrainName: (name: string) => void;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
}

const NotesContext = createContext<NotesContextType | null>(null);

export const useNotes = () => {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used within NotesProvider");
  return ctx;
};

// Map DB row to app Note
const dbToNote = (row: any): Note => ({
  id: row.id,
  title: row.title,
  content: row.content,
  categoryId: row.category_id,
  parentNoteId: row.parent_note_id ?? null,
  linkedNoteIds: row.linked_note_ids ?? [],
  checklist: (row.checklist as ChecklistItem[]) ?? [],
  noteType: (row.note_type as NoteType) ?? "text",
  isCollapsed: row.is_collapsed ?? true,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const dbToCategory = (row: any): Category => ({
  id: row.id,
  name: row.name,
  icon: row.icon,
  color: row.color,
  parentId: null,
});

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"notes" | "graph">("graph");
  const [loading, setLoading] = useState(true);
  const [brainName, setBrainNameState] = useState<string>("ExoBrain");
  const [onboarded, setOnboardedState] = useState<boolean>(true);

  // Load data from DB
  useEffect(() => {
    if (!user) { setNotes([]); setCategories([]); setLoading(false); return; }
    setLoading(true);
    const load = async () => {
      const [catsRes, notesRes, profileRes] = await Promise.all([
        supabase.from("categories").select("*").order("created_at"),
        supabase.from("notes").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("brain_name, onboarded").eq("id", user.id).maybeSingle(),
      ]);
      if (catsRes.data) setCategories(catsRes.data.map(dbToCategory));
      if (notesRes.data) setNotes(notesRes.data.map(dbToNote));
      if (profileRes.data) {
        setBrainNameState(profileRes.data.brain_name || "ExoBrain");
        setOnboardedState(profileRes.data.onboarded ?? false);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const setBrainName = useCallback(async (name: string) => {
    if (!user) return;
    setBrainNameState(name);
    await supabase.from("profiles").update({ brain_name: name }).eq("id", user.id);
  }, [user]);

  const setOnboarded = useCallback(async (v: boolean) => {
    if (!user) return;
    setOnboardedState(v);
    await supabase.from("profiles").update({ onboarded: v }).eq("id", user.id);
  }, [user]);


  // Debounced save for note updates
  const updateTimers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const addNote = useCallback(async (categoryId: string, parentNoteId?: string | null, noteType: NoteType = "text") => {
    if (!user) return null;
    // Child notes inherit parent's category
    let catId = categoryId;
    if (parentNoteId) {
      const parent = notes.find(n => n.id === parentNoteId);
      if (parent) catId = parent.categoryId;
    }
    const { data, error } = await supabase.from("notes").insert({
      user_id: user.id,
      category_id: catId,
      parent_note_id: parentNoteId ?? null,
      title: noteType === "checklist" ? "Nueva lista" : "Nueva nota",
      content: "",
      checklist: [],
      linked_note_ids: [],
      note_type: noteType,
    }).select().single();
    if (error) { toast.error("Error al crear nota"); return null; }
    const note = dbToNote(data);
    setNotes(prev => [note, ...prev]);
    setSelectedNoteId(note.id);
    return note;
  }, [user, notes]);

  const updateNote = useCallback((id: string, updates: Partial<Note>) => {
    // Optimistic update locally
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n));
    // Debounce DB save
    clearTimeout(updateTimers.current[id]);
    updateTimers.current[id] = setTimeout(async () => {
      const dbUpdates: any = { updated_at: new Date().toISOString() };
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.content !== undefined) dbUpdates.content = updates.content;
      if (updates.categoryId !== undefined) dbUpdates.category_id = updates.categoryId;
      if (updates.parentNoteId !== undefined) dbUpdates.parent_note_id = updates.parentNoteId;
      if (updates.checklist !== undefined) dbUpdates.checklist = updates.checklist;
      if (updates.linkedNoteIds !== undefined) dbUpdates.linked_note_ids = updates.linkedNoteIds;
      await supabase.from("notes").update(dbUpdates).eq("id", id);
    }, 500);
  }, []);

  const deleteNote = useCallback(async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id).map(n => ({
      ...n,
      parentNoteId: n.parentNoteId === id ? null : n.parentNoteId,
      linkedNoteIds: n.linkedNoteIds.filter(lid => lid !== id),
    })));
    setSelectedNoteId(prev => prev === id ? null : prev);
    // Also update notes that referenced this one
    const affected = notes.filter(n => n.linkedNoteIds.includes(id));
    for (const n of affected) {
      await supabase.from("notes").update({ linked_note_ids: n.linkedNoteIds.filter(lid => lid !== id) }).eq("id", n.id);
    }
    // Remove orphan parent refs
    await supabase.from("notes").update({ parent_note_id: null }).eq("parent_note_id", id);
    await supabase.from("notes").delete().eq("id", id);
  }, [notes]);

  const addCategory = useCallback(async (name: string, icon: string, _parentId?: string | null) => {
    if (!user) return;
    const { data, error } = await supabase.from("categories").insert({
      user_id: user.id, name, icon, color: "30 50% 50%",
    }).select().single();
    if (error) { toast.error("Error al crear categoría"); return; }
    setCategories(prev => [...prev, dbToCategory(data)]);
  }, [user]);

  const updateCategory = useCallback(async (id: string, updates: Partial<Pick<Category, "name" | "icon">>) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    await supabase.from("categories").update(updates).eq("id", id);
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    setNotes(prev => prev.filter(n => n.categoryId !== id));
    await supabase.from("categories").delete().eq("id", id);
  }, []);

  const addChecklistItem = useCallback((noteId: string, text: string) => {
    setNotes(prev => prev.map(n => {
      if (n.id !== noteId) return n;
      const newChecklist = [...n.checklist, { id: crypto.randomUUID(), text, completed: false }];
      // Save to DB
      supabase.from("notes").update({ checklist: newChecklist as any, updated_at: new Date().toISOString() }).eq("id", noteId);
      return { ...n, checklist: newChecklist, updatedAt: new Date().toISOString() };
    }));
  }, []);

  const toggleChecklistItem = useCallback((noteId: string, itemId: string) => {
    setNotes(prev => prev.map(n => {
      if (n.id !== noteId) return n;
      const newChecklist = n.checklist.map(i => i.id === itemId ? { ...i, completed: !i.completed } : i);
      supabase.from("notes").update({ checklist: newChecklist as any, updated_at: new Date().toISOString() }).eq("id", noteId);
      return { ...n, checklist: newChecklist, updatedAt: new Date().toISOString() };
    }));
  }, []);

  const deleteChecklistItem = useCallback((noteId: string, itemId: string) => {
    setNotes(prev => prev.map(n => {
      if (n.id !== noteId) return n;
      const newChecklist = n.checklist.filter(i => i.id !== itemId);
      supabase.from("notes").update({ checklist: newChecklist as any, updated_at: new Date().toISOString() }).eq("id", noteId);
      return { ...n, checklist: newChecklist, updatedAt: new Date().toISOString() };
    }));
  }, []);

  const linkNotes = useCallback((noteIdA: string, noteIdB: string) => {
    if (noteIdA === noteIdB) return;
    setNotes(prev => {
      const updated = prev.map(n => {
        if (n.id === noteIdA && !n.linkedNoteIds.includes(noteIdB)) {
          const newLinks = [...n.linkedNoteIds, noteIdB];
          supabase.from("notes").update({ linked_note_ids: newLinks, updated_at: new Date().toISOString() }).eq("id", noteIdA);
          return { ...n, linkedNoteIds: newLinks, updatedAt: new Date().toISOString() };
        }
        if (n.id === noteIdB && !n.linkedNoteIds.includes(noteIdA)) {
          const newLinks = [...n.linkedNoteIds, noteIdA];
          supabase.from("notes").update({ linked_note_ids: newLinks, updated_at: new Date().toISOString() }).eq("id", noteIdB);
          return { ...n, linkedNoteIds: newLinks, updatedAt: new Date().toISOString() };
        }
        return n;
      });
      return updated;
    });
  }, []);

  const unlinkNotes = useCallback((noteIdA: string, noteIdB: string) => {
    setNotes(prev => prev.map(n => {
      if (n.id === noteIdA) {
        const newLinks = n.linkedNoteIds.filter(id => id !== noteIdB);
        supabase.from("notes").update({ linked_note_ids: newLinks }).eq("id", noteIdA);
        return { ...n, linkedNoteIds: newLinks };
      }
      if (n.id === noteIdB) {
        const newLinks = n.linkedNoteIds.filter(id => id !== noteIdA);
        supabase.from("notes").update({ linked_note_ids: newLinks }).eq("id", noteIdB);
        return { ...n, linkedNoteIds: newLinks };
      }
      return n;
    }));
  }, []);

  const createNoteFromChat = useCallback((title: string, content: string, categoryId?: string) => {
    // Kept for interface compatibility but chat is conversational-only
    const catId = categoryId || categories[0]?.id || "";
    const note: Note = {
      id: crypto.randomUUID(), title, content, categoryId: catId,
      parentNoteId: null, linkedNoteIds: [], checklist: [],
      noteType: "text",
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    return note;
  }, [categories]);

  const getChildNotes = useCallback((noteId: string) => notes.filter(n => n.parentNoteId === noteId), [notes]);
  const getLinkedNotes = useCallback((noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return [];
    return notes.filter(n => note.linkedNoteIds.includes(n.id));
  }, [notes]);
  const getParentNote = useCallback((noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note?.parentNoteId) return undefined;
    return notes.find(n => n.id === note.parentNoteId);
  }, [notes]);

  const getSubcategories = useCallback((_categoryId: string) => [] as Category[], []);
  const getRootCategories = useCallback(() => categories, [categories]);
  const getCategoryPath = useCallback((categoryId: string): Category[] => {
    const cat = categories.find(c => c.id === categoryId);
    return cat ? [cat] : [];
  }, [categories]);

  const filteredNotes = selectedCategoryId
    ? notes.filter(n => n.categoryId === selectedCategoryId)
    : notes;

  const selectedNote = notes.find(n => n.id === selectedNoteId);

  return (
    <NotesContext.Provider value={{
      notes, categories, selectedCategoryId, selectedNoteId, activeView, loading,
      setActiveView, setSelectedCategoryId, setSelectedNoteId,
      addNote, updateNote, deleteNote, addCategory, updateCategory, deleteCategory,
      addChecklistItem, toggleChecklistItem, deleteChecklistItem,
      linkNotes, unlinkNotes,
      filteredNotes, selectedNote, createNoteFromChat,
      getChildNotes, getLinkedNotes, getParentNote,
      getSubcategories, getRootCategories, getCategoryPath,
    }}>
      {children}
    </NotesContext.Provider>
  );
};
