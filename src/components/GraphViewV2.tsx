import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronRight,
  Home,
  ListChecks,
  Minus,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useNotes } from "@/contexts/NotesContext";
import NotePostIt from "./NotePostIt";
import { Note } from "@/types/notes";

type Point = { x: number; y: number };
type CanvasNode = Point & {
  id: string;
  kind: "root" | "category" | "note";
  label: string;
  color: string;
  categoryId?: string;
  noteId?: string;
  parentId?: string | null;
  depth: number;
};

type CanvasEdge = {
  id: string;
  from: string;
  to: string;
  color: string;
  width: number;
  kind: "branch" | "twig" | "link";
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const organicPath = (a: Point, b: Point, bend = 0.24) => {
  const dy = b.y - a.y;
  const dx = b.x - a.x;
  const c1 = { x: a.x + dx * bend * 0.35, y: a.y + dy * 0.52 };
  const c2 = { x: b.x - dx * bend * 0.6, y: b.y - dy * 0.38 };
  return `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`;
};

const GraphViewV2 = () => {
  const {
    notes,
    categories,
    brainName,
    selectedNoteId,
    setSelectedNoteId,
  } = useNotes();

  const canvasRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [focusedCategoryId, setFocusedCategoryId] = useState<string | null>(null);
  const [focusedNoteId, setFocusedNoteId] = useState<string | null>(null);
  const [openPostIt, setOpenPostIt] = useState<{ noteId: string; x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [query, setQuery] = useState("");
  const dragRef = useRef<null | { x: number; y: number; panX: number; panY: number }>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const rootNotesByCategory = useMemo(() => {
    const map = new Map<string, Note[]>();
    categories.forEach((cat) => {
      map.set(cat.id, notes.filter((n) => n.categoryId === cat.id && !n.parentNoteId));
    });
    return map;
  }, [categories, notes]);

  const childNotes = useMemo(() => {
    const map = new Map<string, Note[]>();
    notes.forEach((n) => {
      if (!n.parentNoteId) return;
      const list = map.get(n.parentNoteId) ?? [];
      list.push(n);
      map.set(n.parentNoteId, list);
    });
    return map;
  }, [notes]);

  const focusedNote = useMemo(
    () => notes.find((n) => n.id === focusedNoteId) ?? null,
    [notes, focusedNoteId],
  );

  const layout = useMemo(() => {
    const nodes: CanvasNode[] = [];
    const edges: CanvasEdge[] = [];
    const W = Math.max(size.w, 720);
    const H = Math.max(size.h, 620);
    const root: CanvasNode = {
      id: "root",
      kind: "root",
      label: brainName || "Exobrain",
      color: "var(--foreground)",
      x: W * 0.5,
      y: H - 72,
      depth: 0,
    };
    nodes.push(root);

    const categoryCount = Math.max(1, categories.length);
    const left = W * 0.14;
    const right = W * 0.86;
    const topBand = H * 0.22;
    const focusedCategory = categories.find((c) => c.id === focusedCategoryId);

    categories.forEach((cat, index) => {
      const t = categoryCount === 1 ? 0.5 : index / (categoryCount - 1);
      const x = left + (right - left) * t;
      const wave = Math.sin(t * Math.PI) * H * 0.055;
      const y = topBand + wave;
      const catNode: CanvasNode = {
        id: `cat-${cat.id}`,
        kind: "category",
        label: cat.name,
        color: cat.color,
        x,
        y,
        categoryId: cat.id,
        depth: 1,
      };
      nodes.push(catNode);
      edges.push({
        id: `root-${cat.id}`,
        from: root.id,
        to: catNode.id,
        color: cat.color,
        width: focusedCategoryId === cat.id ? 8 : 5.5,
        kind: "branch",
      });
    });

    if (focusedCategory) {
      const categoryNode = nodes.find((n) => n.id === `cat-${focusedCategory.id}`)!;
      const roots = rootNotesByCategory.get(focusedCategory.id) ?? [];
      const count = Math.max(1, roots.length);
      const branchY = H * 0.46;
      const span = Math.min(W * 0.56, 120 + roots.length * 95);

      roots.forEach((note, index) => {
        const t = count === 1 ? 0.5 : index / (count - 1);
        const x = categoryNode.x - span / 2 + span * t;
        const y = branchY + Math.abs(t - 0.5) * 62;
        const noteNode: CanvasNode = {
          id: `note-${note.id}`,
          kind: "note",
          label: note.title,
          color: focusedCategory.color,
          x,
          y,
          categoryId: focusedCategory.id,
          noteId: note.id,
          parentId: null,
          depth: 2,
        };
        nodes.push(noteNode);
        edges.push({
          id: `cat-note-${note.id}`,
          from: categoryNode.id,
          to: noteNode.id,
          color: focusedCategory.color,
          width: focusedNoteId === note.id ? 4 : 2.4,
          kind: "twig",
        });
      });

      if (focusedNote) {
        const parentNode = nodes.find((n) => n.id === `note-${focusedNote.id}`);
        const children = childNotes.get(focusedNote.id) ?? [];
        if (parentNode && children.length) {
          const childCount = Math.max(1, children.length);
          const childSpan = Math.min(W * 0.46, 110 + children.length * 84);
          children.forEach((child, index) => {
            const t = childCount === 1 ? 0.5 : index / (childCount - 1);
            const x = parentNode.x - childSpan / 2 + childSpan * t;
            const y = H * 0.67 + Math.abs(t - 0.5) * 38;
            nodes.push({
              id: `note-${child.id}`,
              kind: "note",
              label: child.title,
              color: focusedCategory.color,
              x,
              y,
              categoryId: focusedCategory.id,
              noteId: child.id,
              parentId: focusedNote.id,
              depth: 3,
            });
            edges.push({
              id: `note-child-${child.id}`,
              from: parentNode.id,
              to: `note-${child.id}`,
              color: focusedCategory.color,
              width: 1.8,
              kind: "twig",
            });
          });
        }
      }
    }

    const visibleIds = new Set(nodes.filter((n) => n.noteId).map((n) => n.noteId!));
    notes.forEach((note) => {
      if (!visibleIds.has(note.id)) return;
      note.linkedNoteIds.forEach((linkedId) => {
        if (!visibleIds.has(linkedId) || note.id > linkedId) return;
        edges.push({
          id: `link-${note.id}-${linkedId}`,
          from: `note-${note.id}`,
          to: `note-${linkedId}`,
          color: "var(--muted-foreground)",
          width: 1,
          kind: "link",
        });
      });
    });

    return { nodes, edges };
  }, [brainName, categories, childNotes, focusedCategoryId, focusedNote, focusedNoteId, notes, rootNotesByCategory, size.h, size.w]);

  const nodeMap = useMemo(() => new Map(layout.nodes.map((n) => [n.id, n])), [layout.nodes]);

  const resetFocus = useCallback(() => {
    setFocusedCategoryId(null);
    setFocusedNoteId(null);
    setSelectedNoteId(null);
    setPan({ x: 0, y: 0 });
    setZoom(1);
  }, [setSelectedNoteId]);

  const focusCategory = useCallback((categoryId: string) => {
    setFocusedCategoryId(categoryId);
    setFocusedNoteId(null);
    setSelectedNoteId(null);
    setZoom(1.04);
    setPan({ x: 0, y: 0 });
  }, [setSelectedNoteId]);

  const focusNote = useCallback((noteId: string, x: number, y: number) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    setFocusedCategoryId(note.categoryId);
    setFocusedNoteId(noteId);
    setSelectedNoteId(noteId);
    setOpenPostIt({ noteId, x, y });
  }, [notes, setSelectedNoteId]);

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((cat) => {
      if (cat.name.toLowerCase().includes(q)) return true;
      return notes.some((n) => n.categoryId === cat.id && n.title.toLowerCase().includes(q));
    });
  }, [categories, notes, query]);

  const selectedCategory = categories.find((c) => c.id === focusedCategoryId) ?? null;
  const selectedNote = notes.find((n) => n.id === selectedNoteId) ?? null;

  return (
    <div className="h-full w-full bg-background text-foreground overflow-hidden flex">
      {/* LEFT: navigation, intentionally quiet so the tree remains primary */}
      <aside className="hidden lg:flex w-[244px] shrink-0 border-r border-border/60 bg-background/92 backdrop-blur-xl flex-col z-30">
        <div className="px-4 pt-5 pb-3">
          <div className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground mb-1">Exobrain</div>
          <div className="font-semibold text-[15px] truncate">{brainName || "Mi cerebro"}</div>
        </div>
        <div className="px-3 pb-3">
          <div className="h-9 rounded-xl border border-border/70 bg-muted/25 flex items-center gap-2 px-3">
            <Search size={14} className="text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar rama o nota"
              className="w-full bg-transparent outline-none text-sm placeholder:text-muted-foreground/60"
            />
          </div>
        </div>
        <button
          onClick={resetFocus}
          className={`mx-3 mb-2 h-9 rounded-xl px-3 flex items-center gap-2 text-sm transition-colors ${!focusedCategoryId ? "bg-muted font-medium" : "hover:bg-muted/60 text-muted-foreground"}`}
        >
          <Home size={15} /> Árbol completo
        </button>
        <div className="px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Ramas</div>
        <div className="px-2 overflow-y-auto">
          {filteredCategories.map((cat) => {
            const count = notes.filter((n) => n.categoryId === cat.id).length;
            const active = focusedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => focusCategory(cat.id)}
                className={`w-full min-h-10 rounded-xl px-3 flex items-center gap-2 text-left text-sm transition-colors ${active ? "bg-muted font-medium" : "hover:bg-muted/50"}`}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: `hsl(${cat.color})` }} />
                <span className="truncate flex-1">{cat.icon ? `${cat.icon} ` : ""}{cat.name}</span>
                <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* CENTER: tree */}
      <main ref={canvasRef} className="relative flex-1 min-w-0 overflow-hidden bg-background">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(circle at 50% 52%, hsl(var(--muted) / .22), transparent 34%), linear-gradient(to bottom, hsl(var(--background)), hsl(var(--background)))",
          }}
        />

        <div className="absolute top-4 left-4 lg:left-5 z-30 flex items-center gap-2">
          {focusedCategoryId && (
            <button onClick={resetFocus} className="h-9 px-3 rounded-xl border border-border/70 bg-background/85 backdrop-blur-md shadow-sm text-sm flex items-center gap-2">
              <Home size={14} /> Todo
            </button>
          )}
          {selectedCategory && (
            <div className="h-9 px-3 rounded-xl border border-border/70 bg-background/85 backdrop-blur-md shadow-sm text-sm flex items-center gap-2 max-w-[46vw]">
              <span className="w-2 h-2 rounded-full" style={{ background: `hsl(${selectedCategory.color})` }} />
              <span className="truncate">{selectedCategory.name}</span>
              {selectedNote && <><ChevronRight size={13} className="text-muted-foreground" /><span className="truncate text-muted-foreground">{selectedNote.title}</span></>}
            </div>
          )}
        </div>

        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 rounded-2xl border border-border/70 bg-background/88 backdrop-blur-xl shadow-lg p-1.5">
          <button onClick={() => setZoom((z) => clamp(z - 0.12, 0.72, 1.7))} className="w-9 h-9 rounded-xl hover:bg-muted flex items-center justify-center"><Minus size={16} /></button>
          <button onClick={resetFocus} className="h-9 px-3 rounded-xl hover:bg-muted text-xs text-muted-foreground tabular-nums">{Math.round(zoom * 100)}%</button>
          <button onClick={() => setZoom((z) => clamp(z + 0.12, 0.72, 1.7))} className="w-9 h-9 rounded-xl hover:bg-muted flex items-center justify-center"><Plus size={16} /></button>
        </div>

        <div
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          onWheel={(e) => {
            e.preventDefault();
            setZoom((z) => clamp(z * (e.deltaY > 0 ? 0.92 : 1.08), 0.72, 1.7));
          }}
          onPointerDown={(e) => {
            if ((e.target as HTMLElement).closest("[data-tree-node]")) return;
            dragRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!dragRef.current) return;
            setPan({
              x: dragRef.current.panX + e.clientX - dragRef.current.x,
              y: dragRef.current.panY + e.clientY - dragRef.current.y,
            });
          }}
          onPointerUp={() => { dragRef.current = null; }}
          onDoubleClick={resetFocus}
        >
          <motion.div
            className="absolute inset-0"
            animate={{ x: pan.x, y: pan.y, scale: zoom }}
            transition={{ type: "spring", stiffness: 180, damping: 28 }}
            style={{ transformOrigin: "50% 52%" }}
          >
            <svg className="absolute inset-0 w-full h-full overflow-visible">
              <defs>
                <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>

              {layout.edges.map((edge) => {
                const from = nodeMap.get(edge.from);
                const to = nodeMap.get(edge.to);
                if (!from || !to) return null;
                const edgeCatId = to.categoryId || from.categoryId;
                const active = !focusedCategoryId || edgeCatId === focusedCategoryId;
                const isLink = edge.kind === "link";
                return (
                  <motion.path
                    key={edge.id}
                    d={organicPath(from, to, edge.kind === "branch" ? 0.38 : 0.22)}
                    fill="none"
                    stroke={isLink ? "hsl(var(--muted-foreground))" : `hsl(${edge.color})`}
                    strokeWidth={edge.width}
                    strokeLinecap="round"
                    strokeDasharray={isLink ? "3 8" : undefined}
                    initial={false}
                    animate={{
                      opacity: isLink ? 0.22 : active ? (edge.kind === "branch" ? 0.68 : 0.52) : 0.08,
                    }}
                    transition={{ duration: 0.32 }}
                  />
                );
              })}
            </svg>

            <AnimatePresence mode="popLayout">
              {layout.nodes.map((node) => {
                const isRoot = node.kind === "root";
                const isCategory = node.kind === "category";
                const isNote = node.kind === "note";
                const categoryActive = !focusedCategoryId || node.categoryId === focusedCategoryId || isRoot;
                const noteActive = !focusedNoteId || node.noteId === focusedNoteId || node.parentId === focusedNoteId || node.kind !== "note";
                const active = categoryActive && noteActive;
                const selected = node.noteId === focusedNoteId || node.categoryId === focusedCategoryId && isCategory;

                return (
                  <motion.button
                    key={node.id}
                    data-tree-node
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{
                      left: node.x,
                      top: node.y,
                      opacity: active ? 1 : 0.16,
                      scale: selected ? 1.06 : active ? 1 : 0.9,
                      filter: active ? "blur(0px)" : "blur(0.8px)",
                    }}
                    exit={{ opacity: 0, scale: 0.82 }}
                    transition={{ type: "spring", stiffness: 260, damping: 28 }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 text-left group"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isRoot) return resetFocus();
                      if (isCategory && node.categoryId) return focusCategory(node.categoryId);
                      if (isNote && node.noteId) return focusNote(node.noteId, e.clientX, e.clientY);
                    }}
                  >
                    {isRoot && (
                      <div className="flex flex-col items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-foreground/75 shadow-[0_0_0_8px_hsl(var(--muted)/.4)]" />
                        <span className="text-xs font-medium tracking-wide text-muted-foreground">{node.label}</span>
                      </div>
                    )}

                    {isCategory && (
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-[0_0_0_5px_hsl(var(--background))]"
                          style={{ backgroundColor: `hsl(${node.color})`, filter: selected ? "url(#softGlow)" : undefined }}
                        />
                        <span className={`rounded-lg border px-2.5 py-1.5 text-[13px] whitespace-nowrap backdrop-blur-md shadow-sm transition-colors ${selected ? "bg-background border-foreground/20 font-semibold" : "bg-background/78 border-border/60"}`}>
                          {categories.find((c) => c.id === node.categoryId)?.icon} {node.label}
                        </span>
                      </div>
                    )}

                    {isNote && (
                      <div className="flex items-center gap-2 max-w-[190px]">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: `hsl(${node.color})` }}
                        />
                        <span className={`text-[12px] leading-snug px-2 py-1 rounded-md border backdrop-blur-sm truncate max-w-[170px] ${selected ? "bg-background border-foreground/20 font-medium" : "bg-background/72 border-border/50 text-foreground/80"}`}>
                          {notes.find((n) => n.id === node.noteId)?.noteType === "checklist" && <ListChecks size={12} className="inline mr-1 -mt-0.5" />}
                          {node.label}
                        </span>
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </motion.div>
        </div>

        {!focusedCategoryId && (
          <div className="absolute top-[46%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none text-center max-w-[420px] px-6">
            <Sparkles size={16} className="mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground/55">Selecciona una rama para acercarte. El resto del árbol queda en segundo plano sin desaparecer.</p>
          </div>
        )}
      </main>

      {/* RIGHT: context, not a second navigation system */}
      <aside className="hidden xl:flex w-[300px] shrink-0 border-l border-border/60 bg-background/94 backdrop-blur-xl flex-col z-30">
        <div className="h-14 px-4 border-b border-border/60 flex items-center justify-between">
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Contexto</span>
          {(selectedCategory || selectedNote) && <button onClick={resetFocus} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"><X size={15} /></button>}
        </div>

        {!selectedCategory && !selectedNote && (
          <div className="p-5 text-sm text-muted-foreground leading-relaxed">Selecciona una rama. Aquí aparecerá su contexto sin tapar el árbol.</div>
        )}

        {selectedCategory && !selectedNote && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-3 h-3 rounded-full" style={{ background: `hsl(${selectedCategory.color})` }} />
              <h2 className="font-semibold">{selectedCategory.icon} {selectedCategory.name}</h2>
            </div>
            <div className="text-sm text-muted-foreground mb-5">{notes.filter((n) => n.categoryId === selectedCategory.id).length} notas en esta rama</div>
            <div className="space-y-1.5">
              {(rootNotesByCategory.get(selectedCategory.id) ?? []).slice(0, 8).map((note) => (
                <button key={note.id} onClick={(e) => focusNote(note.id, e.clientX, e.clientY)} className="w-full rounded-lg px-2.5 py-2 text-left text-sm hover:bg-muted/60 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: `hsl(${selectedCategory.color})` }} />
                  <span className="truncate">{note.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedNote && (
          <div className="p-5 flex-1 overflow-y-auto">
            <div className="text-xs text-muted-foreground mb-2">{selectedCategory?.name}</div>
            <h2 className="font-semibold text-base leading-snug mb-3">{selectedNote.title}</h2>
            <div className="text-sm text-muted-foreground leading-relaxed line-clamp-6" dangerouslySetInnerHTML={{ __html: selectedNote.content || "Sin contenido" }} />
            <button
              onClick={(e) => setOpenPostIt({ noteId: selectedNote.id, x: e.clientX - 420, y: e.clientY - 120 })}
              className="mt-5 h-9 px-3 rounded-xl bg-foreground text-background text-sm font-medium"
            >
              Abrir nota
            </button>
          </div>
        )}
      </aside>

      {openPostIt && (
        <NotePostIt
          noteId={openPostIt.noteId}
          position={{ x: clamp(openPostIt.x, 24, Math.max(24, window.innerWidth - 460)), y: clamp(openPostIt.y, 70, Math.max(70, window.innerHeight - 520)) }}
          onClose={() => setOpenPostIt(null)}
        />
      )}
    </div>
  );
};

export default GraphViewV2;
