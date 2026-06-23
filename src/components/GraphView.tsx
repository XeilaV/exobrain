import { useNotes } from "@/contexts/NotesContext";
import { useAuth } from "@/hooks/useAuth";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Pencil, Palette, FileText, ListChecks, Pencil as Rename, User as UserIcon, LogOut, LogIn, Brain, TreePine } from "lucide-react";
import NotePostIt from "./NotePostIt";
import BrainNameDialog from "./BrainNameDialog";
import ColorPicker from "./ColorPicker";
import { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from "@/lib/categoryColors";
import { Note } from "@/types/notes";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type NodeType = "root" | "category" | "note";

interface NodePos {
  id: string;
  x: number;
  y: number;
  type: NodeType;
  label: string;
  color: string;          // hsl string
  categoryId?: string;
  noteId?: string;
  parentNoteId?: string | null;
  noteType?: "text" | "checklist";
  hasChildren?: boolean;
  isCollapsed?: boolean;
  depth: number;
}

interface Edge { from: string; to: string }

const ROOT_R = 30;
const CAT_R = 22;
const NOTE_R = 12;
const LEVEL_GAP = 80;     // vertical gap between levels
const SIBLING_GAP = 60;   // horizontal gap between siblings (min)
const EDGE_MARGIN = 24;   // min distance from viewport edges

const GraphView = () => {
  const {
    notes, categories, addNote, addCategory, deleteNote, deleteCategory,
    updateCategory, linkNotes, unlinkNotes, toggleNoteCollapsed, toggleCategoryCollapsed,
    setSelectedNoteId, brainName, setBrainName, onboarded, setOnboarded, loading,
  } = useNotes();

  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [openPostIt, setOpenPostIt] = useState<{ noteId: string; x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [colorPickerCat, setColorPickerCat] = useState<{ id: string; x: number; y: number } | null>(null);
  const [editingCat, setEditingCat] = useState<{ id: string; name: string } | null>(null);
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📌");
  const [newCatColor, setNewCatColor] = useState(DEFAULT_CATEGORY_COLOR);
  const [showBrainDialog, setShowBrainDialog] = useState(false);
  const [linkingNoteId, setLinkingNoteId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const didDrag = useRef(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Drag offsets per node id (session-local)
  const [offsets, setOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
  const dragState = useRef<{ nodeId: string; startX: number; startY: number; baseDx: number; baseDy: number } | null>(null);

  // Hidden category filter
  const [hiddenCategoryIds, setHiddenCategoryIds] = useState<Set<string>>(new Set());
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const visibleCategories = useMemo(
    () => categories.filter(c => !hiddenCategoryIds.has(c.id)),
    [categories, hiddenCategoryIds],
  );

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // First-time onboarding modal
  useEffect(() => {
    if (!loading && !onboarded) setShowBrainDialog(true);
  }, [loading, onboarded]);

  // Build radial tree positions + parent map (for drag propagation)
  const { positions, edges, parentMap } = useMemo(() => {
    const pos: NodePos[] = [];
    const eds: Edge[] = [];
    const parent: Record<string, string> = {}; // childId -> parentId
    const W = size.w;
    const H = size.h;
    const isMobile = W < 640;

    if (categories.length === 0) return { positions: pos, edges: eds, parentMap: parent };

    // Radii per depth (distance from parent)
    const radiusForDepth = (depth: number) => {
      const base = depth === 0 ? 130 : depth === 1 ? 100 : depth === 2 ? 85 : 75;
      return base * (isMobile ? 0.78 : 1);
    };

    // Recursive note placement. `outwardAngle` is the direction (in radians,
    // screen coords with y-down) from the parent to this note. The note's own
    // children spread in a semicircle continuing outward along that angle.
    const placeNoteSubtree = (
      note: Note,
      color: string,
      parentX: number,
      parentY: number,
      outwardAngle: number,
      depth: number,
    ) => {
      const R = radiusForDepth(depth);
      const x = parentX + R * Math.cos(outwardAngle);
      const y = parentY + R * Math.sin(outwardAngle);

      const children = notes.filter(n => n.parentNoteId === note.id);
      const expanded = !note.isCollapsed && children.length > 0;

      pos.push({
        id: `note-${note.id}`,
        x, y,
        type: "note", label: note.title, color,
        categoryId: note.categoryId, noteId: note.id,
        parentNoteId: note.parentNoteId,
        noteType: note.noteType,
        hasChildren: children.length > 0,
        isCollapsed: !expanded,
        depth,
      });

      if (!expanded) return;

      const count = children.length;
      // Spread grows with child count, capped at ~160°.
      const spread = Math.min(Math.PI * 0.9, Math.PI * 0.35 + count * 0.18);
      children.forEach((child, i) => {
        const t = count === 1 ? 0 : (i / (count - 1)) - 0.5; // -0.5..0.5
        const angle = outwardAngle + t * spread;
        eds.push({ from: `note-${note.id}`, to: `note-${child.id}` });
        parent[`note-${child.id}`] = `note-${note.id}`;
        placeNoteSubtree(child, color, x, y, angle, depth + 1);
      });
    };

    // Hub in upper-middle area; root (MyBrain) sits below with a long trunk
    // so the whole tree reads as centered on screen.
    const hubX = W / 2;
    const trunkLength = isMobile ? 260 : 220;
    const hubY = isMobile ? Math.round(H * 0.44) : Math.round(H * 0.48);
    const rootY = hubY + trunkLength;

    const catCount = visibleCategories.length;
    // Minimum center-to-center distance between adjacent category nodes so
    // circles + labels don't overlap. Canopy radius grows with category count.
    const minCatSpacing = isMobile ? 72 : 86;
    const baseCatRadius = isMobile ? 110 : 150;
    let catRadius = baseCatRadius;
    if (catCount >= 2) {
      // Adjacent step on a semicircle (angles span PI across catCount-1 gaps).
      const step = Math.PI / (catCount - 1);
      const requiredRadius = minCatSpacing / (2 * Math.sin(step / 2));
      catRadius = Math.max(baseCatRadius, requiredRadius);
    }
    // Required radius to preserve in fit-to-viewport scaling (avoid overlap).
    const minCatRadius = catCount >= 2
      ? minCatSpacing / (2 * Math.sin((Math.PI / (catCount - 1)) / 2))
      : 0;

    visibleCategories.forEach((cat, i) => {
      // Angle range: -PI (left) to 0 (right), passing through -PI/2 (up).
      const t = catCount === 1 ? 0.5 : i / (catCount - 1);
      const catAngle = -Math.PI + t * Math.PI;
      const cx = hubX + catRadius * Math.cos(catAngle);
      const cy = hubY + catRadius * Math.sin(catAngle);

      const rootNotes = notes.filter(n => n.categoryId === cat.id && !n.parentNoteId);
      const catExpanded = !cat.isCollapsed && rootNotes.length > 0;

      pos.push({
        id: `cat-${cat.id}`,
        x: cx, y: cy,
        type: "category", label: cat.name, color: cat.color,
        categoryId: cat.id, depth: 0,
        hasChildren: rootNotes.length > 0,
        isCollapsed: cat.isCollapsed,
      });
      parent[`cat-${cat.id}`] = "hub";
      eds.push({ from: "hub", to: `cat-${cat.id}` });

      if (catExpanded) {
        const rnCount = rootNotes.length;
        const spread = Math.min(Math.PI * 0.95, Math.PI * 0.4 + rnCount * 0.18);
        rootNotes.forEach((rn, i2) => {
          const t2 = rnCount === 1 ? 0 : (i2 / (rnCount - 1)) - 0.5;
          const angle = catAngle + t2 * spread;
          eds.push({ from: `cat-${cat.id}`, to: `note-${rn.id}` });
          parent[`note-${rn.id}`] = `cat-${cat.id}`;
          placeNoteSubtree(rn, cat.color, cx, cy, angle, 0);
        });
      }
    });

    // Hub node
    pos.push({
      id: "hub",
      x: hubX, y: hubY,
      type: "category", label: "", color: "30 8% 30%", depth: -1,
    });
    parent["hub"] = "root";

    pos.push({
      id: "root",
      x: hubX, y: rootY,
      type: "root", label: brainName || "ExoBrain",
      color: "30 8% 25%", depth: -1,
    });
    eds.push({ from: "root", to: "hub" });

    // Fit-to-viewport: scale around the hub if the tree overflows, then
    // shift vertically so the full bounding box is centered on screen.
    const topMargin = isMobile ? 50 : 60;
    const bottomMargin = isMobile ? 110 : 80; // reserve space for floating chat
    const sideMargin = isMobile ? 30 : 40;
    const minX = Math.min(...pos.map(p => p.x));
    const maxX = Math.max(...pos.map(p => p.x));
    const minY = Math.min(...pos.map(p => p.y));
    const maxY = Math.max(...pos.map(p => p.y));

    const upScale = (hubY - topMargin) / Math.max(1, hubY - minY);
    const downScale = (H - bottomMargin - hubY) / Math.max(1, maxY - hubY);
    const leftScale = (hubX - sideMargin) / Math.max(1, hubX - minX);
    const rightScale = (W - hubX - sideMargin) / Math.max(1, maxX - hubX);
    const rawScale = Math.min(1, upScale, downScale, leftScale, rightScale);
    // Don't shrink so much that category nodes start overlapping.
    const minScaleForCanopy = catRadius > 0 ? minCatRadius / catRadius : 0;
    const scale = Math.max(rawScale, Math.min(1, minScaleForCanopy));

    if (scale < 1) {
      pos.forEach(p => {
        p.x = hubX + (p.x - hubX) * scale;
        p.y = hubY + (p.y - hubY) * scale;
      });
    }

    // Vertical centering: shift everything so the bbox is centered between
    // topMargin and (H - bottomMargin).
    const finalMinY = Math.min(...pos.map(p => p.y));
    const finalMaxY = Math.max(...pos.map(p => p.y));
    const availableTop = topMargin;
    const availableBottom = H - bottomMargin;
    const desiredCenter = (availableTop + availableBottom) / 2;
    const currentCenter = (finalMinY + finalMaxY) / 2;
    const shiftY = desiredCenter - currentCenter;
    if (Math.abs(shiftY) > 0.5) {
      pos.forEach(p => { p.y += shiftY; });
    }

    return { positions: pos, edges: eds, parentMap: parent };
  }, [notes, categories, visibleCategories, brainName, size.w, size.h]);


  // Apply drag offsets — propagate ancestor offsets to descendants so dragging a
  // node moves its whole subtree along with it.
  const positionsWithOffsets = useMemo(() => {
    const accumulated: Record<string, { dx: number; dy: number }> = {};
    const compute = (id: string): { dx: number; dy: number } => {
      if (accumulated[id]) return accumulated[id];
      const own = offsets[id] || { dx: 0, dy: 0 };
      const parentId = parentMap[id];
      if (!parentId) {
        accumulated[id] = own;
        return own;
      }
      const par = compute(parentId);
      const total = { dx: own.dx + par.dx, dy: own.dy + par.dy };
      accumulated[id] = total;
      return total;
    };
    return positions.map(p => {
      const off = compute(p.id);
      const r = p.type === "root" ? ROOT_R : p.id === "hub" ? 6 : p.type === "category" ? CAT_R : NOTE_R;
      // Clamp so the node circle never leaves the viewport.
      const minX = r + EDGE_MARGIN;
      const maxX = size.w - r - EDGE_MARGIN;
      const minY = r + EDGE_MARGIN;
      const maxY = size.h - r - EDGE_MARGIN;
      const nx = Math.min(maxX, Math.max(minX, p.x + off.dx));
      const ny = Math.min(maxY, Math.max(minY, p.y + off.dy));
      return nx !== p.x || ny !== p.y ? { ...p, x: nx, y: ny } : p;
    });
  }, [positions, offsets, parentMap, size.w, size.h]);


  const getPos = (id: string) => positionsWithOffsets.find(p => p.id === id);

  // Long-press handlers
  const startLongPress = useCallback((nodeId: string, clientX: number, clientY: number) => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      // If linking and this is a note
      if (linkingNoteId && nodeId.startsWith("note-")) {
        const targetId = nodeId.replace("note-", "");
        if (targetId !== linkingNoteId) {
          setConfirmDialog({
            message: "¿Enlazar estas dos notas?",
            onConfirm: () => {
              linkNotes(linkingNoteId, targetId);
              setLinkingNoteId(null);
              setConfirmDialog(null);
              toast.success("Notas enlazadas");
            },
          });
        }
        return;
      }
      setContextMenu({ nodeId, x: clientX, y: clientY });
    }, 550);
  }, [linkingNoteId, linkNotes]);

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }, []);

  // Drag pointer handlers (window-level)
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const ds = dragState.current;
      if (!ds) return;
      const rawDx = e.clientX - ds.startX;
      const rawDy = e.clientY - ds.startY;
      if (!didDrag.current && Math.hypot(rawDx, rawDy) > 5) {
        didDrag.current = true;
        cancelLongPress();
      }
      if (didDrag.current) {
        const s = viewScaleRef.current || 1;
        const dx = rawDx / s;
        const dy = rawDy / s;
        setOffsets(prev => ({
          ...prev,
          [ds.nodeId]: { dx: ds.baseDx + dx, dy: ds.baseDy + dy },
        }));
      }
    };
    const onUp = () => { dragState.current = null; };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [cancelLongPress]);

  // Click handling with double-click detection
  const handleNodeClick = useCallback((nodeId: string, clientX: number, clientY: number) => {
    if (didDrag.current) { didDrag.current = false; return; }
    if (didLongPress.current) { didLongPress.current = false; return; }
    if (contextMenu) { setContextMenu(null); return; }

    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      // Double click
      if (nodeId.startsWith("note-")) {
        const nId = nodeId.replace("note-", "");
        const note = notes.find(n => n.id === nId);
        const hasChildren = notes.some(n => n.parentNoteId === nId);
        if (hasChildren && note) {
          const wasCollapsed = note.isCollapsed;
          toggleNoteCollapsed(nId);
          // If we are EXPANDING, zoom into this subtree. If collapsing, clear focus.
          setFocusedNodeId(wasCollapsed ? nodeId : null);
        }
      } else if (nodeId.startsWith("cat-")) {
        const cId = nodeId.replace("cat-", "");
        const cat = categories.find(c => c.id === cId);
        const hasChildren = notes.some(n => n.categoryId === cId && !n.parentNoteId);
        if (hasChildren && cat) {
          const wasCollapsed = cat.isCollapsed;
          toggleCategoryCollapsed(cId);
          setFocusedNodeId(wasCollapsed ? nodeId : null);
        }
      } else if (nodeId === "root") {
        setShowBrainDialog(true);
      }
      return;
    }
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      if (nodeId.startsWith("note-")) {
        const nId = nodeId.replace("note-", "");
        // If linking via single click on second note
        if (linkingNoteId && linkingNoteId !== nId) {
          setConfirmDialog({
            message: "¿Enlazar estas dos notas?",
            onConfirm: () => {
              linkNotes(linkingNoteId, nId);
              setLinkingNoteId(null);
              setConfirmDialog(null);
              toast.success("Notas enlazadas");
            },
          });
          return;
        }
        setOpenPostIt({ noteId: nId, x: clientX, y: clientY });
      } else if (nodeId === "root") {
        // single click on root opens rename
        setShowBrainDialog(true);
      }
      // categories: single click does nothing (use long-press menu)
    }, 240);
  }, [contextMenu, notes, categories, toggleNoteCollapsed, toggleCategoryCollapsed, linkingNoteId, linkNotes]);

  const handleAddCategory = () => {
    if (newCatName.trim()) {
      addCategory(newCatName.trim(), newCatIcon, newCatColor, null);
      setNewCatName(""); setNewCatIcon("📌"); setNewCatColor(DEFAULT_CATEGORY_COLOR);
      setIsAddingCat(false);
    }
  };

  // Helper: bezier path between two nodes
  const pathBetween = (x1: number, y1: number, x2: number, y2: number) => {
    const midY = (y1 + y2) / 2;
    return `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;
  };

  // Link edges (horizontal between notes)
  const linkEdges = useMemo(() => {
    const out: { from: string; to: string }[] = [];
    const ids = new Set(positions.map(p => p.id));
    notes.forEach(n => {
      const fromKey = `note-${n.id}`;
      if (!ids.has(fromKey)) return;
      n.linkedNoteIds.forEach(lid => {
        const toKey = `note-${lid}`;
        if (ids.has(toKey) && n.id < lid) out.push({ from: fromKey, to: toKey });
      });
    });
    return out;
  }, [notes, positions]);

  // Compute zoom-to-subtree transform when a node is focused.
  const viewTransform = useMemo(() => {
    if (!focusedNodeId) return { transform: "translate(0px, 0px) scale(1)", scale: 1 };
    const subtree = new Set<string>();
    const collect = (id: string) => {
      if (subtree.has(id)) return;
      subtree.add(id);
      positionsWithOffsets.forEach(p => {
        if (parentMap[p.id] === id) collect(p.id);
      });
    };
    collect(focusedNodeId);
    const pts = positionsWithOffsets.filter(p => subtree.has(p.id));
    if (pts.length < 2) return { transform: "translate(0px, 0px) scale(1)", scale: 1 };
    const pad = size.w < 640 ? 70 : 90;
    const minX = Math.min(...pts.map(p => p.x)) - pad;
    const maxX = Math.max(...pts.map(p => p.x)) + pad;
    const minY = Math.min(...pts.map(p => p.y)) - pad;
    const maxY = Math.max(...pts.map(p => p.y)) + pad;
    const bw = Math.max(1, maxX - minX);
    const bh = Math.max(1, maxY - minY);
    const scale = Math.min(size.w / bw, size.h / bh, 2.6);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const tx = size.w / 2 - cx * scale;
    const ty = size.h / 2 - cy * scale;
    return { transform: `translate(${tx}px, ${ty}px) scale(${scale})`, scale };
  }, [focusedNodeId, positionsWithOffsets, parentMap, size.w, size.h]);

  const viewScaleRef = useRef(1);
  useEffect(() => { viewScaleRef.current = viewTransform.scale; }, [viewTransform.scale]);


  return (
    <div
      ref={containerRef}
      className="flex-1 h-full w-full bg-background overflow-hidden relative select-none"
      onClick={() => {
        if (openPostIt) setOpenPostIt(null);
        if (contextMenu) setContextMenu(null);
        if (colorPickerCat) setColorPickerCat(null);
        if (linkingNoteId) { setLinkingNoteId(null); toast.info("Enlace cancelado"); }
      }}
    >
      {/* Linking indicator */}
      {linkingNoteId && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 bg-primary text-primary-foreground text-xs font-body px-3 py-1.5 rounded-full shadow-lg animate-pulse">
          Selecciona otra nota para enlazar
        </div>
      )}

      {/* Zoomable world: SVG branches + nodes */}
      <div
        className="absolute inset-0"
        style={{
          transform: viewTransform.transform,
          transformOrigin: "0 0",
          transition: "transform 450ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
      {/* SVG branches */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
        {edges.map((edge, idx) => {
          const from = getPos(edge.from);
          const to = getPos(edge.to);
          if (!from || !to) return null;
          // Use child color for the branch
          const stroke = `hsl(${to.color})`;
          return (
            <path
              key={`be-${idx}`}
              d={pathBetween(from.x, from.y, to.x, to.y)}
              stroke={stroke}
              strokeWidth={2}
              strokeOpacity={0.5}
              fill="none"
            />
          );
        })}
        {linkEdges.map((edge, idx) => {
          const from = getPos(edge.from);
          const to = getPos(edge.to);
          if (!from || !to) return null;
          return (
            <line
              key={`le-${idx}`}
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke="hsl(var(--muted-foreground) / 0.4)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />
          );
        })}
      </svg>

      {/* Nodes */}
      <AnimatePresence>
        {positionsWithOffsets.map(node => {
          const isRoot = node.type === "root";
          const isHub = node.id === "hub";
          const isCat = node.type === "category" && !isHub;
          const r = isRoot ? ROOT_R : isHub ? 6 : isCat ? CAT_R : NOTE_R;
          const isLinkSource = linkingNoteId && node.noteId === linkingNoteId;
          const showCollapsedDot =
            (node.type === "note" || isCat) &&
            node.hasChildren && node.isCollapsed;
          const cat = isCat ? categories.find(c => c.id === node.categoryId) : null;

          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1, left: node.x - r, top: node.y - r }}
              exit={{ opacity: 0, scale: 0 }}
              transition={
                dragState.current?.nodeId === node.id
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 300, damping: 25 }
              }
              className="absolute flex flex-col items-center cursor-grab active:cursor-grabbing touch-none"
              style={{ width: r * 2, zIndex: isRoot ? 6 : isCat ? 4 : 2 }}
              onPointerDown={e => {
                e.stopPropagation();
                didDrag.current = false;
                const cur = offsets[node.id] || { dx: 0, dy: 0 };
                dragState.current = {
                  nodeId: node.id,
                  startX: e.clientX,
                  startY: e.clientY,
                  baseDx: cur.dx,
                  baseDy: cur.dy,
                };
                startLongPress(node.id, e.clientX, e.clientY);
              }}
              onPointerUp={cancelLongPress}
              onPointerLeave={cancelLongPress}
              onClick={e => { e.stopPropagation(); handleNodeClick(node.id, e.clientX, e.clientY); }}
            >
              {/* Label below circle for root + category (tree is inverted) */}
              {(isRoot || isCat) && (
                <span
                  className={`absolute whitespace-nowrap ${isRoot ? "font-display text-base font-bold" : "font-display text-xs font-semibold"} text-foreground`}
                  style={{ top: r * 2 + 6, left: '50%', transform: 'translateX(-50%)' }}
                >
                  {isCat && cat ? `${cat.icon} ` : ""}{node.label}
                </span>
              )}

              {/* Circle */}
              <div
                className={`rounded-full flex items-center justify-center shadow-md border-2 transition-all ${
                  isLinkSource ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
                }`}
                style={{
                  width: r * 2,
                  height: r * 2,
                  backgroundColor: isRoot ? `hsl(var(--card))` : `hsl(${node.color})`,
                  borderColor: isRoot ? `hsl(var(--foreground))` : `hsl(${node.color})`,
                }}
              >
                {isRoot && <span className="text-2xl">🌳</span>}
                {showCollapsedDot && (
                  <span
                    className="rounded-full"
                    style={{ width: 6, height: 6, backgroundColor: "hsl(var(--background))" }}
                  />
                )}
                {node.type === "note" && !showCollapsedDot && (
                  <span className="text-[10px]" style={{ color: "hsl(var(--background))" }}>
                    {node.noteType === "checklist" ? "☑" : ""}
                  </span>
                )}
              </div>

              {/* Label above circle for notes (children grow upward) */}
              {node.type === "note" && (
                <span
                  className="absolute font-body text-[9px] leading-tight text-foreground/80 whitespace-nowrap overflow-hidden text-ellipsis text-center pointer-events-none block"
                  style={{ bottom: r * 2 + 3, left: '50%', transform: 'translateX(-50%)', width: 54 }}
                >
                  {node.label}
                </span>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-50 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[170px]"
            style={{ left: Math.min(contextMenu.x, size.w - 180), top: Math.min(contextMenu.y, size.h - 200) }}
            onClick={e => e.stopPropagation()}
          >
            {contextMenu.nodeId === "root" && (
              <button
                onClick={() => { setShowBrainDialog(true); setContextMenu(null); }}
                className="w-full text-left text-xs px-3 py-2 hover:bg-muted flex items-center gap-2 font-body text-foreground"
              >
                <Rename size={12} />Renombrar cerebro
              </button>
            )}

            {contextMenu.nodeId.startsWith("cat-") && (() => {
              const catId = contextMenu.nodeId.replace("cat-", "");
              return (
                <>
                  <button
                    onClick={async () => { await addNote(catId, null, "text"); setContextMenu(null); }}
                    className="w-full text-left text-xs px-3 py-2 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                  >
                    <FileText size={12} />Añadir nota
                  </button>
                  <button
                    onClick={async () => { await addNote(catId, null, "checklist"); setContextMenu(null); }}
                    className="w-full text-left text-xs px-3 py-2 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                  >
                    <ListChecks size={12} />Añadir lista
                  </button>
                  <button
                    onClick={() => {
                      const cat = categories.find(c => c.id === catId);
                      if (cat) setEditingCat({ id: catId, name: cat.name });
                      setContextMenu(null);
                    }}
                    className="w-full text-left text-xs px-3 py-2 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                  >
                    <Pencil size={12} />Renombrar tema
                  </button>
                  <button
                    onClick={() => { setColorPickerCat({ id: catId, x: contextMenu.x, y: contextMenu.y }); setContextMenu(null); }}
                    className="w-full text-left text-xs px-3 py-2 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                  >
                    <Palette size={12} />Cambiar color
                  </button>
                  <button
                    onClick={() => {
                      setConfirmDialog({
                        message: "¿Eliminar este tema y sus notas?",
                        onConfirm: () => { deleteCategory(catId); setConfirmDialog(null); },
                      });
                      setContextMenu(null);
                    }}
                    className="w-full text-left text-xs px-3 py-2 hover:bg-destructive/10 flex items-center gap-2 font-body text-destructive"
                  >
                    <Trash2 size={12} />Eliminar tema
                  </button>
                </>
              );
            })()}

            {contextMenu.nodeId.startsWith("note-") && (() => {
              const nId = contextMenu.nodeId.replace("note-", "");
              const note = notes.find(n => n.id === nId);
              if (!note) return null;
              return (
                <>
                  <button
                    onClick={async () => { await addNote(note.categoryId, nId, "text"); setContextMenu(null); }}
                    className="w-full text-left text-xs px-3 py-2 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                  >
                    <FileText size={12} />Añadir hija (texto)
                  </button>
                  <button
                    onClick={async () => { await addNote(note.categoryId, nId, "checklist"); setContextMenu(null); }}
                    className="w-full text-left text-xs px-3 py-2 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                  >
                    <ListChecks size={12} />Añadir hija (lista)
                  </button>
                  <button
                    onClick={() => { setLinkingNoteId(nId); setContextMenu(null); toast.info("Pulsa otra nota para enlazar"); }}
                    className="w-full text-left text-xs px-3 py-2 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                  >
                    🔗 Enlazar con otra nota
                  </button>
                  <button
                    onClick={() => {
                      setConfirmDialog({
                        message: "¿Eliminar esta nota?",
                        onConfirm: () => { deleteNote(nId); setConfirmDialog(null); },
                      });
                      setContextMenu(null);
                    }}
                    className="w-full text-left text-xs px-3 py-2 hover:bg-destructive/10 flex items-center gap-2 font-body text-destructive"
                  >
                    <Trash2 size={12} />Eliminar
                  </button>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Color picker (long-press category) */}
      {colorPickerCat && (
        <div
          className="fixed z-50 bg-card border border-border rounded-lg shadow-xl p-3"
          style={{ left: Math.min(colorPickerCat.x, size.w - 180), top: Math.min(colorPickerCat.y, size.h - 140) }}
          onClick={e => e.stopPropagation()}
        >
          <p className="text-xs font-body text-muted-foreground mb-2">Elige un color</p>
          <ColorPicker
            value={categories.find(c => c.id === colorPickerCat.id)?.color || ""}
            onChange={(color) => { updateCategory(colorPickerCat.id, { color }); setColorPickerCat(null); }}
          />
        </div>
      )}

      {/* Confirm dialog */}
      <AnimatePresence>
        {confirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-background/60 backdrop-blur-sm"
            onClick={e => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="bg-card border border-border rounded-xl shadow-2xl p-5 max-w-[280px] w-full mx-4 space-y-4"
            >
              <p className="text-sm font-body text-foreground text-center">{confirmDialog.message}</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmDialog(null)}
                  className="flex-1 text-xs py-2 rounded-lg bg-muted text-foreground font-body hover:bg-muted/80">
                  Cancelar
                </button>
                <button onClick={confirmDialog.onConfirm}
                  className="flex-1 text-xs py-2 rounded-lg bg-primary text-primary-foreground font-body hover:opacity-90">
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-right controls */}
      <div className="fixed top-3 right-3 z-30 flex gap-2">
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowProfileMenu(v => !v); setShowFilterPanel(false); setIsAddingCat(false); }}
            className="p-2 rounded-lg border border-border bg-card/90 backdrop-blur-sm shadow-sm hover:shadow text-muted-foreground transition-all"
            title={user ? "Perfil" : "Iniciar sesión"}
          >
            <UserIcon size={16} />
          </button>
          {showProfileMenu && (
            <div
              className="absolute right-0 top-11 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[200px]"
              onClick={e => e.stopPropagation()}
            >
              {user ? (
                <>
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-[10px] font-body text-muted-foreground">Sesión</p>
                    <p className="text-xs font-body text-foreground truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => { setShowBrainDialog(true); setShowProfileMenu(false); }}
                    className="w-full text-left text-xs px-3 py-2 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                  >
                    <Brain size={12} />Renombrar tu brain
                  </button>
                  <button
                    onClick={async () => { setShowProfileMenu(false); await signOut(); navigate("/auth"); }}
                    className="w-full text-left text-xs px-3 py-2 hover:bg-destructive/10 flex items-center gap-2 font-body text-destructive"
                  >
                    <LogOut size={12} />Cerrar sesión
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { setShowProfileMenu(false); navigate("/auth"); }}
                  className="w-full text-left text-xs px-3 py-2 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                >
                  <LogIn size={12} />Iniciar sesión
                </button>
              )}
            </div>
          )}
        </div>

        {focusedNodeId && (
          <button
            onClick={(e) => { e.stopPropagation(); setFocusedNodeId(null); }}
            className="p-2 rounded-lg border border-border bg-card/90 backdrop-blur-sm shadow-sm hover:shadow text-primary transition-all animate-in fade-in"
            title="Ver árbol completo"
          >
            <TreePine size={16} />
          </button>
        )}


        <button
          onClick={(e) => { e.stopPropagation(); setShowFilterPanel(v => !v); setIsAddingCat(false); }}
          className={`p-2 rounded-lg border border-border bg-card/90 backdrop-blur-sm shadow-sm hover:shadow transition-all ${
            hiddenCategoryIds.size > 0 ? "text-primary" : "text-muted-foreground"
          }`}
          title="Filtrar temas"
        >
          {/* eye icon via emoji to avoid extra import */}
          <span className="text-sm leading-none">{hiddenCategoryIds.size > 0 ? "🙈" : "👁"}</span>
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setIsAddingCat(true); setShowFilterPanel(false); }}
          className="p-2 rounded-lg border border-border bg-card/90 backdrop-blur-sm shadow-sm hover:shadow text-muted-foreground transition-all"
          title="Nuevo tema"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Filter panel */}
      {showFilterPanel && (
        <div
          className="fixed top-14 right-3 z-30 bg-card border border-border rounded-lg shadow-lg p-3 space-y-2 min-w-[220px] max-h-[60vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-display font-semibold text-foreground">Mostrar temas</p>
            {hiddenCategoryIds.size > 0 && (
              <button
                onClick={() => setHiddenCategoryIds(new Set())}
                className="text-[10px] font-body text-primary hover:underline"
              >
                Mostrar todos
              </button>
            )}
          </div>
          {categories.length === 0 && (
            <p className="text-[11px] font-body text-muted-foreground">No hay temas aún.</p>
          )}
          {categories.map(cat => {
            const hidden = hiddenCategoryIds.has(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setHiddenCategoryIds(prev => {
                    const next = new Set(prev);
                    if (next.has(cat.id)) next.delete(cat.id);
                    else next.add(cat.id);
                    return next;
                  });
                }}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-body text-left transition-colors ${
                  hidden ? "opacity-40 hover:opacity-70" : "hover:bg-muted"
                }`}
              >
                <span
                  className="w-3 h-3 rounded-full border"
                  style={{ backgroundColor: `hsl(${cat.color})`, borderColor: `hsl(${cat.color})` }}
                />
                <span className="flex-1 truncate text-foreground">{cat.icon} {cat.name}</span>
                <span className="text-[10px] text-muted-foreground">{hidden ? "oculto" : "visible"}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Add category panel */}
      {isAddingCat && (
        <div
          className="fixed top-14 right-3 z-30 bg-card border border-border rounded-lg shadow-lg p-3 space-y-3 min-w-[220px]"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex gap-2">
            <input
              value={newCatIcon} onChange={e => setNewCatIcon(e.target.value)}
              className="w-10 text-center bg-muted rounded text-sm p-1" maxLength={2}
            />
            <input
              value={newCatName} onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleAddCategory()}
              placeholder="Nombre del tema..." autoFocus
              className="flex-1 bg-muted rounded text-xs px-2 py-1 text-foreground outline-none font-body"
            />
          </div>
          <div>
            <p className="text-[10px] font-body text-muted-foreground mb-1">Color</p>
            <ColorPicker value={newCatColor} onChange={setNewCatColor} />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddCategory} className="flex-1 bg-primary text-primary-foreground rounded text-xs py-1.5 font-medium">Añadir</button>
            <button onClick={() => { setIsAddingCat(false); setNewCatName(""); }} className="flex-1 bg-muted text-foreground rounded text-xs py-1.5">Cancelar</button>
          </div>
        </div>
      )}

      {/* Edit category name */}
      {editingCat && (
        <div
          className="fixed top-14 right-3 z-30 bg-card border border-border rounded-lg shadow-lg p-3 space-y-2 min-w-[200px]"
          onClick={e => e.stopPropagation()}
        >
          <input
            value={editingCat.name}
            onChange={e => setEditingCat({ ...editingCat, name: e.target.value })}
            onKeyDown={e => {
              if (e.key === "Enter" && editingCat.name.trim()) {
                updateCategory(editingCat.id, { name: editingCat.name.trim() });
                setEditingCat(null);
              }
            }}
            autoFocus
            className="w-full bg-muted rounded text-xs px-2 py-1.5 text-foreground outline-none font-body"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (editingCat.name.trim()) {
                  updateCategory(editingCat.id, { name: editingCat.name.trim() });
                  setEditingCat(null);
                }
              }}
              className="flex-1 bg-primary text-primary-foreground rounded text-xs py-1.5 font-medium"
            >
              Guardar
            </button>
            <button onClick={() => setEditingCat(null)} className="flex-1 bg-muted text-foreground rounded text-xs py-1.5">Cancelar</button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {categories.length === 0 && !loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-5xl mb-3">🌳</p>
            <p className="font-display text-xl">Empieza tu árbol</p>
            <p className="text-sm mt-1 font-body">Pulsa + para crear el primer tema</p>
          </div>
        </div>
      )}

      {/* Brain name dialog */}
      <BrainNameDialog
        open={showBrainDialog}
        initialName={brainName}
        isFirstTime={!onboarded}
        onSave={(name) => {
          setBrainName(name);
          if (!onboarded) setOnboarded(true);
        }}
        onClose={() => {
          setShowBrainDialog(false);
          if (!onboarded) setOnboarded(true);
        }}
      />

      {/* Post-it overlay */}
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
