import { useNotes } from "@/contexts/NotesContext";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface NodePosition {
  x: number;
  y: number;
  id: string;
  label: string;
  icon: string;
  type: "category" | "note";
  categoryId?: string;
  parentNoteId?: string | null;
  visible: boolean;
}

interface Edge {
  from: string;
  to: string;
  type: "parent" | "link" | "category";
}

const CAT_RADIUS = 28;
const NOTE_RADIUS = 20;
const PADDING = 40;

const GraphView = () => {
  const { notes, categories, setSelectedNoteId, setActiveView } = useNotes();
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<NodePosition[]>([]);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const toggleCategory = useCallback((catId: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }, []);

  const toggleNoteExpand = useCallback((noteId: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) next.delete(noteId);
      else next.add(noteId);
      return next;
    });
  }, []);

  // Clamp position within container bounds
  const clamp = useCallback((val: number, max: number, radius: number) => {
    return Math.max(PADDING + radius, Math.min(max - PADDING - radius, val));
  }, []);

  useEffect(() => {
    const w = containerRef.current?.clientWidth || 400;
    const h = containerRef.current?.clientHeight || 600;
    const cx = w / 2;
    const cy = h / 2;
    const newPos: NodePosition[] = [];

    const catCount = categories.length || 1;
    const baseRadius = Math.min(w, h) * 0.25;

    categories.forEach((cat, i) => {
      const angle = (2 * Math.PI * i) / catCount - Math.PI / 2;
      const catX = clamp(cx + Math.cos(angle) * baseRadius, w, CAT_RADIUS);
      const catY = clamp(cy + Math.sin(angle) * baseRadius, h, CAT_RADIUS);

      newPos.push({
        id: `cat-${cat.id}`,
        x: catX, y: catY,
        label: cat.name, icon: cat.icon,
        type: "category", visible: true,
      });

      if (expandedCats.has(cat.id)) {
        // Root notes (no parent) in this category
        const rootNotes = notes.filter((n) => n.categoryId === cat.id && !n.parentNoteId);
        const armLength = Math.min(80, (Math.min(w, h) - PADDING * 2) / 4);
        const spread = Math.min(Math.PI * 0.8, rootNotes.length * 0.4);
        const startAngle = angle - spread / 2;

        rootNotes.forEach((note, j) => {
          const nAngle = rootNotes.length === 1 ? angle : startAngle + (spread * j) / (rootNotes.length - 1);
          const nx = clamp(catX + Math.cos(nAngle) * armLength, w, NOTE_RADIUS);
          const ny = clamp(catY + Math.sin(nAngle) * armLength, h, NOTE_RADIUS);

          newPos.push({
            id: `note-${note.id}`, x: nx, y: ny,
            label: note.title, icon: "",
            type: "note", categoryId: note.categoryId,
            parentNoteId: null, visible: true,
          });

          // If parent note is expanded, show child notes hanging from it
          if (expandedNotes.has(note.id)) {
            const children = notes.filter((n) => n.parentNoteId === note.id);
            const childArm = Math.min(55, (Math.min(w, h) - PADDING * 2) / 5);
            const childSpread = Math.min(Math.PI * 0.6, children.length * 0.35);
            const childStart = nAngle - childSpread / 2;

            children.forEach((child, ci) => {
              const cAngle = children.length === 1 ? nAngle : childStart + (childSpread * ci) / (children.length - 1);
              newPos.push({
                id: `note-${child.id}`,
                x: clamp(nx + Math.cos(cAngle) * childArm, w, NOTE_RADIUS),
                y: clamp(ny + Math.sin(cAngle) * childArm, h, NOTE_RADIUS),
                label: child.title, icon: "",
                type: "note", categoryId: cat.id,
                parentNoteId: child.parentNoteId, visible: true,
              });
            });
          }
        });
      }
    });

    setPositions(newPos);
  }, [expandedCats, expandedNotes, notes, categories, clamp]);

  // Build edges
  const edges = useMemo<Edge[]>(() => {
    const posIds = new Set(positions.map((p) => p.id));
    const e: Edge[] = [];

    positions.forEach((p) => {
      if (p.type === "note") {
        const noteId = p.id.replace("note-", "");
        const note = notes.find((n) => n.id === noteId);

        if (p.parentNoteId && posIds.has(`note-${p.parentNoteId}`)) {
          // Child note -> parent note edge
          e.push({ from: `note-${p.parentNoteId}`, to: p.id, type: "parent" });
        } else {
          // Root note -> category edge
          const catKey = `cat-${p.categoryId}`;
          if (posIds.has(catKey)) {
            e.push({ from: catKey, to: p.id, type: "category" });
          }
        }

        // Manual links
        if (note) {
          note.linkedNoteIds.forEach((lid) => {
            if (posIds.has(`note-${lid}`) && noteId < lid) {
              e.push({ from: `note-${noteId}`, to: `note-${lid}`, type: "link" });
            }
          });
        }
      }
    });
    return e;
  }, [positions, notes]);

  const getPos = (id: string) => positions.find((p) => p.id === id);

  // Drag handlers - when dragging a category, move its notes too
  const handlePointerDown = useCallback((e: React.PointerEvent, nodeId: string) => {
    const pos = positions.find((p) => p.id === nodeId);
    if (!pos) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const rect = containerRef.current?.getBoundingClientRect();
    setDrag({
      id: nodeId,
      offsetX: e.clientX - (rect?.left || 0) - pos.x,
      offsetY: e.clientY - (rect?.top || 0) - pos.y,
    });
  }, [positions]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const w = rect?.width || 400;
    const h = rect?.height || 600;
    const x = e.clientX - (rect?.left || 0) - drag.offsetX;
    const y = e.clientY - (rect?.top || 0) - drag.offsetY;

    setPositions((prev) => {
      const dragNode = prev.find((p) => p.id === drag.id);
      if (!dragNode) return prev;
      const dx = x - dragNode.x;
      const dy = y - dragNode.y;

      // If dragging a category, move its notes too
      if (dragNode.type === "category") {
        const catId = dragNode.id.replace("cat-", "");
        return prev.map((p) => {
          if (p.id === drag.id) return { ...p, x, y };
          if (p.type === "note" && p.categoryId === catId) {
            return { ...p, x: p.x + dx, y: p.y + dy };
          }
          return p;
        });
      }

      // If dragging a parent note, move its children too
      if (dragNode.type === "note") {
        const noteId = dragNode.id.replace("note-", "");
        return prev.map((p) => {
          if (p.id === drag.id) return { ...p, x, y };
          if (p.type === "note" && p.parentNoteId === noteId) {
            return { ...p, x: p.x + dx, y: p.y + dy };
          }
          return p;
        });
      }

      return prev.map((p) => (p.id === drag.id ? { ...p, x, y } : p));
    });
  }, [drag]);

  const handlePointerUp = useCallback(() => setDrag(null), []);

  const handleNodeClick = (nodeId: string) => {
    if (drag) return;
    if (nodeId.startsWith("cat-")) {
      toggleCategory(nodeId.replace("cat-", ""));
    } else if (nodeId.startsWith("note-")) {
      const noteId = nodeId.replace("note-", "");
      const note = notes.find((n) => n.id === noteId);
      // If note has children, toggle expand
      const hasChildren = notes.some((n) => n.parentNoteId === noteId);
      if (hasChildren) {
        toggleNoteExpand(noteId);
      }
      // Navigate to note
      setSelectedNoteId(null);
      setTimeout(() => {
        setSelectedNoteId(noteId);
        setActiveView("notes");
      }, 0);
    }
  };

  const noteCount = (catId: string) => notes.filter((n) => n.categoryId === catId).length;

  if (notes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="font-display text-lg">Mapa vacío</p>
          <p className="text-sm mt-1 font-body">Crea notas para verlas en el mapa</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full w-full bg-background overflow-hidden relative select-none touch-none"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        <AnimatePresence>
          {edges.map((edge, idx) => {
            const from = getPos(edge.from);
            const to = getPos(edge.to);
            if (!from || !to) return null;
            return (
              <motion.line
                key={`edge-${idx}-${edge.from}-${edge.to}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, x1: from.x, y1: from.y, x2: to.x, y2: to.y }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={
                  edge.type === "link"
                    ? "hsl(var(--primary) / 0.5)"
                    : edge.type === "parent"
                    ? "hsl(var(--accent) / 0.6)"
                    : "hsl(var(--border))"
                }
                strokeWidth={edge.type === "link" ? 2 : 1.5}
                strokeDasharray={edge.type === "link" ? "6 3" : "none"}
              />
            );
          })}
        </AnimatePresence>
      </svg>

      <AnimatePresence>
        {positions.filter((n) => n.visible).map((node) => {
          const isCat = node.type === "category";
          const r = isCat ? CAT_RADIUS : NOTE_RADIUS;
          const isExpanded = isCat && expandedCats.has(node.id.replace("cat-", ""));
          const count = isCat ? noteCount(node.id.replace("cat-", "")) : 0;
          const noteId = !isCat ? node.id.replace("note-", "") : "";
          const hasChildren = !isCat && notes.some((n) => n.parentNoteId === noteId);
          const isNoteExpanded = !isCat && expandedNotes.has(noteId);

          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1, left: node.x - r, top: node.y - r }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="absolute flex flex-col items-center"
              style={{ width: r * 2, zIndex: hovered === node.id || drag?.id === node.id ? 10 : 1 }}
              onPointerDown={(e) => handlePointerDown(e, node.id)}
              onPointerEnter={() => setHovered(node.id)}
              onPointerLeave={() => setHovered(null)}
              onClick={() => handleNodeClick(node.id)}
            >
              <div
                className={`flex items-center justify-center rounded-full transition-all cursor-pointer ${
                  isCat
                    ? `border-2 ${isExpanded ? "bg-primary/20 border-primary/50" : "bg-primary/10 border-primary/25"} shadow-md`
                    : `bg-card border ${hasChildren ? "border-primary/40" : "border-border"} shadow-sm hover:shadow-md hover:border-primary/40`
                } ${hovered === node.id ? "scale-110" : ""}`}
                style={{ width: r * 2, height: r * 2 }}
              >
                {isCat ? (
                  <span className="text-lg">{node.icon}</span>
                ) : (
                  <span className="text-[9px] font-body text-foreground text-center px-1 leading-tight line-clamp-2">
                    {node.label.length > 10 ? node.label.slice(0, 10) + "…" : node.label}
                  </span>
                )}
              </div>
              <span
                className={`text-center font-body leading-tight mt-1 ${
                  isCat ? "text-[11px] font-semibold text-foreground" : "text-[9px] text-muted-foreground"
                }`}
                style={{ maxWidth: r * 3 }}
              >
                {isCat ? `${node.label} (${count})` : node.label}
              </span>
              {isCat && (
                <span className="text-[8px] text-muted-foreground mt-0.5">
                  {isExpanded ? "▾ colapsar" : "▸ expandir"}
                </span>
              )}
              {hasChildren && !isCat && (
                <span className="text-[8px] text-muted-foreground mt-0.5">
                  {isNoteExpanded ? "▾" : "▸"} hijas
                </span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      <div className="absolute bottom-3 left-3 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-2.5 text-[9px] font-body text-muted-foreground space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary/15 border border-primary/30" />
          <span>Categoría (tap expandir)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-card border border-border" />
          <span>Nota (tap abrir)</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width={14} height={2}><line x1={0} y1={1} x2={14} y2={1} stroke="hsl(var(--primary) / 0.5)" strokeWidth={2} strokeDasharray="4 2" /></svg>
          <span>Enlace manual</span>
        </div>
      </div>
    </div>
  );
};

export default GraphView;
