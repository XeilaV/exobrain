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
  visible: boolean;
}

interface Edge {
  from: string;
  to: string;
  type: "parent" | "link" | "category";
}

const CAT_RADIUS = 28;
const NOTE_RADIUS = 20;

const GraphView = () => {
  const { notes, categories, setSelectedNoteId, setActiveView, getRootCategories, getSubcategories } = useNotes();
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<NodePosition[]>([]);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  // Collect all category ids (including nested) for a given root
  const getAllCatIds = useCallback((catId: string): string[] => {
    const subs = getSubcategories(catId);
    return [catId, ...subs.flatMap((s) => getAllCatIds(s.id))];
  }, [getSubcategories]);

  // Build flat list of all categories with hierarchy info
  const allCats = useMemo(() => {
    const result: { id: string; name: string; icon: string; parentId: string | null; depth: number }[] = [];
    const walk = (parentId: string | null, depth: number) => {
      const cats = parentId === null ? getRootCategories() : getSubcategories(parentId);
      cats.forEach((c) => {
        result.push({ ...c, depth });
        walk(c.id, depth + 1);
      });
    };
    walk(null, 0);
    return result;
  }, [categories, getRootCategories, getSubcategories]);

  const toggleCategory = useCallback((catId: string) => {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) {
        // Collapse: remove this and all children
        const allIds = getAllCatIds(catId);
        allIds.forEach((id) => next.delete(id));
      } else {
        next.add(catId);
      }
      return next;
    });
  }, [getAllCatIds]);

  // Calculate positions whenever expansion changes
  useEffect(() => {
    const w = containerRef.current?.clientWidth || 400;
    const h = containerRef.current?.clientHeight || 600;
    const cx = w / 2;
    const cy = h / 2;
    const newPos: NodePosition[] = [];

    const rootCats = getRootCategories();
    const catCount = rootCats.length || 1;
    const baseRadius = Math.min(w, h) * 0.28;

    rootCats.forEach((cat, i) => {
      const angle = (2 * Math.PI * i) / catCount - Math.PI / 2;
      const catX = cx + Math.cos(angle) * baseRadius;
      const catY = cy + Math.sin(angle) * baseRadius;

      newPos.push({
        id: `cat-${cat.id}`,
        x: catX, y: catY,
        label: cat.name, icon: cat.icon,
        type: "category", visible: true,
      });

      // Place subcategories and notes if expanded
      if (expandedCats.has(cat.id)) {
        placeChildren(cat.id, catX, catY, angle, 1, newPos);
      }
    });

    setPositions(newPos);
  }, [expandedCats, notes, categories]);

  const placeChildren = (
    catId: string, parentX: number, parentY: number,
    parentAngle: number, depth: number, out: NodePosition[]
  ) => {
    const subs = getSubcategories(catId);
    const catNotes = notes.filter((n) => n.categoryId === catId);
    const children = [
      ...subs.map((s) => ({ kind: "cat" as const, ...s })),
      ...catNotes.map((n) => ({ kind: "note" as const, ...n })),
    ];
    if (children.length === 0) return;

    const spread = Math.min(Math.PI * 0.8, children.length * 0.4);
    const startAngle = parentAngle - spread / 2;
    const armLength = 70 + depth * 20;

    children.forEach((child, j) => {
      const angle = children.length === 1
        ? parentAngle
        : startAngle + (spread * j) / (children.length - 1);
      const x = parentX + Math.cos(angle) * armLength;
      const y = parentY + Math.sin(angle) * armLength;

      if (child.kind === "cat") {
        out.push({
          id: `cat-${child.id}`, x, y,
          label: child.name, icon: child.icon,
          type: "category", visible: true,
        });
        if (expandedCats.has(child.id)) {
          placeChildren(child.id, x, y, angle, depth + 1, out);
        }
      } else {
        out.push({
          id: `note-${child.id}`, x, y,
          label: child.title, icon: "",
          type: "note", categoryId: child.categoryId, visible: true,
        });
        // Show child notes if this note has children and parent cat is expanded
        const childNotes = notes.filter((n) => n.parentNoteId === child.id);
        childNotes.forEach((cn, ci) => {
          const cAngle = angle + (ci - (childNotes.length - 1) / 2) * 0.3;
          out.push({
            id: `note-${cn.id}`,
            x: x + Math.cos(cAngle) * 55,
            y: y + Math.sin(cAngle) * 55,
            label: cn.title, icon: "",
            type: "note", categoryId: cn.categoryId, visible: true,
          });
        });
      }
    });
  };

  // Build edges from visible positions
  const edges = useMemo<Edge[]>(() => {
    const posIds = new Set(positions.map((p) => p.id));
    const e: Edge[] = [];

    positions.forEach((p) => {
      if (p.type === "note") {
        // Category -> note
        const catKey = `cat-${p.categoryId}`;
        if (posIds.has(catKey)) {
          e.push({ from: catKey, to: p.id, type: "category" });
        }
        // Parent note -> child note
        const noteId = p.id.replace("note-", "");
        const note = notes.find((n) => n.id === noteId);
        if (note?.parentNoteId && posIds.has(`note-${note.parentNoteId}`)) {
          e.push({ from: `note-${note.parentNoteId}`, to: p.id, type: "parent" });
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
      if (p.type === "category") {
        // Subcategory edges
        const catId = p.id.replace("cat-", "");
        const cat = categories.find((c) => c.id === catId);
        if (cat?.parentId && posIds.has(`cat-${cat.parentId}`)) {
          e.push({ from: `cat-${cat.parentId}`, to: p.id, type: "category" });
        }
      }
    });
    return e;
  }, [positions, notes, categories]);

  const getPos = (id: string) => positions.find((p) => p.id === id);

  // Drag handlers
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
    const x = e.clientX - (rect?.left || 0) - drag.offsetX;
    const y = e.clientY - (rect?.top || 0) - drag.offsetY;
    setPositions((prev) =>
      prev.map((p) => (p.id === drag.id ? { ...p, x, y } : p))
    );
  }, [drag]);

  const handlePointerUp = useCallback(() => setDrag(null), []);

  const handleNodeClick = (nodeId: string) => {
    if (drag) return;
    if (nodeId.startsWith("cat-")) {
      toggleCategory(nodeId.replace("cat-", ""));
    } else if (nodeId.startsWith("note-")) {
      setSelectedNoteId(nodeId.replace("note-", ""));
      setActiveView("notes");
    }
  };

  const noteCount = (catId: string): number => {
    const allIds = getAllCatIds(catId);
    return notes.filter((n) => allIds.includes(n.categoryId)).length;
  };

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
      {/* Edges */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        <AnimatePresence>
          {edges.map((edge, i) => {
            const from = getPos(edge.from);
            const to = getPos(edge.to);
            if (!from || !to) return null;
            return (
              <motion.line
                key={`${edge.from}-${edge.to}`}
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

      {/* Nodes */}
      <AnimatePresence>
        {positions.filter((n) => n.visible).map((node) => {
          const isCat = node.type === "category";
          const r = isCat ? CAT_RADIUS : NOTE_RADIUS;
          const isExpanded = isCat && expandedCats.has(node.id.replace("cat-", ""));
          const count = isCat ? noteCount(node.id.replace("cat-", "")) : 0;

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
                    : "bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/40"
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
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-2.5 text-[9px] font-body text-muted-foreground space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary/15 border border-primary/30" />
          <span>Categoría (tap para expandir)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-card border border-border" />
          <span>Nota (tap para abrir)</span>
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
