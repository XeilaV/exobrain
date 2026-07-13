import { useNotes } from "@/contexts/NotesContext";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { X, Plus, Trash2, CheckSquare, Square, ChevronRight, Link2, Unlink, FileText, ArrowUp, GripVertical, Copy, Paperclip, Download, File, Type, ListChecks, Maximize2, Minimize2 } from "lucide-react";
import { useNoteAttachments } from "@/hooks/useNoteAttachments";
import { motion, Reorder } from "framer-motion";
import { toast } from "sonner";
import RichTextEditor from "./RichTextEditor";
import NameInputDialog from "./NameInputDialog";

interface PostItChecklistItemProps {
  item: { id: string; text: string; completed: boolean };
  noteId: string;
}

const PostItChecklistItem = ({ item, noteId }: PostItChecklistItemProps) => {
  const { toggleChecklistItem, deleteChecklistItem, updateNote, selectedNote } = useNotes();
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const draggedRef = useRef(false);

  const autoGrow = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  useEffect(() => { if (isEditing) { inputRef.current?.focus(); autoGrow(inputRef.current); } }, [isEditing]);

  const saveEdit = () => {
    if (!selectedNote) return;
    const trimmed = editText.trim();
    if (trimmed && trimmed !== item.text) {
      updateNote(noteId, { checklist: selectedNote.checklist.map(i => i.id === item.id ? { ...i, text: trimmed } : i) });
    } else { setEditText(item.text); }
    setIsEditing(false);
  };

  return (
    <Reorder.Item value={item} className="flex items-center gap-1.5 group bg-background/50 rounded px-1.5 py-1 touch-none" id={item.id} style={{ touchAction: "none" }}>
      <GripVertical size={14} className="text-muted-foreground/40 shrink-0 pointer-events-none" />
      <button onClick={() => toggleChecklistItem(noteId, item.id)} className="text-primary shrink-0">
        {item.completed ? <CheckSquare size={16} /> : <Square size={16} />}
      </button>
      {isEditing ? (
        <textarea ref={inputRef} value={editText} onChange={e => { setEditText(e.target.value); autoGrow(e.currentTarget); }}
          onBlur={saveEdit} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEdit(); } if (e.key === "Escape") { setEditText(item.text); setIsEditing(false); } }}
          rows={1}
          className="flex-1 text-sm font-body bg-muted rounded px-1.5 py-0.5 outline-none text-foreground focus:ring-1 focus:ring-ring resize-none overflow-hidden leading-snug" />
      ) : (
        <span
          onPointerDown={e => { dragStartRef.current = { x: e.clientX, y: e.clientY }; draggedRef.current = false; }}
          onPointerMove={e => {
            if (!dragStartRef.current) return;
            const dx = e.clientX - dragStartRef.current.x;
            const dy = e.clientY - dragStartRef.current.y;
            if (Math.hypot(dx, dy) > 5) draggedRef.current = true;
          }}
          onPointerUp={() => {
            if (!draggedRef.current) { setIsEditing(true); setEditText(item.text); }
            dragStartRef.current = null;
          }}
          className={`flex-1 text-sm font-body select-none ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
        >{item.text}</span>
      )}
      <button onClick={() => { navigator.clipboard.writeText(item.text); toast.success("Copiado"); }}
        className="opacity-0 group-hover:opacity-50 text-muted-foreground shrink-0"><Copy size={12} /></button>
      <Trash2 size={12} className="opacity-0 group-hover:opacity-50 text-destructive cursor-pointer shrink-0"
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
    notes, updateNote, addChecklistItem, categories,
    getChildNotes, getLinkedNotes, getParentNote, setSelectedNoteId,
    linkNotes, unlinkNotes, addNote, deleteNote, getCategoryPath,
  } = useNotes();

  const note = useMemo(() => notes.find(n => n.id === noteId), [notes, noteId]);
  const [newItemText, setNewItemText] = useState("");
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [maximized, setMaximized] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { attachments, uploading, uploadFile, deleteAttachment } = useNoteAttachments(noteId);
  const [newChildDialog, setNewChildDialog] = useState<null | "text" | "checklist">(null);

  useEffect(() => { setSelectedNoteId(noteId); }, [noteId, setSelectedNoteId]);

  const handleReorder = useCallback((newOrder: any) => {
    if (!note) return;
    updateNote(noteId, { checklist: newOrder });
  }, [note, noteId, updateNote]);

  if (!note) return null;

  const isChecklistNote = note.noteType === "checklist";
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

  const isMobile = window.innerWidth < 768;
  const fullW = window.innerWidth - 16;
  const fullH = window.innerHeight - 24;
  const postItWidth = isMobile || maximized ? fullW : Math.min(420, window.innerWidth - 32);
  const postItHeight = isMobile || maximized ? fullH : Math.min(620, window.innerHeight - 80);
  let left = isMobile || maximized ? 8 : position.x - postItWidth / 2;
  let top = isMobile || maximized ? 12 : position.y - postItHeight / 2;
  left = Math.max(8, Math.min(window.innerWidth - postItWidth - 8, left));
  top = Math.max(12, Math.min(window.innerHeight - postItHeight - 12, top));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      className="fixed z-50 bg-card border border-border rounded-xl shadow-2xl flex flex-col overflow-hidden"
      style={{ left, top, width: postItWidth, height: postItHeight }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
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
          <span className="flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded bg-background/60">
            {isChecklistNote ? <ListChecks size={9} /> : <Type size={9} />}
            {isChecklistNote ? "Lista" : "Texto"}
          </span>
        </div>
        {!isMobile && (
          <button onClick={() => setMaximized(m => !m)} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground shrink-0">
            {maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        )}
        <button onClick={onClose} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground shrink-0">
          <X size={16} />
        </button>
      </div>

      {/* Title + actions */}
      <div className="px-3 pt-2 shrink-0">
        <input
          value={note.title}
          onChange={e => updateNote(noteId, { title: e.target.value })}
          className="w-full font-display text-xl font-bold bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
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
          <button onClick={() => addNote(note.categoryId, noteId, "text")}
            className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground font-body" title="Añadir nota hija de texto">
            <Type size={10} />Hija
          </button>
          <button onClick={() => addNote(note.categoryId, noteId, "checklist")}
            className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground font-body" title="Añadir lista hija">
            <ListChecks size={10} />Lista
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground font-body">
            <Paperclip size={10} />{uploading ? "..." : "Archivo"}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" multiple
            onChange={e => { if (e.target.files) { Array.from(e.target.files).forEach(uploadFile); e.target.value = ""; } }} />
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

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2 space-y-3">
        {isChecklistNote ? (
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
              <CheckSquare size={14} className="text-primary" />Tareas
              {note.checklist.length > 0 && (
                <span className="text-[10px] text-muted-foreground font-body font-normal">{completedCount}/{note.checklist.length}</span>
              )}
            </h3>
            <Reorder.Group axis="y" values={note.checklist} onReorder={handleReorder} className="space-y-1">
              {note.checklist.map(item => (
                <PostItChecklistItem key={item.id} item={item} noteId={noteId} />
              ))}
            </Reorder.Group>
            <div className="flex items-end gap-1.5 mt-2">
              <textarea value={newItemText}
                onChange={e => {
                  setNewItemText(e.target.value);
                  e.currentTarget.style.height = "auto";
                  e.currentTarget.style.height = e.currentTarget.scrollHeight + "px";
                }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddItem(); (e.currentTarget as HTMLTextAreaElement).style.height = "auto"; } }}
                placeholder="Añadir tarea..." rows={1}
                className="flex-1 text-sm bg-muted rounded px-2 py-1.5 outline-none text-foreground placeholder:text-muted-foreground font-body resize-none overflow-hidden leading-snug max-h-40" />
              <button onClick={handleAddItem} className="p-1.5 rounded bg-primary text-primary-foreground hover:opacity-90 shrink-0">
                <Plus size={14} />
              </button>
            </div>
          </div>
        ) : (
          <RichTextEditor
            content={note.content}
            onChange={(html) => updateNote(noteId, { content: html })}
            placeholder="Escribe aquí... usa la barra para dar formato"
          />
        )}

        {(childNotes.length > 0 || linkedNotes.length > 0) && (
          <div className="border-t border-border pt-2 space-y-2">
            {childNotes.length > 0 && (
              <div>
                <p className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1 font-body">Hijas</p>
                <div className="flex flex-wrap gap-1">
                  {childNotes.map(cn => (
                    <button key={cn.id} onClick={() => { setSelectedNoteId(cn.id); }}
                      className="flex items-center gap-1 text-[10px] bg-muted hover:bg-muted/80 text-foreground rounded px-2 py-1 font-body">
                      {cn.noteType === "checklist" ? <ListChecks size={8} /> : <FileText size={8} />}{cn.title}
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

        {attachments.length > 0 && (
          <div className="border-t border-border pt-2">
            <h3 className="font-display text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
              <Paperclip size={12} className="text-primary" />Archivos
              <span className="text-[10px] text-muted-foreground font-body font-normal">{attachments.length}</span>
            </h3>
            <div className="space-y-1">
              {attachments.map(att => {
                const isImage = att.contentType.startsWith("image/");
                const sizeStr = att.fileSize < 1024 ? `${att.fileSize}B`
                  : att.fileSize < 1048576 ? `${(att.fileSize / 1024).toFixed(1)}KB`
                  : `${(att.fileSize / 1048576).toFixed(1)}MB`;
                return (
                  <div key={att.id} className="flex items-center gap-1.5 group bg-background/50 rounded px-1.5 py-1">
                    {isImage ? (
                      <a href={att.publicUrl} target="_blank" rel="noreferrer" className="shrink-0">
                        <img src={att.publicUrl} alt={att.fileName} className="w-8 h-8 rounded object-cover" />
                      </a>
                    ) : (
                      <File size={14} className="text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-body text-foreground truncate">{att.fileName}</p>
                      <p className="text-[9px] text-muted-foreground font-body">{sizeStr}</p>
                    </div>
                    <a href={att.publicUrl} target="_blank" rel="noreferrer"
                      className="opacity-0 group-hover:opacity-60 text-muted-foreground shrink-0 p-0.5">
                      <Download size={10} />
                    </a>
                    <button onClick={() => deleteAttachment(att)}
                      className="opacity-0 group-hover:opacity-60 text-destructive shrink-0 p-0.5">
                      <Trash2 size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-border text-[9px] text-muted-foreground font-body shrink-0">
        {new Date(note.updatedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
      </div>
    </motion.div>
  );
};

export default NotePostIt;
