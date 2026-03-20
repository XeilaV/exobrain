import { useNotes } from "@/contexts/NotesContext";
import { useState, useMemo, useRef, useEffect } from "react";
import { Plus, Trash2, CheckSquare, Square, ChevronRight, Link2, Unlink, FileText, ArrowUp, List } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/** Extract headings from content for mini-TOC */
const extractHeadings = (content: string): { text: string; index: number }[] => {
  const lines = content.split("\n");
  const headings: { text: string; index: number }[] = [];
  let charIndex = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    // Detect markdown-style headings or lines that look like section titles (ALL CAPS or ending with :)
    if (trimmed.startsWith("# ") || trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
      headings.push({ text: trimmed.replace(/^#+\s*/, ""), index: charIndex });
    } else if (trimmed.length > 3 && trimmed.length < 80 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed)) {
      headings.push({ text: trimmed, index: charIndex });
    }
    charIndex += line.length + 1;
  }
  return headings;
};

const LONG_CONTENT_THRESHOLD = 600; // characters

const NoteEditor = () => {
  const {
    selectedNote,
    updateNote,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    categories,
    notes,
    getChildNotes,
    getLinkedNotes,
    getParentNote,
    setSelectedNoteId,
    linkNotes,
    unlinkNotes,
    addNote,
    getCategoryPath,
  } = useNotes();
  const [newItemText, setNewItemText] = useState("");
  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [linkSearch, setLinkSearch] = useState("");
  const [showToc, setShowToc] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const headings = useMemo(
    () => (selectedNote ? extractHeadings(selectedNote.content) : []),
    [selectedNote?.content]
  );

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

  const parentNote = getParentNote(selectedNote.id);
  const childNotes = getChildNotes(selectedNote.id);
  const linkedNotes = getLinkedNotes(selectedNote.id);
  const categoryPath = getCategoryPath(selectedNote.categoryId);
  const completedCount = selectedNote.checklist.filter((i) => i.completed).length;

  const isLong = selectedNote.content.length > LONG_CONTENT_THRESHOLD;
  const showMiniToc = isLong && headings.length > 0;

  const availableToLink = notes.filter(
    (n) =>
      n.id !== selectedNote.id &&
      !selectedNote.linkedNoteIds.includes(n.id) &&
      n.parentNoteId !== selectedNote.id &&
      selectedNote.parentNoteId !== n.id &&
      (linkSearch === "" || n.title.toLowerCase().includes(linkSearch.toLowerCase()))
  );

  const scrollToHeading = (index: number) => {
    if (!textareaRef.current) return;
    const ta = textareaRef.current;
    ta.focus();
    ta.setSelectionRange(index, index);
    // Scroll the textarea to show that position
    const lineHeight = 20;
    const linesBefore = selectedNote.content.substring(0, index).split("\n").length;
    ta.scrollTop = Math.max(0, (linesBefore - 3) * lineHeight);
  };

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Breadcrumb + context bar */}
      <div className="px-6 pt-4 pb-2 border-b border-border space-y-3">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground font-body flex-wrap">
          {categoryPath.map((cat, i) => (
            <span key={cat.id} className="flex items-center gap-1">
              {i > 0 && <ChevronRight size={10} className="text-muted-foreground/50" />}
              <button
                onClick={() => { /* could navigate */ }}
                className="hover:text-foreground transition-colors"
              >
                {cat.icon} {cat.name}
              </button>
            </span>
          ))}
          {parentNote && (
            <>
              <ChevronRight size={10} className="text-muted-foreground/50" />
              <button
                onClick={() => setSelectedNoteId(parentNote.id)}
                className="hover:text-foreground transition-colors flex items-center gap-1"
              >
                <ArrowUp size={10} />
                {parentNote.title}
              </button>
            </>
          )}
        </div>

        {/* Title */}
        <input
          value={selectedNote.title}
          onChange={(e) => updateNote(selectedNote.id, { title: e.target.value })}
          className="w-full font-display text-2xl font-bold bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
          placeholder="Título de la nota..."
        />

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap">
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
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            })}
          </span>
          <button
            onClick={() => setShowLinkPicker(!showLinkPicker)}
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-body"
          >
            <Link2 size={12} />
            Enlazar
          </button>
          <button
            onClick={() => addNote(selectedNote.categoryId, selectedNote.id)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-body"
          >
            <Plus size={12} />
            Nota hija
          </button>
          {showMiniToc && (
            <button
              onClick={() => setShowToc(!showToc)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-body"
            >
              <List size={12} />
              Índice
            </button>
          )}
        </div>

        {/* Link picker */}
        <AnimatePresence>
          {showLinkPicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-muted rounded-lg p-2 space-y-1.5">
                <input
                  value={linkSearch}
                  onChange={(e) => setLinkSearch(e.target.value)}
                  placeholder="Buscar nota para enlazar..."
                  className="w-full text-xs bg-background rounded-md px-2.5 py-1.5 outline-none text-foreground placeholder:text-muted-foreground font-body focus:ring-1 focus:ring-ring"
                  autoFocus
                />
                <div className="max-h-32 overflow-y-auto space-y-0.5 scrollbar-thin">
                  {availableToLink.slice(0, 8).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        linkNotes(selectedNote.id, n.id);
                        setShowLinkPicker(false);
                        setLinkSearch("");
                      }}
                      className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-background/80 text-foreground font-body flex items-center gap-2 transition-colors"
                    >
                      <Link2 size={10} className="text-muted-foreground shrink-0" />
                      <span className="truncate">{n.title}</span>
                    </button>
                  ))}
                  {availableToLink.length === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center py-2">No hay notas disponibles</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Mini TOC sidebar */}
        <AnimatePresence>
          {showToc && showMiniToc && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 180 }}
              exit={{ opacity: 0, width: 0 }}
              className="border-r border-border bg-muted/30 overflow-y-auto scrollbar-thin"
            >
              <div className="p-3">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2 font-body">Índice</p>
                <div className="space-y-0.5">
                  {headings.map((h, i) => (
                    <button
                      key={i}
                      onClick={() => scrollToHeading(h.index)}
                      className="w-full text-left text-xs text-muted-foreground hover:text-foreground py-1 px-1.5 rounded hover:bg-muted transition-colors font-body truncate"
                    >
                      {h.text}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main editor area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-6">
          <textarea
            ref={textareaRef}
            value={selectedNote.content}
            onChange={(e) => updateNote(selectedNote.id, { content: e.target.value })}
            className="w-full min-h-[200px] bg-transparent outline-none text-foreground font-body text-sm leading-relaxed resize-none placeholder:text-muted-foreground"
            placeholder="Escribe tu nota aquí... Usa # para crear secciones y generar un mini-índice automático."
          />

          {/* Relationships panel */}
          {(childNotes.length > 0 || linkedNotes.length > 0) && (
            <div className="border-t border-border pt-4 space-y-3">
              {childNotes.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 font-body">Notas hijas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {childNotes.map((cn) => (
                      <button
                        key={cn.id}
                        onClick={() => setSelectedNoteId(cn.id)}
                        className="flex items-center gap-1.5 text-xs bg-muted hover:bg-muted/80 text-foreground rounded-md px-2.5 py-1.5 font-body transition-colors"
                      >
                        <FileText size={10} className="text-muted-foreground" />
                        {cn.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {linkedNotes.length > 0 && (
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 font-body">Notas enlazadas</p>
                  <div className="flex flex-wrap gap-1.5">
                    {linkedNotes.map((ln) => (
                      <div key={ln.id} className="flex items-center gap-0.5">
                        <button
                          onClick={() => setSelectedNoteId(ln.id)}
                          className="flex items-center gap-1.5 text-xs bg-primary/10 hover:bg-primary/15 text-foreground rounded-l-md px-2.5 py-1.5 font-body transition-colors"
                        >
                          <Link2 size={10} className="text-primary" />
                          {ln.title}
                        </button>
                        <button
                          onClick={() => unlinkNotes(selectedNote.id, ln.id)}
                          className="text-xs bg-primary/10 hover:bg-destructive/15 text-muted-foreground hover:text-destructive rounded-r-md px-1.5 py-1.5 transition-colors"
                          title="Desenlazar"
                        >
                          <Unlink size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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
                    <span className={`flex-1 text-sm font-body ${item.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
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
    </div>
  );
};

export default NoteEditor;
