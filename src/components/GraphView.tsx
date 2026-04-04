import { useNotes } from "@/contexts/NotesContext";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, RotateCcw, Filter } from "lucide-react";
import NotePostIt from "./NotePostIt";

interface NodePos {
  id: string;
  x: number;
  y: number;
  label: string;
  type: "category" | "parent-note" | "child-note";
  categoryId: string;
  parentNoteId?: string | null;
  noteId?: string;
}

interface Edge {
  from: string;
  to: string;
  type: "branch" | "link";
}

const CAT_R = 24;
const NOTE_R = 8;
const PARENT_R = 10;

const GraphView = () => {
  const {
    notes, categories, setSelectedNoteId, addNote, addCategory,
  } = useNotes();

  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<NodePos[]>([]);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<{ id: string; ox: number; oy: number } | null>(null);
  const [openPostIt, setOpenPostIt] = useState<{ noteId: string; x: number; y: number } | null>(null);
  const [filterCat, setFilterCat] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📌");
  const hasAutoLayouted = useRef(false);

  const filteredCategories = useMemo(() =>
    filterCat ? categories.filter(c => c.id === filterCat) : categories
  , [categories, filterCat]);

  // Auto-layout: tree structure
  const computeLayout = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const newPos: NodePos[] = [];
    const cats = filteredCategories;
    if (cats.length === 0) { setPositions([]); return; }

    // Distribute categories vertically on the left, with branches going right
    const catSpacing = Math.min(120, (h - 80) / Math.max(cats.length, 1));
    const startY = Math.max(60, (h - catSpacing * (cats.length - 1)) / 2);

    cats.forEach((cat, ci) => {
      const catX = Math.min(80, w * 0.12);
      const catY = startY + ci * catSpacing;

      newPos.push({
        id: `cat-${cat.id}`, x: catX, y: catY,
        label: cat.name, type: "category", categoryId: cat.id,
      });

      if (expandedCats.has(cat.id)) {
        const rootNotes = notes.filter(n => n.categoryId === cat.id && !n.parentNoteId);
        const armLen = Math.min(100, (w - catX - 60) / 3);
        const noteSpacing = Math.min(50, catSpacing * 0.8 / Math.max(rootNotes.length, 1));
        const noteStartY = catY - (rootNotes.length - 1) * noteSpacing / 2;

        rootNotes.forEach((note, ni) => {
          const nx = catX + armLen;
          const ny = noteStartY + ni * noteSpacing;

          newPos.push({
            id: `note-${note.id}`, x: nx, y: ny,
            label: note.title, type: "parent-note",
            categoryId: cat.id, noteId: note.id,
          });

          if (expandedParents.has(note.id)) {
            const children = notes.filter(n => n.parentNoteId === note.id);
            const childArm = Math.min(80, (w - nx - 40) / 2);
            const childSpacing = Math.min(35, noteSpacing * 0.7 / Math.max(children.length, 1));
            const childStartY = ny - (children.length - 1) * childSpacing / 2;

            children.forEach((child, chi) => {
              newPos.push({
                id: `note-${child.id}`,
                x: nx + childArm,
                y: childStartY + chi * childSpacing,
                label: child.title, type: "child-note",
                categoryId: cat.id, noteId: child.id,
                parentNoteId: note.id,
              });
            });
          }
        });
      }
    });

    setPositions(newPos);
  }, [filteredCategories, expandedCats, expandedParents, notes]);

  useEffect(() => {
    computeLayout();
    hasAutoLayouted.current = true;
  }, [computeLayout]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => computeLayout());
    ro.observe(el);
    return () => ro.disconnect();
  }, [computeLayout]);

  // Edges
  const edges = useMemo<Edge[]>(() => {
    const posIds = new Set(positions.map(p => p.id));
    const e: Edge[] = [];

    positions.forEach(p => {
      if (p.type === "parent-note") {
        const catKey = `cat-${p.categoryId}`;
        if (posIds.has(catKey)) e.push({ from: catKey, to: p.id, type: "branch" });
      }
      if (p.type === "child-note" && p.parentNoteId) {
        const parentKey = `note-${p.parentNoteId}`;
        if (posIds.has(parentKey)) e.push({ from: parentKey, to: p.id, type: "branch" });
      }
      // Manual links
      if (p.noteId) {
        const note = notes.find(n => n.id === p.noteId);
        if (note) {
          note.linkedNoteIds.forEach(lid => {
            const targetKey = `note-${lid}`;
            if (posIds.has(targetKey) && p.noteId! < lid) {
              e.push({ from: p.id, to: targetKey, type: "link" });
            }
          });
        }
      }
    });
    return e;
  }, [positions, notes]);

  const getPos = (id: string) => positions.find(p => p.id === id);

  // Drag handlers
  const handlePointerDown = useCallback((e: React.PointerEvent, nodeId: string) => {
    const pos = positions.find(p => p.id === nodeId);
    if (!pos) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = containerRef.current?.getBoundingClientRect();
    setDrag({ id: nodeId, ox: e.clientX - (rect?.left || 0) - pos.x, oy: e.clientY - (rect?.top || 0) - pos.y });
    e.stopPropagation();
  }, [positions]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const w = rect?.width || 400;
    const h = rect?.height || 600;
    const nx = Math.max(30, Math.min(w - 30, e.clientX - (rect?.left || 0) - drag.ox));
    const ny = Math.max(30, Math.min(h - 30, e.clientY - (rect?.top || 0) - drag.oy));

    setPositions(prev => {
      const dragNode = prev.find(p => p.id === drag.id);
      if (!dragNode) return prev;
      const dx = nx - dragNode.x;
      const dy = ny - dragNode.y;

      return prev.map(p => {
        if (p.id === drag.id) return { ...p, x: nx, y: ny };
        // Move descendants when dragging category
        if (dragNode.type === "category" && p.categoryId === dragNode.categoryId && p.type !== "category") {
          return { ...p, x: p.x + dx, y: p.y + dy };
        }
        // Move children when dragging parent note
        if (dragNode.type === "parent-note" && p.parentNoteId === dragNode.noteId) {
          return { ...p, x: p.x + dx, y: p.y + dy };
        }
        return p;
      });
    });
  }, [drag]);

  const handlePointerUp = useCallback(() => setDrag(null), []);

  const handleNodeClick = useCallback((nodeId: string, e: React.MouseEvent) => {
    if (drag) return;
    if (nodeId.startsWith("cat-")) {
      const catId = nodeId.replace("cat-", "");
      setExpandedCats(prev => {
        const next = new Set(prev);
        if (next.has(catId)) next.delete(catId); else next.add(catId);
        return next;
      });
    } else if (nodeId.startsWith("note-")) {
      const nId = nodeId.replace("note-", "");
      const note = notes.find(n => n.id === nId);
      const hasChildren = notes.some(n => n.parentNoteId === nId);

      if (hasChildren && !openPostIt) {
        // Toggle children expansion
        setExpandedParents(prev => {
          const next = new Set(prev);
          if (next.has(nId)) next.delete(nId); else next.add(nId);
          return next;
        });
      }
      // Open post-it
      const rect = containerRef.current?.getBoundingClientRect();
      setOpenPostIt({ noteId: nId, x: e.clientX, y: e.clientY });
    }
  }, [drag, notes, openPostIt]);

  // Add category from map
  const handleAddCategory = () => {
    if (newCatName.trim()) {
      addCategory(newCatName.trim(), newCatIcon, null);
      setNewCatName("");
      setNewCatIcon("📌");
      setIsAddingCat(false);
    }
  };

  // Add note to a category
  const handleAddNote = async (catId: string, parentId?: string) => {
    await addNote(catId, parentId || null);
  };

  const noteCount = (catId: string) => notes.filter(n => n.categoryId === catId).length;

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full w-full bg-background overflow-hidden relative select-none touch-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onClick={() => { if (openPostIt) setOpenPostIt(null); }}
    >
      {/* SVG edges */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        {edges.map((edge, idx) => {
          const from = getPos(edge.from);
          const to = getPos(edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={`e-${idx}`}
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={edge.type === "link" ? "hsl(var(--muted-foreground) / 0.3)" : "hsl(var(--foreground) / 0.4)"}
              strokeWidth={edge.type === "link" ? 1.5 : 2}
              strokeDasharray={edge.type === "link" ? "6 4" : "none"}
            />
          );
        })}
      </svg>

      {/* Nodes */}
      <AnimatePresence>
        {positions.map(node => {
          const isCat = node.type === "category";
          const isParent = node.type === "parent-note";
          const isChild = node.type === "child-note";
          const r = isCat ? CAT_R : isParent ? PARENT_R : NOTE_R;
          const isExpanded = isCat && expandedCats.has(node.categoryId);
          const isParentExpanded = isParent && node.noteId && expandedParents.has(node.noteId);
          const hasChildren = isParent && node.noteId && notes.some(n => n.parentNoteId === node.noteId);

          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: 1, scale: 1, left: node.x - r, top: node.y - r }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute flex flex-col items-center cursor-pointer"
              style={{ width: r * 2, zIndex: drag?.id === node.id ? 20 : isCat ? 5 : 2 }}
              onPointerDown={e => handlePointerDown(e, node.id)}
              onClick={e => { e.stopPropagation(); handleNodeClick(node.id, e); }}
            >
              {/* Label ABOVE the circle for categories */}
              {isCat && (
                <span className="absolute font-display text-xs font-semibold text-foreground whitespace-nowrap"
                  style={{ bottom: r * 2 + 4, left: '50%', transform: 'translateX(-50%)' }}>
                  {node.label}
                </span>
              )}

              {/* Circle */}
              <div
                className={`rounded-full transition-all ${
                  isCat
                    ? `border-2 ${isExpanded ? "bg-primary border-primary shadow-lg" : "bg-primary/70 border-primary/50 shadow-md"}`
                    : isParent
                    ? `border-2 ${hasChildren ? "bg-accent border-accent" : "bg-accent/70 border-accent/50"} shadow-sm`
                    : "bg-muted-foreground/60 border border-muted-foreground/30"
                }`}
                style={{ width: r * 2, height: r * 2 }}
              />

              {/* Label BELOW for notes */}
              {!isCat && (
                <span className="absolute font-body text-[9px] text-foreground whitespace-nowrap max-w-[80px] truncate text-center"
                  style={{ top: r * 2 + 2, left: '50%', transform: 'translateX(-50%)' }}>
                  {node.label}
                </span>
              )}

              {/* Add child note button on parent notes */}
              {isParent && isParentExpanded && (
                <button
                  onClick={e => { e.stopPropagation(); if (node.noteId) handleAddNote(node.categoryId, node.noteId); }}
                  className="absolute bg-primary text-primary-foreground rounded-full p-0.5 hover:scale-110 transition-transform"
                  style={{ top: -6, right: -6, zIndex: 10 }}
                  title="Añadir nota hija"
                >
                  <Plus size={8} />
                </button>
              )}

              {/* Add note button on expanded category */}
              {isCat && isExpanded && (
                <button
                  onClick={e => { e.stopPropagation(); handleAddNote(node.categoryId); }}
                  className="absolute bg-primary text-primary-foreground rounded-full p-0.5 hover:scale-110 transition-transform"
                  style={{ top: -6, right: -6, zIndex: 10 }}
                  title="Añadir nota"
                >
                  <Plus size={10} />
                </button>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Controls */}
      <div className="absolute top-3 right-3 flex gap-2 z-30">
        <button onClick={() => setShowFilter(!showFilter)}
          className={`p-2 rounded-lg border bg-card/90 backdrop-blur-sm shadow-sm hover:shadow transition-all ${filterCat ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
          title="Filtrar">
          <Filter size={16} />
        </button>
        <button onClick={computeLayout}
          className="p-2 rounded-lg border border-border bg-card/90 backdrop-blur-sm shadow-sm hover:shadow text-muted-foreground transition-all"
          title="Reorganizar">
          <RotateCcw size={16} />
        </button>
        <button onClick={() => setIsAddingCat(true)}
          className="p-2 rounded-lg border border-border bg-card/90 backdrop-blur-sm shadow-sm hover:shadow text-muted-foreground transition-all"
          title="Nuevo tema">
          <Plus size={16} />
        </button>
      </div>

      {/* Filter dropdown */}
      {showFilter && (
        <div className="absolute top-14 right-3 z-30 bg-card border border-border rounded-lg shadow-lg p-2 min-w-[140px]">
          <button onClick={() => { setFilterCat(null); setShowFilter(false); }}
            className={`w-full text-left text-xs px-2 py-1.5 rounded font-body transition-colors ${!filterCat ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`}>
            Todos los temas
          </button>
          {categories.map(c => (
            <button key={c.id} onClick={() => { setFilterCat(c.id); setShowFilter(false); }}
              className={`w-full text-left text-xs px-2 py-1.5 rounded font-body transition-colors ${filterCat === c.id ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Add category inline */}
      {isAddingCat && (
        <div className="absolute top-14 right-3 z-30 bg-card border border-border rounded-lg shadow-lg p-3 space-y-2 min-w-[180px]"
          onClick={e => e.stopPropagation()}>
          <div className="flex gap-2">
            <input value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)}
              className="w-10 text-center bg-muted rounded text-sm p-1" maxLength={2} />
            <input value={newCatName} onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddCategory()}
              placeholder="Nombre del tema..." autoFocus
              className="flex-1 bg-muted rounded text-xs px-2 py-1 text-foreground outline-none font-body" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddCategory} className="flex-1 bg-primary text-primary-foreground rounded text-xs py-1.5 font-medium">Añadir</button>
            <button onClick={() => { setIsAddingCat(false); setNewCatName(""); }} className="flex-1 bg-muted text-foreground rounded text-xs py-1.5">Cancelar</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {categories.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-4xl mb-3">🌳</p>
            <p className="font-display text-lg">Empieza tu árbol</p>
            <p className="text-sm mt-1 font-body">Pulsa + para crear un tema</p>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-2 text-[9px] font-body text-muted-foreground space-y-1 z-10">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary border-2 border-primary" />
          <span>Tema (tap expandir)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-accent border-2 border-accent" />
          <span>Nota madre</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-muted-foreground/60" />
          <span>Nota hija</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width={14} height={2}><line x1={0} y1={1} x2={14} y2={1} stroke="hsl(var(--foreground) / 0.4)" strokeWidth={2} /></svg>
          <span>Rama</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width={14} height={2}><line x1={0} y1={1} x2={14} y2={1} stroke="hsl(var(--muted-foreground) / 0.3)" strokeWidth={1.5} strokeDasharray="4 3" /></svg>
          <span>Enlace</span>
        </div>
      </div>

      {/* Post-it note overlay */}
      <AnimatePresence>
        {openPostIt && (
          <NotePostIt
            key={openPostIt.noteId}
            noteId={openPostIt.noteId}
            position={{ x: openPostIt.x, y: openPostIt.y }}
            onClose={() => { setOpenPostIt(null); setSelectedNoteId(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default GraphView;
