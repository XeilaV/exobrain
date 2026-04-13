import { useNotes } from "@/contexts/NotesContext";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { X, Plus, Trash2, CheckSquare, Square, ChevronRight, Link2, Unlink, FileText, ArrowUp, GripVertical, Copy, Paperclip, Download, Image as ImageIcon, File } from "lucide-react";
import { useNoteAttachments } from "@/hooks/useNoteAttachments";
import { motion, Reorder } from "framer-motion";
import { toast } from "sonner";

interface PostItChecklistItemProps {
  item: { id: string; text: string; completed: boolean };
  noteId: string;
}

const PostItChecklistItem = ({ item, noteId }: PostItChecklistItemProps) => {
  const { toggleChecklistItem, deleteChecklistItem, updateNote, selectedNote } = useNotes();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const inputRef = useRef<HTMLInputElement>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { if (isEditing) inputRef.current?.focus(); }, [isEditing]);

  const saveEdit = () => {
    if (!selectedNote) return;
    const trimmed = editText.trim();
    if (trimmed && trimmed !== item.text) {
      updateNote(noteId, { checklist: selectedNote.checklist.map(i => i.id === item.id ? { ...i, text: trimmed } : i) });
    } else { setEditText(item.text); }
    setIsEditing(false);
  };

  return (
    <Reorder.Item value={item} className="flex items-center gap-1.5 group bg-background/50 rounded px-1 py-0.5" id={item.id}>
      <GripVertical size={12} className="text-muted-foreground/40 cursor-grab shrink-0 touch-none" style={{ touchAction: "none" }} />
      <button onClick={() => toggleChecklistItem(noteId, item.id)} className="text-primary shrink-0">
        {item.completed ? <CheckSquare size={14} /> : <Square size={14} />}
      </button>
      {isEditing ? (
        <input ref={inputRef} value={editText} onChange={e => setEditText(e.target.value)}
          onBlur={saveEdit} onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") { setEditText(item.text); setIsEditing(false); } }}
          className="flex-1 text-xs font-body bg-muted rounded px-1.5 py-0.5 outline-none text-foreground focus:ring-1 focus:ring-ring" />
      ) : (
        <span
          onDoubleClick={() => { setIsEditing(true); setEditText(item.text); }}
          onPointerDown={() => { longPressRef.current = setTimeout(() => { setIsEditing(true); setEditText(item.text); }, 500); }}
          onPointerUp={() => { if (longPressRef.current) clearTimeout(longPressRef.current); }}
          onPointerCancel={() => { if (longPressRef.current) clearTimeout(longPressRef.current); }}
          className={`flex-1 text-xs font-body cursor-default select-none ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
        >{item.text}</span>
      )}
      <button onClick={() => { navigator.clipboard.writeText(item.text); toast.success("Copiado"); }}
        className="opacity-0 group-hover:opacity-50 text-muted-foreground shrink-0"><Copy size={10} /></button>
      <Trash2 size={10} className="opacity-0 group-hover:opacity-50 text-destructive cursor-pointer shrink-0"
        onClick={() => deleteChecklistItem(noteId, item.id)} />
    </Reorder.Item>
  );
};

interface NotePostItProps {
  noteId: string;
  position: { x: number; y: number };
  onClose: () => void;
}

const NotePostIt = ({ noteId, position, onClose }: NotePostItProps) => {
  const {
    notes, selectedNote, updateNote, addChecklistItem, categories,
    getChildNotes, getLinkedNotes, getParentNote, setSelectedNoteId,
    linkNotes, unlinkNotes, addNote, deleteNote, getCategoryPath,
  } = useNotes();

  const note = useMemo(() => notes.find(n => n.id === noteId), [notes, noteId]);
  const [newItemText, setNewItemText] = useState("");
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setSelectedNoteId(noteId); }, [noteId, setSelectedNoteId]);

  const handleReorder = useCallback((newOrder: any) => {
    if (!note) return;
    updateNote(noteId, { checklist: newOrder });
  }, [note, noteId, updateNote]);

  if (!note) return null;

  const parentNote = getParentNote(noteId);
  const childNotes = getChildNotes(noteId);
  const linkedNotes = getLinkedNotes(noteId);
  const categoryPath = getCategoryPath(note.categoryId);
  const completedCount = note.checklist.filter(i => i.completed).length;

  const availableToLink = notes.filter(n =>
    n.id !== noteId && !note.linkedNoteIds.includes(n.id) &&
    n.parentNoteId !== noteId && note.parentNoteId !== n.id &&
    (linkSearch === "" || n.title.toLowerCase().includes(linkSearch.toLowerCase()))
  );

  const handleAddItem = () => {
    if (newItemText.trim()) {
      addChecklistItem(noteId, newItemText.trim());
      setNewItemText("");
    }
  };

  const postItWidth = Math.min(380, window.innerWidth - 16);
  const postItHeight = Math.min(500, window.innerHeight - 80);
  let left = position.x - postItWidth / 2;
  let top = position.y - postItHeight / 2;
  left = Math.max(8, Math.min(window.innerWidth - postItWidth - 8, left));
  top = Math.max(50, Math.min(window.innerHeight - postItHeight - 8, top));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed z-50 bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
      style={{ left, top, width: postItWidth, maxHeight: postItHeight }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-muted/50 shrink-0">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-body flex-1 min-w-0 flex-wrap">
          {categoryPath.map((cat, i) => (
            <span key={cat.id} className="flex items-center gap-0.5">
              {i > 0 && <ChevronRight size={8} />}
              {cat.icon} {cat.name}
            </span>
          ))}
          {parentNote && (
            <>
              <ChevronRight size={8} />
              <button onClick={() => { setSelectedNoteId(parentNote.id); onClose(); }}
                className="hover:text-foreground flex items-center gap-0.5">
                <ArrowUp size={8} />{parentNote.title}
              </button>
            </>
          )}
        </div>
        <button onClick={onClose} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground shrink-0">
          <X size={16} />
        </button>
      </div>

      <div className="px-3 pt-2 shrink-0">
        <input
          value={note.title}
          onChange={e => updateNote(noteId, { title: e.target.value })}
          className="w-full font-display text-lg font-bold bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
          placeholder="Título..."
        />
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          {note.parentNoteId ? (
            <span className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-body">
              {categories.find(c => c.id === note.categoryId)?.icon} heredada
            </span>
          ) : (
            <select value={note.categoryId} onChange={e => updateNote(noteId, { categoryId: e.target.value })}
              className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5 outline-none font-body">
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          )}
          <button onClick={() => setShowLinkPicker(!showLinkPicker)}
            className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground font-body">
            <Link2 size={10} />Enlazar
          </button>
          <button onClick={() => addNote(note.categoryId, noteId)}
            className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground font-body">
            <Plus size={10} />Hija
          </button>
          <button onClick={() => { deleteNote(noteId); onClose(); toast.success("Nota eliminada"); }}
            className="flex items-center gap-0.5 text-[10px] text-destructive hover:text-destructive/80 font-body ml-auto">
            <Trash2 size={10} />Borrar
          </button>
        </div>
      </div>

      {showLinkPicker && (
        <div className="px-3 py-1 shrink-0">
          <div className="bg-muted rounded-lg p-1.5 space-y-1">
            <input value={linkSearch} onChange={e => setLinkSearch(e.target.value)}
              placeholder="Buscar nota..." autoFocus
              className="w-full text-[10px] bg-background rounded px-2 py-1 outline-none text-foreground font-body" />
            <div className="max-h-24 overflow-y-auto space-y-0.5 scrollbar-thin">
              {availableToLink.slice(0, 6).map(n => (
                <button key={n.id} onClick={() => { linkNotes(noteId, n.id); setShowLinkPicker(false); setLinkSearch(""); }}
                  className="w-full text-left text-[10px] px-2 py-1 rounded hover:bg-background/80 text-foreground font-body flex items-center gap-1">
                  <Link2 size={8} className="text-muted-foreground shrink-0" /><span className="truncate">{n.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 space-y-3">
        <textarea
          ref={textareaRef}
          value={note.content}
          onChange={e => updateNote(noteId, { content: e.target.value })}
          className="w-full min-h-[80px] bg-transparent outline-none text-foreground font-body text-xs leading-relaxed resize-none placeholder:text-muted-foreground"
          placeholder="Escribe aquí..."
        />

        {(childNotes.length > 0 || linkedNotes.length > 0) && (
          <div className="border-t border-border pt-2 space-y-2">
            {childNotes.length > 0 && (
              <div>
                <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1 font-body">Hijas</p>
                <div className="flex flex-wrap gap-1">
                  {childNotes.map(cn => (
                    <button key={cn.id} onClick={() => { setSelectedNoteId(cn.id); }}
                      className="flex items-center gap-1 text-[10px] bg-muted hover:bg-muted/80 text-foreground rounded px-2 py-1 font-body">
                      <FileText size={8} />{cn.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {linkedNotes.length > 0 && (
              <div>
                <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1 font-body">Enlazadas</p>
                <div className="flex flex-wrap gap-1">
                  {linkedNotes.map(ln => (
                    <div key={ln.id} className="flex items-center gap-0.5">
                      <button onClick={() => setSelectedNoteId(ln.id)}
                        className="flex items-center gap-1 text-[10px] bg-primary/10 text-foreground rounded-l px-2 py-1 font-body">
                        <Link2 size={8} className="text-primary" />{ln.title}
                      </button>
                      <button onClick={() => unlinkNotes(noteId, ln.id)}
                        className="text-[10px] bg-primary/10 hover:bg-destructive/15 text-muted-foreground rounded-r px-1 py-1">
                        <Unlink size={8} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="border-t border-border pt-2">
          <h3 className="font-display text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
            <CheckSquare size={12} className="text-primary" />Checklist
            {note.checklist.length > 0 && (
              <span className="text-[10px] text-muted-foreground font-body font-normal">{completedCount}/{note.checklist.length}</span>
            )}
          </h3>
          <Reorder.Group axis="y" values={note.checklist} onReorder={handleReorder} className="space-y-1">
            {note.checklist.map(item => (
              <PostItChecklistItem key={item.id} item={item} noteId={noteId} />
            ))}
          </Reorder.Group>
          <div className="flex items-center gap-1.5 mt-2">
            <textarea value={newItemText} onChange={e => setNewItemText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddItem(); } }}
              placeholder="Añadir tarea..." rows={1}
              className="flex-1 text-xs bg-muted rounded px-2 py-1.5 outline-none text-foreground placeholder:text-muted-foreground font-body resize-none" />
            <button onClick={handleAddItem} className="p-1.5 rounded bg-primary text-primary-foreground hover:opacity-90">
              <Plus size={12} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-3 py-1.5 border-t border-border text-[9px] text-muted-foreground font-body shrink-0">
        {new Date(note.updatedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
      </div>
    </motion.div>
  );
};

export default NotePostIt;
