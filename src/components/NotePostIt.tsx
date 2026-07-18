import { useNotes } from "@/contexts/NotesContext";
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { X, Plus, Trash2, CheckSquare, Square, ChevronRight, Link2, Unlink, FileText, ArrowUp, GripVertical, Copy, Paperclip, Download, File, Type, ListChecks, Maximize2, Minimize2, CornerDownRight, Check, Calendar as CalendarIcon, MoreHorizontal, Dot } from "lucide-react";

import { useNoteAttachments } from "@/hooks/useNoteAttachments";
import { motion, Reorder, useDragControls } from "framer-motion";
import { toast } from "sonner";
import RichTextEditor from "./RichTextEditor";
import NameInputDialog from "./NameInputDialog";
import TaskSheet from "./TaskSheet";

import { format, isToday, isTomorrow, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { ChecklistItem } from "@/types/notes";

interface PostItChecklistItemProps {
  item: ChecklistItem;
  noteId: string;
  mobile: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onMove?: (dir: -1 | 1) => void;
  onOpenSheet?: () => void;
  subtaskCount?: number;
}

const dueLabel = (iso: string, hasTime?: boolean) => {
  const d = new Date(iso);
  if (isToday(d)) return hasTime ? `hoy ${format(d, "HH:mm")}` : "hoy";
  if (isTomorrow(d)) return hasTime ? `mañana ${format(d, "HH:mm")}` : "mañana";
  return hasTime ? format(d, "d MMM HH:mm", { locale: es }) : format(d, "d MMM", { locale: es });
};

const PostItChecklistItem = ({ item, noteId, mobile, isFirst, isLast, onMove, onOpenSheet, subtaskCount = 0 }: PostItChecklistItemProps) => {
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

  const commitEdit = () => {
    if (!selectedNote) { setIsEditing(false); return; }
    const trimmed = editText.trim();
    if (trimmed && trimmed !== item.text) {
      updateNote(noteId, { checklist: selectedNote.checklist.map(i => i.id === item.id ? { ...i, text: trimmed } : i) });
    } else if (!trimmed) {
      setEditText(item.text);
    }
    setIsEditing(false);
  };

  const startEdit = () => { setEditText(item.text); setIsEditing(true); };

  const isBullet = item.style === "bullet";

  const toggleStyle = () => {
    if (!selectedNote) return;
    updateNote(noteId, {
      checklist: selectedNote.checklist.map(i => i.id === item.id ? { ...i, style: isBullet ? "task" : "bullet" as const } : i),
    });
  };

  const checkbox = isBullet ? (
    <button onClick={toggleStyle} aria-label="Cambiar a tarea"
      className={`text-primary shrink-0 flex items-center justify-center ${mobile ? "min-h-11 min-w-11" : ""}`}>
      <Dot size={mobile ? 28 : 20} />
    </button>
  ) : (
    <button onClick={() => toggleChecklistItem(noteId, item.id)} aria-label={item.completed ? "Marcar como pendiente" : "Marcar como completada"}
      onDoubleClick={toggleStyle}
      title="Doble clic: convertir en viñeta"
      className={`text-primary shrink-0 flex items-center justify-center ${mobile ? "min-h-11 min-w-11" : ""}`}>
      {item.completed ? <CheckSquare size={mobile ? 22 : 16} /> : <Square size={mobile ? 22 : 16} />}
    </button>
  );

  if (mobile) {
    const overdue = item.dueAt && !item.completed && isPast(new Date(item.dueAt)) && !isToday(new Date(item.dueAt));
    return (
      <div className="flex items-center gap-1 bg-background/50 rounded-md px-1 py-1 min-h-14">
        <div className="shrink-0 w-9 h-9 flex items-center justify-center">
          {isBullet ? (
            <button onClick={toggleStyle} aria-label="Cambiar a tarea" className="text-primary w-9 h-9 flex items-center justify-center">
              <Dot size={24} />
            </button>
          ) : (
            <button onClick={() => toggleChecklistItem(noteId, item.id)}
              onDoubleClick={toggleStyle}
              aria-label={item.completed ? "Marcar como pendiente" : "Marcar como completada"}
              className="text-primary w-9 h-9 flex items-center justify-center">
              {item.completed ? <CheckSquare size={20} /> : <Square size={20} />}
            </button>
          )}
        </div>
        <button
          onClick={() => onOpenSheet?.()}
          className="flex-1 min-w-0 text-left py-1.5 basis-[80%]"
        >
          <span className={`block text-[15px] font-body leading-snug break-words ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
            {item.text || <span className="italic text-muted-foreground/60">Sin título</span>}
          </span>
          {(item.dueAt || subtaskCount > 0) && (
            <span className="flex items-center gap-2 mt-0.5 text-[11px] font-body text-muted-foreground">
              {item.dueAt && (
                <span className={`inline-flex items-center gap-0.5 ${overdue ? "text-destructive" : ""}`}>
                  <CalendarIcon size={11} />{dueLabel(item.dueAt, item.hasTime)}
                </span>
              )}
              {subtaskCount > 0 && (
                <span className="inline-flex items-center gap-0.5">
                  <CornerDownRight size={11} />{subtaskCount}
                </span>
              )}
            </span>
          )}
        </button>
        <div className="shrink-0 flex flex-col items-center justify-center -space-y-1">
          <button onClick={e => { e.stopPropagation(); onMove?.(-1); }} disabled={isFirst} aria-label="Subir"
            className="text-muted-foreground disabled:opacity-20 w-8 h-7 flex items-center justify-center"><ChevronUp size={16} /></button>
          <button onClick={e => { e.stopPropagation(); onMove?.(1); }} disabled={isLast} aria-label="Bajar"
            className="text-muted-foreground disabled:opacity-20 w-8 h-7 flex items-center justify-center"><ChevronDown size={16} /></button>
        </div>
      </div>
    );
  }


  const textEl = isEditing ? (
    <textarea ref={inputRef} value={editText} onChange={e => { setEditText(e.target.value); autoGrow(e.currentTarget); }}
      onBlur={commitEdit}
      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commitEdit(); } if (e.key === "Escape") { setEditText(item.text); setIsEditing(false); } }}
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
        if (!draggedRef.current) { startEdit(); }
        dragStartRef.current = null;
      }}
      className={`flex-1 text-sm font-body select-none ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}
    >{item.text}</span>
  );

  const actions = (
    <>
      <button onClick={() => onOpenSheet?.()} aria-label="Detalles"
        className="opacity-0 group-hover:opacity-60 text-muted-foreground shrink-0"><MoreHorizontal size={14} /></button>
      <button onClick={() => { navigator.clipboard.writeText(item.text); toast.success("Copiado"); }}
        className="opacity-0 group-hover:opacity-50 text-muted-foreground shrink-0"><Copy size={12} /></button>
      <Trash2 size={12} className="opacity-0 group-hover:opacity-50 text-destructive cursor-pointer shrink-0"
        onClick={() => deleteChecklistItem(noteId, item.id)} />
    </>
  );

  return (
    <Reorder.Item value={item} className="flex items-center gap-1.5 group bg-background/50 rounded px-1.5 py-1 touch-none" id={item.id} style={{ touchAction: "none" }}>
      <GripVertical size={14} className="text-muted-foreground/40 shrink-0 pointer-events-none" />
      {checkbox}{textEl}{actions}
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
  const [sheetTaskId, setSheetTaskId] = useState<string | null>(null);

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
        <div className="flex items-center gap-1 text-xs md:text-[10px] text-muted-foreground font-body flex-1 min-w-0 flex-wrap">
          {categoryPath.map((cat, i) => (
            <span key={cat.id} className="flex items-center gap-0.5">
              {i > 0 && <ChevronRight size={10} />}
              {cat.icon} {cat.name}
            </span>
          ))}
          {parentNote && (
            <>
              <ChevronRight size={10} />
              <button onClick={() => { setSelectedNoteId(parentNote.id); onClose(); }}
                className="hover:text-foreground flex items-center gap-0.5 min-h-9 md:min-h-0">
                <ArrowUp size={10} />{parentNote.title}
              </button>
            </>
          )}
          <span className="flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded bg-background/60">
            {isChecklistNote ? <ListChecks size={11} /> : <Type size={11} />}
            {isChecklistNote ? "Lista" : "Texto"}
          </span>
        </div>
        {!isMobile && (
          <button onClick={() => setMaximized(m => !m)} aria-label={maximized ? "Restaurar" : "Maximizar"} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground shrink-0">
            {maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        )}
        <button onClick={onClose} aria-label="Cerrar" className="rounded-md hover:bg-muted text-muted-foreground hover:text-foreground shrink-0 min-h-11 min-w-11 md:min-h-0 md:min-w-0 md:p-1 flex items-center justify-center">
          <X size={isMobile ? 22 : 16} />
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
            <span className="text-xs md:text-[10px] bg-muted text-muted-foreground rounded px-2 py-1 md:px-1.5 md:py-0.5 font-body">
              {categories.find(c => c.id === note.categoryId)?.icon} heredada
            </span>
          ) : (
            <select value={note.categoryId} onChange={e => updateNote(noteId, { categoryId: e.target.value })}
              className="text-xs md:text-[10px] bg-muted text-muted-foreground rounded px-2 py-1.5 md:px-1.5 md:py-0.5 outline-none font-body min-h-11 md:min-h-0">
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          )}
          <button onClick={() => setShowLinkPicker(!showLinkPicker)}
            className="flex items-center gap-1 text-xs md:text-[10px] text-muted-foreground hover:text-foreground font-body min-h-11 md:min-h-0 px-2 md:px-0">
            <Link2 size={14} className="md:size-2.5" />Enlazar
          </button>
          <button onClick={() => setNewChildDialog("text")}
            className="flex items-center gap-1 text-xs md:text-[10px] text-muted-foreground hover:text-foreground font-body min-h-11 md:min-h-0 px-2 md:px-0" title="Añadir nota hija de texto">
            <Type size={14} className="md:size-2.5" />Hija
          </button>
          <button onClick={() => setNewChildDialog("checklist")}
            className="flex items-center gap-1 text-xs md:text-[10px] text-muted-foreground hover:text-foreground font-body min-h-11 md:min-h-0 px-2 md:px-0" title="Añadir lista hija">
            <ListChecks size={14} className="md:size-2.5" />Lista
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
            className="flex items-center gap-1 text-xs md:text-[10px] text-muted-foreground hover:text-foreground font-body min-h-11 md:min-h-0 px-2 md:px-0">
            <Paperclip size={14} className="md:size-2.5" />{uploading ? "..." : "Archivo"}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" multiple
            onChange={e => { if (e.target.files) { Array.from(e.target.files).forEach(uploadFile); e.target.value = ""; } }} />
          <button onClick={() => { deleteNote(noteId); onClose(); toast.success("Nota eliminada"); }}
            className="flex items-center gap-1 text-xs md:text-[10px] text-destructive hover:text-destructive/80 font-body ml-auto min-h-11 md:min-h-0 px-2 md:px-0">
            <Trash2 size={14} className="md:size-2.5" />Borrar
          </button>
        </div>
      </div>


      {showLinkPicker && (
        <div className="px-3 py-1 shrink-0">
          <div className="bg-muted rounded-lg p-1.5 space-y-1">
            <input value={linkSearch} onChange={e => setLinkSearch(e.target.value)}
              placeholder="Buscar nota..." autoFocus
              className="w-full text-base md:text-[10px] bg-background rounded px-2 py-2 md:py-1 outline-none text-foreground font-body" />
            <div className="max-h-32 md:max-h-24 overflow-y-auto space-y-0.5 scrollbar-thin">
              {availableToLink.slice(0, 6).map(n => (
                <button key={n.id} onClick={() => { linkNotes(noteId, n.id); setShowLinkPicker(false); setLinkSearch(""); }}
                  className="w-full text-left text-sm md:text-[10px] px-2 py-2 md:py-1 rounded hover:bg-background/80 text-foreground font-body flex items-center gap-1.5 min-h-11 md:min-h-0">
                  <Link2 size={14} className="md:size-2 text-muted-foreground shrink-0" /><span className="truncate">{n.title}</span>
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
            <h3 className="font-display text-base md:text-sm font-semibold text-foreground flex items-center gap-1.5 mb-2">
              <CheckSquare size={16} className="text-primary" />Tareas
              {note.checklist.length > 0 && (
                <span className="text-xs md:text-[10px] text-muted-foreground font-body font-normal">{completedCount}/{note.checklist.length}</span>
              )}
            </h3>
            {isMobile ? (
              <div className="space-y-1">
                {note.checklist.filter(i => !i.parentId).map((item, idx, arr) => {
                  const subCount = note.checklist.filter(s => s.parentId === item.id).length;
                  return (
                    <PostItChecklistItem key={item.id} item={item} noteId={noteId} mobile
                      subtaskCount={subCount}
                      isFirst={idx === 0} isLast={idx === arr.length - 1}
                      onMove={(dir) => {
                        // Reorder within top-level items only, preserving subtasks
                        const tops = note.checklist.filter(i => !i.parentId);
                        const target = idx + dir;
                        if (target < 0 || target >= tops.length) return;
                        const newTops = [...tops];
                        [newTops[idx], newTops[target]] = [newTops[target], newTops[idx]];
                        // Rebuild: each top followed by its subtasks
                        const rebuilt: ChecklistItem[] = [];
                        newTops.forEach(t => {
                          rebuilt.push(t);
                          note.checklist.filter(s => s.parentId === t.id).forEach(s => rebuilt.push(s));
                        });
                        updateNote(noteId, { checklist: rebuilt });
                      }}
                      onOpenSheet={() => setSheetTaskId(item.id)} />
                  );
                })}
              </div>
            ) : (
              <Reorder.Group axis="y" values={note.checklist} onReorder={handleReorder} className="space-y-1">
                {note.checklist.map(item => (
                  <PostItChecklistItem key={item.id} item={item} noteId={noteId} mobile={false}
                    onOpenSheet={() => setSheetTaskId(item.id)} />
                ))}
              </Reorder.Group>
            )}
            <div className="flex items-end gap-1.5 mt-2">
              <textarea value={newItemText}
                onChange={e => {
                  setNewItemText(e.target.value);
                  e.currentTarget.style.height = "auto";
                  e.currentTarget.style.height = e.currentTarget.scrollHeight + "px";
                }}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddItem(); (e.currentTarget as HTMLTextAreaElement).style.height = "auto"; } }}
                placeholder="Añadir tarea..." rows={1}
                className="flex-1 text-base md:text-sm bg-muted rounded px-2 py-2.5 md:py-1.5 outline-none text-foreground placeholder:text-muted-foreground font-body resize-none overflow-hidden leading-snug max-h-40 min-h-11 md:min-h-0" />
              <button onClick={handleAddItem} aria-label="Añadir tarea" className="rounded bg-primary text-primary-foreground hover:opacity-90 shrink-0 min-h-11 min-w-11 md:min-h-0 md:min-w-0 md:p-1.5 flex items-center justify-center">
                <Plus size={isMobile ? 20 : 14} />
              </button>
              <button
                onClick={async () => {
                  const text = newItemText.trim() || "Nueva tarea";
                  const newItem: ChecklistItem = { id: crypto.randomUUID(), text, completed: false };
                  const newChecklist = [...note.checklist, newItem];
                  updateNote(noteId, { checklist: newChecklist });
                  setNewItemText("");
                  setSheetTaskId(newItem.id);
                }}
                aria-label="Añadir tarea con detalles"
                title="Añadir con fecha, notas, subtareas"
                className="rounded bg-muted text-foreground hover:bg-muted/70 shrink-0 min-h-11 min-w-11 md:min-h-0 md:min-w-0 md:p-1.5 flex items-center justify-center"
              >
                <MoreHorizontal size={isMobile ? 20 : 14} />
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

        {(parentNote || childNotes.length > 0 || linkedNotes.length > 0) && (
          <div className="border-t border-border pt-2 space-y-2">
            {parentNote && (
              <div>
                <p className="text-[11px] md:text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1 font-body">Madre</p>
                <button onClick={() => setSelectedNoteId(parentNote.id)}
                  className="flex items-center gap-1 text-sm md:text-[10px] bg-muted hover:bg-muted/80 text-foreground rounded px-3 py-2 md:px-2 md:py-1 font-body min-h-11 md:min-h-0">
                  <ArrowUp size={12} className="md:size-2" />{parentNote.noteType === "checklist" ? <ListChecks size={12} className="md:size-2" /> : <FileText size={12} className="md:size-2" />}{parentNote.title}
                </button>
              </div>
            )}
            {childNotes.length > 0 && (
              <div>
                <p className="text-[11px] md:text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1 font-body">Hijas</p>
                <div className="flex flex-wrap gap-1">
                  {childNotes.map(cn => (
                    <button key={cn.id} onClick={() => { setSelectedNoteId(cn.id); }}
                      className="flex items-center gap-1 text-sm md:text-[10px] bg-muted hover:bg-muted/80 text-foreground rounded px-3 py-2 md:px-2 md:py-1 font-body min-h-11 md:min-h-0">
                      {cn.noteType === "checklist" ? <ListChecks size={12} className="md:size-2" /> : <FileText size={12} className="md:size-2" />}{cn.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {linkedNotes.length > 0 && (
              <div>
                <p className="text-[11px] md:text-[9px] font-medium text-muted-foreground uppercase tracking-wider mb-1 font-body">Enlazadas</p>
                <div className="flex flex-wrap gap-1">
                  {linkedNotes.map(ln => (
                    <div key={ln.id} className="flex items-center gap-0.5">
                      <button onClick={() => setSelectedNoteId(ln.id)}
                        className="flex items-center gap-1 text-sm md:text-[10px] bg-primary/10 text-foreground rounded-l px-3 py-2 md:px-2 md:py-1 font-body min-h-11 md:min-h-0">
                        <Link2 size={12} className="md:size-2 text-primary" />{ln.title}
                      </button>
                      <button onClick={() => unlinkNotes(noteId, ln.id)} aria-label="Desenlazar"
                        className="text-sm md:text-[10px] bg-primary/10 hover:bg-destructive/15 text-muted-foreground rounded-r px-2 py-2 md:px-1 md:py-1 min-h-11 min-w-11 md:min-h-0 md:min-w-0 flex items-center justify-center">
                        <Unlink size={12} className="md:size-2" />
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
            <h3 className="font-display text-sm md:text-xs font-semibold text-foreground flex items-center gap-1.5 mb-2">
              <Paperclip size={14} className="text-primary" />Archivos
              <span className="text-xs md:text-[10px] text-muted-foreground font-body font-normal">{attachments.length}</span>
            </h3>
            <div className="space-y-1">
              {attachments.map(att => {
                const isImage = att.contentType.startsWith("image/");
                const sizeStr = att.fileSize < 1024 ? `${att.fileSize}B`
                  : att.fileSize < 1048576 ? `${(att.fileSize / 1024).toFixed(1)}KB`
                  : `${(att.fileSize / 1048576).toFixed(1)}MB`;
                return (
                  <div key={att.id} className="flex items-center gap-1.5 group bg-background/50 rounded px-2 py-1.5 md:px-1.5 md:py-1">
                    {isImage ? (
                      <a href={att.publicUrl} target="_blank" rel="noreferrer" className="shrink-0">
                        <img src={att.publicUrl} alt={att.fileName} className="w-10 h-10 md:w-8 md:h-8 rounded object-cover" />
                      </a>
                    ) : (
                      <File size={18} className="md:size-3.5 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm md:text-[10px] font-body text-foreground truncate">{att.fileName}</p>
                      <p className="text-xs md:text-[9px] text-muted-foreground font-body">{sizeStr}</p>
                    </div>
                    <a href={att.publicUrl} target="_blank" rel="noreferrer" aria-label="Descargar"
                      className="md:opacity-0 md:group-hover:opacity-60 text-muted-foreground shrink-0 min-h-11 min-w-11 md:min-h-0 md:min-w-0 md:p-0.5 flex items-center justify-center">
                      <Download size={16} className="md:size-2.5" />
                    </a>
                    <button onClick={() => deleteAttachment(att)} aria-label="Borrar archivo"
                      className="md:opacity-0 md:group-hover:opacity-60 text-destructive shrink-0 min-h-11 min-w-11 md:min-h-0 md:min-w-0 md:p-0.5 flex items-center justify-center">
                      <Trash2 size={16} className="md:size-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-border text-xs md:text-[9px] text-muted-foreground font-body shrink-0">
        {new Date(note.updatedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
      </div>


      <NameInputDialog
        open={newChildDialog !== null}
        title={newChildDialog === "checklist" ? "Nueva lista hija" : "Nueva nota hija"}
        placeholder={newChildDialog === "checklist" ? "Nombre de la lista..." : "Nombre de la nota..."}
        onSubmit={async (name) => {
          const type = newChildDialog!;
          setNewChildDialog(null);
          const created = await addNote(note.categoryId, noteId, type);
          if (created) updateNote(created.id, { title: name });
        }}
        onCancel={() => setNewChildDialog(null)}
      />

      <TaskSheet
        open={sheetTaskId !== null}
        noteId={noteId}
        task={sheetTaskId ? note.checklist.find(i => i.id === sheetTaskId) ?? null : null}
        allItems={note.checklist}
        onClose={() => setSheetTaskId(null)}
        onChange={(patch) => {
          if (!sheetTaskId) return;
          updateNote(noteId, {
            checklist: note.checklist.map(i => i.id === sheetTaskId ? { ...i, ...patch, updatedAt: new Date().toISOString() } : i),
          });
        }}
        onDelete={() => {
          if (!sheetTaskId) return;
          updateNote(noteId, {
            checklist: note.checklist.filter(i => i.id !== sheetTaskId && i.parentId !== sheetTaskId),
          });
          setSheetTaskId(null);
        }}
        onAddSubtask={(text) => {
          if (!sheetTaskId) return;
          const sub: ChecklistItem = { id: crypto.randomUUID(), text, completed: false, parentId: sheetTaskId };
          // Insert right after the parent's existing subtasks group
          const parentIdx = note.checklist.findIndex(i => i.id === sheetTaskId);
          const lastSubIdx = (() => {
            let last = parentIdx;
            for (let i = parentIdx + 1; i < note.checklist.length; i++) {
              if (note.checklist[i].parentId === sheetTaskId) last = i; else if (!note.checklist[i].parentId) break;
            }
            return last;
          })();
          const next = [...note.checklist];
          next.splice(lastSubIdx + 1, 0, sub);
          updateNote(noteId, { checklist: next });
        }}
        onToggleSubtask={(id) => {
          updateNote(noteId, {
            checklist: note.checklist.map(i => i.id === id ? { ...i, completed: !i.completed } : i),
          });
        }}
        onDeleteSubtask={(id) => {
          updateNote(noteId, { checklist: note.checklist.filter(i => i.id !== id) });
        }}
        onMoveSubtask={(id, dir) => {
          if (!sheetTaskId) return;
          const subs = note.checklist.filter(i => i.parentId === sheetTaskId);
          const idx = subs.findIndex(s => s.id === id);
          const target = idx + dir;
          if (target < 0 || target >= subs.length) return;
          const newSubs = [...subs];
          [newSubs[idx], newSubs[target]] = [newSubs[target], newSubs[idx]];
          // Rebuild: keep non-subs where they are; splice new subs in place of old
          const parentIdx = note.checklist.findIndex(i => i.id === sheetTaskId);
          const rebuilt = note.checklist.filter(i => i.parentId !== sheetTaskId);
          const insertAt = rebuilt.findIndex(i => i.id === sheetTaskId) + 1;
          rebuilt.splice(insertAt, 0, ...newSubs);
          updateNote(noteId, { checklist: rebuilt });
        }}
      />
      
    </motion.div>
  );
};

export default NotePostIt;
