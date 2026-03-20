import { useNotes } from "@/contexts/NotesContext";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";

interface NodePosition {
  x: number;
  y: number;
  id: string;
  label: string;
  icon: string;
  type: "category" | "note";
  categoryId?: string;
}

interface Edge {
  from: string;
  to: string;
  type: "parent" | "link" | "category";
}

const NODE_RADIUS = 24;
const CAT_RADIUS = 32;

const GraphView = () => {
  const { notes, categories, setSelectedNoteId, setActiveView, selectedCategoryId } = useNotes();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [positions, setPositions] = useState<NodePosition[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);

  // Filter notes by selected category (including subcategories)
  const visibleNotes = useMemo(() => {
    if (!selectedCategoryId) return notes;
    const allCatIds = new Set<string>();
    const collect = (cid: string) => {
      allCatIds.add(cid);
      categories.filter((c) => c.parentId === cid).forEach((c) => collect(c.id));
    };
    collect(selectedCategoryId);
    return notes.filter((n) => allCatIds.has(n.categoryId));
  }, [notes, categories, selectedCategoryId]);

  const visibleCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    visibleNotes.forEach((n) => ids.add(n.categoryId));
    return ids;
  }, [visibleNotes]);

  const visibleCategories = useMemo(() => categories.filter((c) => visibleCategoryIds.has(c.id)), [categories, visibleCategoryIds]);

  // Build edges
  const edges = useMemo<Edge[]>(() => {
    const e: Edge[] = [];
    const noteIds = new Set(visibleNotes.map((n) => n.id));

    visibleNotes.forEach((n) => {
      // Category -> note
      e.push({ from: `cat-${n.categoryId}`, to: `note-${n.id}`, type: "category" });
      // Parent -> child
      if (n.parentNoteId && noteIds.has(n.parentNoteId)) {
        e.push({ from: `note-${n.parentNoteId}`, to: `note-${n.id}`, type: "parent" });
      }
      // Links (deduplicated)
      n.linkedNoteIds.forEach((lid) => {
        if (noteIds.has(lid) && n.id < lid) {
          e.push({ from: `note-${n.id}`, to: `note-${lid}`, type: "link" });
        }
      });
    });
    return e;
  }, [visibleNotes]);

  // Initial layout: categories in center ring, notes around their category
  useEffect(() => {
    const width = canvasRef.current?.clientWidth || 800;
    const height = canvasRef.current?.clientHeight || 600;
    const cx = width / 2;
    const cy = height / 2;

    const newPositions: NodePosition[] = [];

    // Place categories in a circle
    const catCount = visibleCategories.length || 1;
    const catRadius = Math.min(width, height) * 0.25;

    visibleCategories.forEach((cat, i) => {
      const angle = (2 * Math.PI * i) / catCount - Math.PI / 2;
      newPositions.push({
        id: `cat-${cat.id}`,
        x: cx + Math.cos(angle) * catRadius,
        y: cy + Math.sin(angle) * catRadius,
        label: cat.name,
        icon: cat.icon,
        type: "category",
      });
    });

    // Place notes around their category
    const notesByCategory: Record<string, typeof visibleNotes> = {};
    visibleNotes.forEach((n) => {
      if (!notesByCategory[n.categoryId]) notesByCategory[n.categoryId] = [];
      notesByCategory[n.categoryId].push(n);
    });

    Object.entries(notesByCategory).forEach(([catId, catNotes]) => {
      const catPos = newPositions.find((p) => p.id === `cat-${catId}`);
      if (!catPos) return;
      const noteRadius = 80 + catNotes.length * 12;

      catNotes.forEach((note, j) => {
        const angle = (2 * Math.PI * j) / catNotes.length - Math.PI / 2;
        newPositions.push({
          id: `note-${note.id}`,
          x: catPos.x + Math.cos(angle) * noteRadius,
          y: catPos.y + Math.sin(angle) * noteRadius,
          label: note.title,
          icon: "",
          type: "note",
          categoryId: note.categoryId,
        });
      });
    });

    setPositions(newPositions);
  }, [visibleNotes, visibleCategories]);

  const getPos = (id: string) => positions.find((p) => p.id === id);

  const handleMouseDown = useCallback((e: React.MouseEvent, nodeId: string) => {
    const pos = positions.find((p) => p.id === nodeId);
    if (!pos) return;
    setDrag({ id: nodeId, offsetX: e.clientX - pos.x, offsetY: e.clientY - pos.y });
  }, [positions]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drag) return;
    setPositions((prev) =>
      prev.map((p) =>
        p.id === drag.id ? { ...p, x: e.clientX - drag.offsetX, y: e.clientY - drag.offsetY } : p
      )
    );
  }, [drag]);

  const handleMouseUp = useCallback(() => { setDrag(null); }, []);

  const handleNodeClick = (nodeId: string) => {
    if (nodeId.startsWith("note-")) {
      const noteId = nodeId.replace("note-", "");
      setSelectedNoteId(noteId);
      setActiveView("notes");
    }
  };

  if (visibleNotes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="font-display text-lg">Mapa de notas vacío</p>
          <p className="text-sm mt-1 font-body">Crea notas para verlas en el mapa</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={canvasRef}
      className="flex-1 bg-background overflow-hidden cursor-grab active:cursor-grabbing relative select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        {edges.map((edge, i) => {
          const from = getPos(edge.from);
          const to = getPos(edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke={
                edge.type === "link"
                  ? "hsl(var(--primary) / 0.4)"
                  : edge.type === "parent"
                  ? "hsl(var(--accent) / 0.5)"
                  : "hsl(var(--border))"
              }
              strokeWidth={edge.type === "link" ? 2 : 1.5}
              strokeDasharray={edge.type === "link" ? "6 3" : "none"}
            />
          );
        })}
      </svg>

      {positions.map((node) => {
        const isCategory = node.type === "category";
        const r = isCategory ? CAT_RADIUS : NODE_RADIUS;
        const isHovered = hovered === node.id;
        return (
          <div
            key={node.id}
            className="absolute flex flex-col items-center gap-1 transition-transform"
            style={{
              left: node.x - r,
              top: node.y - r,
              width: r * 2,
              zIndex: isHovered || drag?.id === node.id ? 10 : 1,
            }}
            onMouseDown={(e) => handleMouseDown(e, node.id)}
            onMouseEnter={() => setHovered(node.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => handleNodeClick(node.id)}
          >
            <div
              className={`flex items-center justify-center rounded-full transition-all ${
                isCategory
                  ? "bg-primary/15 border-2 border-primary/30 text-xl"
                  : "bg-card border border-border text-xs shadow-sm hover:shadow-md hover:border-primary/40"
              } ${isHovered ? "scale-110" : ""}`}
              style={{
                width: r * 2,
                height: r * 2,
                cursor: isCategory ? "default" : "pointer",
              }}
            >
              {isCategory ? node.icon : (
                <span className="text-[10px] font-body text-foreground text-center px-1 leading-tight line-clamp-2 overflow-hidden">
                  {node.label.length > 12 ? node.label.slice(0, 12) + "…" : node.label}
                </span>
              )}
            </div>
            <span
              className={`text-center font-body leading-tight ${
                isCategory
                  ? "text-xs font-medium text-foreground"
                  : "text-[10px] text-muted-foreground"
              }`}
              style={{ maxWidth: r * 3 }}
            >
              {node.label}
            </span>
          </div>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg p-3 text-[10px] font-body text-muted-foreground space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-border" />
          <span>Categoría</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-accent/50" />
          <span>Nota padre → hija</span>
        </div>
        <div className="flex items-center gap-2">
          <svg width={16} height={2}><line x1={0} y1={1} x2={16} y2={1} stroke="hsl(var(--primary) / 0.4)" strokeWidth={2} strokeDasharray="4 2" /></svg>
          <span>Enlace manual</span>
        </div>
        <p className="pt-1 text-[9px]">Arrastra los nodos · Clic para abrir</p>
      </div>
    </div>
  );
};

export default GraphView;
