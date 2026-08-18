import { useNotes } from "@/contexts/NotesContext";
import { useAuth } from "@/hooks/useAuth";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Pencil,
  Palette,
  FileText,
  ListChecks,
  Pencil as Rename,
  User as UserIcon,
  LogOut,
  LogIn,
  Brain,
  TreePine,
  Sun,
  Moon,
  History,
  Download,
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import NotePostIt from "./NotePostIt";
import BrainNameDialog from "./BrainNameDialog";
import NameInputDialog from "./NameInputDialog";
import CreateNodeDialog from "./CreateNodeDialog";
import ColorPicker from "./ColorPicker";
import EmojiPicker from "./EmojiPicker";
import GoogleCalendarMenuItem from "./GoogleCalendarMenuItem";
import HistoryDialog from "./HistoryDialog";
import ExportDialog from "./ExportDialog";
import { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from "@/lib/categoryColors";
import { Note } from "@/types/notes";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type NodeType = "root" | "category" | "note" | "anchor";

interface NodePos {
  id: string;
  x: number;
  y: number;
  type: NodeType;
  label: string;
  color: string; // hsl string
  categoryId?: string;
  noteId?: string;
  parentNoteId?: string | null;
  noteType?: "text" | "checklist";
  hasChildren?: boolean;
  isCollapsed?: boolean;
  depth: number;
  hidden?: boolean;
  branchRootId?: string;
  zDepth?: number;
}

interface Edge {
  from: string;
  to: string;
}

const ROOT_R = 30;
const CAT_R = 22;
const NOTE_R = 12;

const GraphView = () => {
  const {
    notes,
    categories,
    addNote,
    addCategory,
    deleteNote,
    deleteCategory,
    updateCategory,
    updateNote,
    linkNotes,
    unlinkNotes,
    toggleNoteCollapsed,
    toggleCategoryCollapsed,
    setSelectedNoteId,
    selectedNoteId,
    brainName,
    setBrainName,
    onboarded,
    setOnboarded,
    loading,
  } = useNotes();

  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [openPostIt, setOpenPostIt] = useState<{ noteId: string; x: number; y: number } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const [colorPickerCat, setColorPickerCat] = useState<{ id: string; x: number; y: number } | null>(null);
  const [iconPickerCat, setIconPickerCat] = useState<{ id: string; x: number; y: number } | null>(null);
  const [editingCat, setEditingCat] = useState<{ id: string; name: string } | null>(null);
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatIcon, setNewCatIcon] = useState("📌");
  const [newCatColor, setNewCatColor] = useState(DEFAULT_CATEGORY_COLOR);
  const [showBrainDialog, setShowBrainDialog] = useState(false);
  const [linkingNoteId, setLinkingNoteId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [newNoteDialog, setNewNoteDialog] = useState<{
    categoryId: string;
    parentNoteId: string | null;
    type: "text" | "checklist";
  } | null>(null);
  const [createDialog, setCreateDialog] = useState<{ x: number; y: number } | null>(null);
  const canvasLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasLongPressStart = useRef<{ x: number; y: number } | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [viewZoom, setViewZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);
  const didDrag = useRef(false);
  const didPan = useRef(false);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastExpandedRef = useRef<string | null>(null);
  const lastCollapsedRef = useRef<string | null>(null);
  const didInitialFitRef = useRef(false);
  const previousHasOpenBranchRef = useRef(false);
  const viewZoomRef = useRef(1);

  // Drag offsets per node id (session-local)
  const [offsets, setOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
  const dragState = useRef<{ nodeId: string; startX: number; startY: number; baseDx: number; baseDy: number } | null>(
    null,
  );
  const panState = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchState = useRef<{
    startDist: number;
    startZoom: number;
    startPanX: number;
    startPanY: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  // Hidden category filter
  const [hiddenCategoryIds, setHiddenCategoryIds] = useState<Set<string>>(new Set());
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const visibleCategories = useMemo(
    () => categories.filter((c) => !hiddenCategoryIds.has(c.id)),
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

  useEffect(() => {
    viewZoomRef.current = viewZoom;
  }, [viewZoom]);

  // First-time onboarding modal
  useEffect(() => {
    if (!loading && !onboarded) setShowBrainDialog(true);
  }, [loading, onboarded]);

  // Sync open post-it with selectedNoteId (navigation via links inside post-it)
  useEffect(() => {
    if (!openPostIt) return;
    if (selectedNoteId && selectedNoteId !== openPostIt.noteId) {
      setOpenPostIt((prev) => (prev ? { ...prev, noteId: selectedNoteId } : prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNoteId]);

  // Build a real tree-shaped layout from the NOTE hierarchy.
  // Important: the latest data uses notes with parentNoteId=null as the real
  // first-level branches (Ideas, Reflexiones, Psico, Tareas, etc.). Categories
  // remain useful for color/filtering, but are no longer rendered as giant nodes.
  const { positions, edges, parentMap } = useMemo(() => {
    const pos: NodePos[] = [];
    const eds: Edge[] = [];
    const parent: Record<string, string> = {};
    const W = size.w;
    const H = size.h;
    const isMobile = W < 640;

    const visibleNote = (note: Note) => !hiddenCategoryIds.has(note.categoryId);
    const noteColor = (note: Note) => categories.find((c) => c.id === note.categoryId)?.color || DEFAULT_CATEGORY_COLOR;

    const childrenOf = (noteId: string) => notes.filter((n) => n.parentNoteId === noteId && visibleNote(n));

    const rootNotes = notes
      .filter((n) => !n.parentNoteId && visibleNote(n))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Base + ONE common trunk.
    const rootX = W * 0.5;
    const rootY = isMobile ? H - 92 : H - 72;
    const trunkBottomY = rootY - (isMobile ? 24 : 28);
    const trunkTopY = Math.max(isMobile ? 170 : 190, H * (isMobile ? 0.24 : 0.28));
    const trunkHeight = trunkBottomY - trunkTopY;

    pos.push({
      id: "root",
      x: rootX,
      y: rootY,
      type: "root",
      label: brainName || "ExoBrain",
      color: "252 32% 52%",
      depth: -1,
      zDepth: 0,
    });

    // Invisible points create a single slightly organic trunk. Main branches
    // attach to these points instead of all starting at the Exobrain label.
    const anchorCount = Math.max(7, rootNotes.length + 4);
    let previousId = "root";
    for (let i = 0; i < anchorCount; i++) {
      const t = i / (anchorCount - 1); // bottom -> top
      const y = trunkBottomY - t * trunkHeight;
      const x = rootX + Math.sin(t * Math.PI * 1.35) * (isMobile ? 2 : 5);
      const id = `trunk-${i}`;
      pos.push({
        id,
        x,
        y,
        type: "anchor",
        label: "",
        color: "252 26% 58%",
        depth: -1,
        hidden: true,
        zDepth: 0,
      });
      parent[id] = previousId;
      eds.push({ from: previousId, to: id });
      previousId = id;
    }

    const anchorForT = (t: number) => {
      const index = Math.max(0, Math.min(anchorCount - 1, Math.round(t * (anchorCount - 1))));
      return pos.find((p) => p.id === `trunk-${index}`)!;
    };

    // Recursively fan children out like smaller ramifications. They do NOT stack
    // vertically; every generation grows farther out and mostly upward.
    const placeChildren = (
      parentNote: Note,
      parentX: number,
      parentY: number,
      side: -1 | 1,
      outwardAngle: number,
      depth: number,
      branchRootId: string,
      zDepth: number,
    ) => {
      const children = childrenOf(parentNote.id);
      const expanded = parentNote.isCollapsed === false && children.length > 0;
      if (!expanded) return;

      const count = children.length;
      const baseRadius = isMobile ? Math.max(80, 108 - depth * 8) : Math.max(105, 155 - depth * 15);
      const radius = baseRadius + Math.min(44, count * 5);
      const spread = Math.min(1.5, 0.58 + count * 0.15);

      children.forEach((child, i) => {
        const centered = count === 1 ? 0 : i / (count - 1) - 0.5;
        // Keep the fan biased upward. This gives the "copa" shape from the sketch.
        const angle = outwardAngle + centered * spread;
        const childX = parentX + Math.cos(angle) * radius;
        const childY = parentY + Math.sin(angle) * radius;
        const id = `note-${child.id}`;
        const childColor = noteColor(child);

        pos.push({
          id,
          x: childX,
          y: childY,
          type: "note",
          label: child.title,
          color: childColor,
          categoryId: child.categoryId,
          noteId: child.id,
          parentNoteId: child.parentNoteId,
          noteType: child.noteType,
          hasChildren: childrenOf(child.id).length > 0,
          isCollapsed: child.isCollapsed,
          depth,
          branchRootId,
          zDepth,
        });

        parent[id] = `note-${parentNote.id}`;
        eds.push({ from: `note-${parentNote.id}`, to: id });

        // Continue outward in the direction of this child, with a slight upward bias.
        const nextAngleRaw = Math.atan2(childY - parentY, childX - parentX);
        const upwardBias = side === -1 ? -2.62 : -0.52;
        const nextAngle = nextAngleRaw * 0.72 + upwardBias * 0.28;
        placeChildren(child, childX, childY, side, nextAngle, depth + 1, branchRootId, zDepth);
      });
    };

    rootNotes.forEach((note, i) => {
      // Alternate sides so branches share the same trunk and form a crown.
      const side: -1 | 1 = i % 2 === 0 ? -1 : 1;
      const row = Math.floor(i / 2);
      const rows = Math.max(1, Math.ceil(rootNotes.length / 2));

      // First ramifications begin around the middle of the trunk, never at the base.
      const verticalT = rows === 1 ? 0.62 : 0.4 + (row / Math.max(1, rows - 1)) * 0.38;
      const anchor = anchorForT(verticalT);

      const horizontal = isMobile ? Math.min(W * 0.25, 112 + row * 12) : Math.min(W * 0.24, 205 + row * 22);
      const rise = isMobile ? 42 + row * 12 : 68 + row * 18;
      const nx = anchor.x + side * horizontal;
      const ny = anchor.y - rise;
      const id = `note-${note.id}`;
      const color = noteColor(note);
      const zDepth = (i % 3) - 1; // subtle pseudo-depth in general view

      pos.push({
        id,
        x: nx,
        y: ny,
        type: "note",
        label: note.title,
        color,
        categoryId: note.categoryId,
        noteId: note.id,
        parentNoteId: null,
        noteType: note.noteType,
        hasChildren: childrenOf(note.id).length > 0,
        isCollapsed: note.isCollapsed,
        depth: 0,
        branchRootId: note.id,
        zDepth,
      });

      parent[id] = anchor.id;
      eds.push({ from: anchor.id, to: id });

      // Main branch direction: outward + upward, never downward.
      const outwardAngle = side === -1 ? -2.56 : -0.58;
      placeChildren(note, nx, ny, side, outwardAngle, 1, note.id, zDepth);
    });

    return { positions: pos, edges: eds, parentMap: parent };
  }, [notes, categories, hiddenCategoryIds, brainName, size.w, size.h]);

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
    return positions.map((p) => {
      const off = compute(p.id);
      const nx = p.x + off.dx;
      const ny = p.y + off.dy;
      return off.dx !== 0 || off.dy !== 0 ? { ...p, x: nx, y: ny } : p;
    });
  }, [positions, offsets, parentMap]);

  const getPos = (id: string) => positionsWithOffsets.find((p) => p.id === id);

  const getNodeRadius = useCallback((node: NodePos) => {
    if (node.hidden || node.type === "anchor") return 0;
    if (node.type === "root") return ROOT_R;
    if (node.id === "hub") return 6;
    if (node.type === "category") return CAT_R;
    return NOTE_R;
  }, []);

  const getSubtreeIds = useCallback(
    (nodeId: string) => {
      const ids = new Set<string>();
      const visitNote = (noteId: string) => {
        ids.add(`note-${noteId}`);
        notes.filter((n) => n.parentNoteId === noteId).forEach((child) => visitNote(child.id));
      };

      if (nodeId.startsWith("note-")) {
        visitNote(nodeId.replace("note-", ""));
      } else if (nodeId.startsWith("cat-")) {
        const categoryId = nodeId.replace("cat-", "");
        ids.add(nodeId);
        notes.filter((n) => n.categoryId === categoryId && !n.parentNoteId).forEach((note) => visitNote(note.id));
      } else {
        positionsWithOffsets.forEach((node) => ids.add(node.id));
      }

      return ids;
    },
    [notes, positionsWithOffsets],
  );

  const getNodesBounds = useCallback(
    (nodes: NodePos[]) => {
      const visibleNodes = nodes.filter((node) => !node.hidden && node.type !== "anchor");
      if (visibleNodes.length === 0) return null;
      return visibleNodes.reduce(
        (bounds, node) => {
          const r = getNodeRadius(node);
          const labelPadX = node.type === "note" ? 34 : node.type === "category" ? 54 : 72;
          const labelPadTop = node.type === "note" ? 16 : 0;
          const labelPadBottom = node.type === "note" ? 0 : 22;
          return {
            minX: Math.min(bounds.minX, node.x - Math.max(r, labelPadX)),
            maxX: Math.max(bounds.maxX, node.x + Math.max(r, labelPadX)),
            minY: Math.min(bounds.minY, node.y - r - labelPadTop),
            maxY: Math.max(bounds.maxY, node.y + r + labelPadBottom),
          };
        },
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
      );
    },
    [getNodeRadius],
  );

  const focusBranch = useCallback(
    (nodeId: string) => {
      const subtreeIds = getSubtreeIds(nodeId);
      const branchNodes = positionsWithOffsets.filter((node) => subtreeIds.has(node.id));
      const bounds = getNodesBounds(branchNodes);
      if (!bounds) return;

      const isMobile = size.w < 640;
      const topMargin = 48;
      const bottomMargin = isMobile ? 100 : 80;
      const targetX = size.w / 2;
      const targetY = (topMargin + (size.h - bottomMargin)) / 2;
      const branchCenterX = (bounds.minX + bounds.maxX) / 2;
      const branchCenterY = (bounds.minY + bounds.maxY) / 2;

      setViewZoom(1);
      setPan({ x: targetX - branchCenterX, y: targetY - branchCenterY });
    },
    [getNodesBounds, getSubtreeIds, positionsWithOffsets, size.w, size.h],
  );

  const fitFullTree = useCallback(() => {
    const bounds = getNodesBounds(positionsWithOffsets);
    if (!bounds) return;

    const isMobile = size.w < 640;
    const sideMargin = isMobile ? 12 : 36;
    const topMargin = isMobile ? 48 : 56;
    const bottomMargin = isMobile ? 48 : 56;
    const availableW = Math.max(1, size.w - sideMargin * 2);
    const availableH = Math.max(1, size.h - topMargin - bottomMargin);
    const treeW = Math.max(1, bounds.maxX - bounds.minX);
    const treeH = Math.max(1, bounds.maxY - bounds.minY);
    const zoom = Math.min(1, Math.max(0.4, Math.min(availableW / treeW, availableH / treeH)));
    const treeCenterX = (bounds.minX + bounds.maxX) / 2;
    const treeCenterY = (bounds.minY + bounds.maxY) / 2;
    const targetX = size.w / 2;
    const targetY = (topMargin + (size.h - bottomMargin)) / 2;

    setViewZoom(zoom);
    setPan({ x: targetX - treeCenterX * zoom, y: targetY - treeCenterY * zoom });
  }, [getNodesBounds, positionsWithOffsets, size.w, size.h]);

  const hasOpenVisibleBranch = useMemo(() => {
    return positionsWithOffsets.some(
      (node) =>
        node.id !== "hub" &&
        (node.type === "note" || node.type === "category") &&
        node.hasChildren &&
        node.isCollapsed === false,
    );
  }, [positionsWithOffsets]);

  const layoutSignature = useMemo(() => {
    return positions
      .map((node) => `${node.id}:${Math.round(node.x)}:${Math.round(node.y)}:${node.isCollapsed ? 1 : 0}`)
      .join("|");
  }, [positions]);

  useEffect(() => {
    if (positionsWithOffsets.length === 0) return;

    const expandedNodeId = lastExpandedRef.current;
    if (expandedNodeId) {
      if (!positionsWithOffsets.some((node) => node.id === expandedNodeId)) return;
      focusBranch(expandedNodeId);
      lastExpandedRef.current = null;
      didInitialFitRef.current = true;
      previousHasOpenBranchRef.current = hasOpenVisibleBranch;
      return;
    }

    if (lastCollapsedRef.current) {
      fitFullTree();
      lastCollapsedRef.current = null;
      didInitialFitRef.current = true;
      previousHasOpenBranchRef.current = hasOpenVisibleBranch;
      return;
    }

    if (!didInitialFitRef.current || (!hasOpenVisibleBranch && previousHasOpenBranchRef.current)) {
      fitFullTree();
      didInitialFitRef.current = true;
    }

    previousHasOpenBranchRef.current = hasOpenVisibleBranch;
  }, [layoutSignature, size.w, size.h, hasOpenVisibleBranch]);

  // Long-press handlers
  const startLongPress = useCallback(
    (nodeId: string, clientX: number, clientY: number) => {
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
    },
    [linkingNoteId, linkNotes],
  );

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  // Drag / pan / pinch pointer handlers (window-level)
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      // Track any pointer that we haven't seen. If it becomes the 2nd active pointer
      // and we don't yet have a pinch, initiate one from current pan/zoom state.
      if (pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointersRef.current.size >= 2 && !pinchState.current) {
        const pts = Array.from(pointersRef.current.values());
        const [p1, p2] = pts;
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        pinchState.current = {
          startDist: dist,
          startZoom: viewZoomRef.current || 1,
          startPanX: 0,
          startPanY: 0,
          centerX: (p1.x + p2.x) / 2,
          centerY: (p1.y + p2.y) / 2,
        };
        setPan((p) => {
          if (pinchState.current) {
            pinchState.current.startPanX = p.x;
            pinchState.current.startPanY = p.y;
          }
          return p;
        });
        panState.current = null;
        dragState.current = null;
        cancelLongPress();
        didPan.current = true;
        setIsPanning(true);
      }
    };
    const onMove = (e: PointerEvent) => {
      // Update tracked pointer position
      if (pointersRef.current.has(e.pointerId)) {
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }

      // Cancel canvas long-press if pointer moved too far
      if (canvasLongPressTimer.current && canvasLongPressStart.current) {
        const s = canvasLongPressStart.current;
        if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > 8) {
          clearTimeout(canvasLongPressTimer.current);
          canvasLongPressTimer.current = null;
          canvasLongPressStart.current = null;
        }
      }

      // Pinch (two active pointers): zoom + pan following centroid
      if (pinchState.current && pointersRef.current.size >= 2) {
        const pts = Array.from(pointersRef.current.values());
        const [p1, p2] = pts;
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const cx = (p1.x + p2.x) / 2;
        const cy = (p1.y + p2.y) / 2;
        const ps = pinchState.current;
        if (ps.startDist > 0) {
          const scale = dist / ps.startDist;
          const newZoom = Math.max(0.3, Math.min(3, ps.startZoom * scale));
          // World point under original centroid should stay under current centroid
          const worldX = (ps.centerX - ps.startPanX) / ps.startZoom;
          const worldY = (ps.centerY - ps.startPanY) / ps.startZoom;
          const newPanX = cx - worldX * newZoom;
          const newPanY = cy - worldY * newZoom;
          setViewZoom(newZoom);
          setPan({ x: newPanX, y: newPanY });
        }
        return;
      }

      const ds = dragState.current;
      if (ds) {
        const rawDx = e.clientX - ds.startX;
        const rawDy = e.clientY - ds.startY;
        if (!didDrag.current && Math.hypot(rawDx, rawDy) > 5) {
          didDrag.current = true;
          cancelLongPress();
        }
        if (didDrag.current) {
          const zoom = viewZoomRef.current || 1;
          const dx = rawDx / zoom;
          const dy = rawDy / zoom;
          setOffsets((prev) => ({
            ...prev,
            [ds.nodeId]: { dx: ds.baseDx + dx, dy: ds.baseDy + dy },
          }));
        }
      }
      const ps = panState.current;
      if (!ps) return;
      const rawDx = e.clientX - ps.startX;
      const rawDy = e.clientY - ps.startY;
      if (!didPan.current && Math.hypot(rawDx, rawDy) > 5) didPan.current = true;
      if (didPan.current) {
        setPan({ x: ps.baseX + rawDx, y: ps.baseY + rawDy });
      }
    };
    const onUp = (e: PointerEvent) => {
      pointersRef.current.delete(e.pointerId);
      dragState.current = null;

      // Cancel canvas long-press if pointer released before timer fired
      if (canvasLongPressTimer.current) {
        clearTimeout(canvasLongPressTimer.current);
        canvasLongPressTimer.current = null;
      }
      canvasLongPressStart.current = null;

      // End pinch when going below 2 pointers; do NOT continue as pan (1-finger canvas pan disabled on touch)
      if (pinchState.current && pointersRef.current.size < 2) {
        pinchState.current = null;
      }

      if (pointersRef.current.size === 0) {
        panState.current = null;
        setIsPanning(false);
      }
    };
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [cancelLongPress]);

  const getTopLevelBranchId = useCallback(
    (noteId: string) => {
      let current = notes.find((n) => n.id === noteId);
      const seen = new Set<string>();
      while (current?.parentNoteId && !seen.has(current.id)) {
        seen.add(current.id);
        const parentNote = notes.find((n) => n.id === current?.parentNoteId);
        if (!parentNote) break;
        current = parentNote;
      }
      return current?.id || noteId;
    },
    [notes],
  );

  // Click handling with double-click detection
  const handleNodeClick = useCallback(
    (nodeId: string, clientX: number, clientY: number) => {
      if (didDrag.current) {
        didDrag.current = false;
        return;
      }
      if (didLongPress.current) {
        didLongPress.current = false;
        return;
      }
      if (contextMenu) {
        setContextMenu(null);
        return;
      }

      if (clickTimer.current) {
        clearTimeout(clickTimer.current);
        clickTimer.current = null;
        // Double click
        if (nodeId.startsWith("note-")) {
          const nId = nodeId.replace("note-", "");
          const note = notes.find((n) => n.id === nId);
          const hasChildren = notes.some((n) => n.parentNoteId === nId);
          if (hasChildren && note) {
            setActiveBranchId(getTopLevelBranchId(nId));
            lastExpandedRef.current = note.isCollapsed ? nodeId : null;
            lastCollapsedRef.current = note.isCollapsed ? null : nodeId;
            toggleNoteCollapsed(nId);
          }
        } else if (nodeId.startsWith("cat-")) {
          const cId = nodeId.replace("cat-", "");
          const cat = categories.find((c) => c.id === cId);
          const hasChildren = notes.some((n) => n.categoryId === cId && !n.parentNoteId);
          if (hasChildren && cat) {
            lastExpandedRef.current = cat.isCollapsed ? nodeId : null;
            lastCollapsedRef.current = cat.isCollapsed ? null : nodeId;
            toggleCategoryCollapsed(cId);
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
          const branchId = getTopLevelBranchId(nId);
          setActiveBranchId(branchId);
          setOpenPostIt({ noteId: nId, x: clientX, y: clientY });
        } else if (nodeId === "root") {
          setActiveBranchId(null);
          // single click on root opens rename
          setShowBrainDialog(true);
        }
        // categories: single click does nothing (use long-press menu)
      }, 240);
    },
    [
      contextMenu,
      notes,
      categories,
      toggleNoteCollapsed,
      toggleCategoryCollapsed,
      linkingNoteId,
      linkNotes,
      getTopLevelBranchId,
    ],
  );

  const handleAddCategory = () => {
    if (newCatName.trim()) {
      addCategory(newCatName.trim(), newCatIcon, newCatColor, null);
      setNewCatName("");
      setNewCatIcon("📌");
      setNewCatColor(DEFAULT_CATEGORY_COLOR);
      setIsAddingCat(false);
    }
  };

  // Helper: bezier path between two nodes
  const pathBetween = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const c1x = x1 + dx * 0.24;
    const c1y = y1 + dy * 0.1;
    const c2x = x1 + dx * 0.78;
    const c2y = y1 + dy * 0.88;
    return `M ${x1} ${y1} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`;
  };

  // Link edges (horizontal between notes)
  const linkEdges = useMemo(() => {
    const out: { from: string; to: string }[] = [];
    const ids = new Set(positions.map((p) => p.id));
    notes.forEach((n) => {
      const fromKey = `note-${n.id}`;
      if (!ids.has(fromKey)) return;
      n.linkedNoteIds.forEach((lid) => {
        const toKey = `note-${lid}`;
        if (ids.has(toKey) && n.id < lid) out.push({ from: fromKey, to: toKey });
      });
    });
    return out;
  }, [notes, positions]);

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full w-full bg-background overflow-hidden relative select-none"
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        const target = e.target as HTMLElement;
        const onBackground = !target.closest(
          "[data-graph-node], button, input, textarea, [role='dialog'], [data-no-pan]",
        );

        // Always track pointer for pinch detection
        pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

        // Second pointer -> start pinch (cancel any in-flight pan, node drag or canvas long-press)
        if (pointersRef.current.size >= 2) {
          const pts = Array.from(pointersRef.current.values());
          const [p1, p2] = pts;
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          pinchState.current = {
            startDist: dist,
            startZoom: viewZoomRef.current || 1,
            startPanX: pan.x,
            startPanY: pan.y,
            centerX: (p1.x + p2.x) / 2,
            centerY: (p1.y + p2.y) / 2,
          };
          panState.current = null;
          dragState.current = null;
          cancelLongPress();
          if (canvasLongPressTimer.current) {
            clearTimeout(canvasLongPressTimer.current);
            canvasLongPressTimer.current = null;
          }
          canvasLongPressStart.current = null;
          didPan.current = true;
          setIsPanning(true);
          return;
        }

        if (!onBackground) return;

        // Long-press on empty canvas -> open "create" dialog (works for touch and mouse)
        canvasLongPressStart.current = { x: e.clientX, y: e.clientY };
        if (canvasLongPressTimer.current) clearTimeout(canvasLongPressTimer.current);
        canvasLongPressTimer.current = setTimeout(() => {
          canvasLongPressTimer.current = null;
          // Only trigger if user hasn't started panning/pinching
          if (didPan.current || pinchState.current || pointersRef.current.size >= 2) return;
          setCreateDialog({ x: e.clientX, y: e.clientY });
          // Cancel any pending pan so the click after release doesn't act
          panState.current = null;
          didPan.current = true;
        }, 550);

        // Touch: 1-finger canvas pan is disabled (use 2 fingers). Only mouse/pen pans with one pointer.
        if (e.pointerType === "touch") return;

        panState.current = {
          startX: e.clientX,
          startY: e.clientY,
          baseX: pan.x,
          baseY: pan.y,
        };
        didPan.current = false;
        setIsPanning(true);
      }}
      onClick={() => {
        if (didPan.current) {
          didPan.current = false;
          return;
        }
        if (openPostIt) setOpenPostIt(null);
        else setActiveBranchId(null);
        if (contextMenu) setContextMenu(null);
        if (colorPickerCat) setColorPickerCat(null);
        if (linkingNoteId) {
          setLinkingNoteId(null);
          toast.info("Enlace cancelado");
        }
      }}
    >
      {/* Linking indicator */}
      {linkingNoteId && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-40 bg-primary text-primary-foreground text-xs font-body px-3 py-1.5 rounded-full shadow-lg animate-pulse">
          Selecciona otra nota para enlazar
        </div>
      )}

      {/* Tree world: SVG branches + nodes */}
      <div
        className="absolute inset-0"
        style={{
          transform: `matrix(${viewZoom}, 0, 0, ${viewZoom}, ${pan.x}, ${pan.y})`,
          transformOrigin: "0 0",
          transition: isPanning ? "none" : "transform 400ms cubic-bezier(.2,.7,.2,1)",
          willChange: "transform",
        }}
      >
        {/* SVG branches */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0, overflow: "visible" }}>
          {edges.map((edge, idx) => {
            const from = getPos(edge.from);
            const to = getPos(edge.to);
            if (!from || !to) return null;

            const isTrunk = edge.to.startsWith("trunk-") || (edge.from === "root" && edge.to.startsWith("trunk-"));
            const branchRootId = to.branchRootId || from.branchRootId;
            const isFocused = !activeBranchId || branchRootId === activeBranchId || isTrunk;
            const isBehind = (to.zDepth ?? from.zDepth ?? 0) < 0;

            const stroke = isTrunk ? "hsl(252 24% 58%)" : `hsl(${to.color})`;
            const strokeOpacity = activeBranchId
              ? isFocused
                ? isTrunk
                  ? 0.34
                  : 0.9
                : 0.11
              : isTrunk
                ? 0.42
                : isBehind
                  ? 0.42
                  : 0.72;
            const strokeWidth = isTrunk
              ? 1.8
              : (to.depth ?? 0) === 0
                ? 2.5
                : Math.max(1.15, 2.2 - (to.depth ?? 0) * 0.22);

            return (
              <path
                key={`be-${idx}`}
                d={pathBetween(from.x, from.y, to.x, to.y)}
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeOpacity={strokeOpacity}
                strokeLinecap="round"
                fill="none"
                style={{
                  filter: !activeBranchId && isBehind ? "blur(0.35px)" : "none",
                  transition: "stroke-opacity 280ms ease, filter 280ms ease",
                }}
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
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="hsl(var(--muted-foreground) / 0.25)"
                strokeWidth={1}
                strokeDasharray="5 5"
              />
            );
          })}
        </svg>

        {/* Nodes: labels are the nodes; no giant circles. */}
        <AnimatePresence>
          {positionsWithOffsets.map((node) => {
            if (node.hidden || node.type === "anchor") return null;

            const isRoot = node.type === "root";
            const isNote = node.type === "note";
            const isMainBranch = isNote && node.depth === 0;
            const branchFocused = !activeBranchId || node.branchRootId === activeBranchId || isRoot;
            const isBehind = (node.zDepth ?? 0) < 0;
            const nodeOpacity = activeBranchId ? (branchFocused ? 1 : 0.18) : isBehind ? 0.58 : 1;
            const isLinkSource = linkingNoteId && node.noteId === linkingNoteId;
            const showCollapsedDot = isNote && node.hasChildren && node.isCollapsed;

            const width = isRoot ? 120 : isMainBranch ? 118 : Math.max(78, Math.min(152, 34 + node.label.length * 6.2));
            const height = isRoot ? 42 : isMainBranch ? 38 : 30;

            return (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{
                  opacity: nodeOpacity,
                  scale: activeBranchId && node.branchRootId === activeBranchId ? (isMainBranch ? 1.04 : 1) : 1,
                  left: node.x - width / 2,
                  top: node.y - height / 2,
                }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={
                  dragState.current?.nodeId === node.id ? { duration: 0 } : { duration: 0.28, ease: "easeOut" }
                }
                className="absolute cursor-grab active:cursor-grabbing touch-none"
                data-graph-node
                style={{
                  width,
                  height,
                  zIndex: isRoot ? 10 : branchFocused ? 6 : 2,
                  filter: !activeBranchId && isBehind ? "blur(0.18px)" : "none",
                }}
                onPointerDown={(e) => {
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
                onClick={(e) => {
                  e.stopPropagation();
                  handleNodeClick(node.id, e.clientX, e.clientY);
                }}
              >
                <div
                  className={`h-full w-full rounded-full border bg-card/88 backdrop-blur-sm shadow-sm flex items-center justify-center gap-2 px-3 transition-all ${
                    isLinkSource ? "ring-2 ring-primary/50 ring-offset-2 ring-offset-background" : ""
                  }`}
                  style={{
                    borderColor: isRoot ? "hsl(252 28% 72%)" : `hsl(${node.color} / ${isMainBranch ? 0.72 : 0.46})`,
                    boxShadow:
                      isMainBranch && branchFocused
                        ? `0 7px 20px hsl(${node.color} / 0.10)`
                        : "0 4px 14px hsl(240 12% 12% / 0.05)",
                  }}
                >
                  {!isRoot && (
                    <span
                      className="shrink-0 rounded-full"
                      style={{
                        width: isMainBranch ? 9 : 6,
                        height: isMainBranch ? 9 : 6,
                        backgroundColor: `hsl(${node.color})`,
                        opacity: 0.86,
                      }}
                    />
                  )}
                  <span
                    className={`${isRoot || isMainBranch ? "font-display font-semibold" : "font-body font-medium"} text-foreground truncate text-center`}
                    style={{ fontSize: isRoot ? 15 : isMainBranch ? 13 : 11 }}
                  >
                    {node.label}
                  </span>
                  {showCollapsedDot && <span className="text-[9px] text-muted-foreground">•••</span>}
                </div>
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
            onClick={(e) => e.stopPropagation()}
          >
            {contextMenu.nodeId === "root" && (
              <button
                onClick={() => {
                  setShowBrainDialog(true);
                  setContextMenu(null);
                }}
                className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
              >
                <Rename size={12} />
                Renombrar cerebro
              </button>
            )}

            {contextMenu.nodeId.startsWith("cat-") &&
              (() => {
                const catId = contextMenu.nodeId.replace("cat-", "");
                return (
                  <>
                    <button
                      onClick={() => {
                        setNewNoteDialog({ categoryId: catId, parentNoteId: null, type: "text" });
                        setContextMenu(null);
                      }}
                      className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                    >
                      <FileText size={12} />
                      Añadir nota
                    </button>
                    <button
                      onClick={() => {
                        setNewNoteDialog({ categoryId: catId, parentNoteId: null, type: "checklist" });
                        setContextMenu(null);
                      }}
                      className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                    >
                      <ListChecks size={12} />
                      Añadir lista
                    </button>
                    <button
                      onClick={() => {
                        const cat = categories.find((c) => c.id === catId);
                        if (cat) setEditingCat({ id: catId, name: cat.name });
                        setContextMenu(null);
                      }}
                      className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                    >
                      <Pencil size={12} />
                      Renombrar tema
                    </button>
                    <button
                      onClick={() => {
                        setColorPickerCat({ id: catId, x: contextMenu.x, y: contextMenu.y });
                        setContextMenu(null);
                      }}
                      className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                    >
                      <Palette size={12} />
                      Cambiar color
                    </button>
                    <button
                      onClick={() => {
                        setIconPickerCat({ id: catId, x: contextMenu.x, y: contextMenu.y });
                        setContextMenu(null);
                      }}
                      className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                    >
                      <span className="text-sm leading-none">🙂</span>Cambiar icono
                    </button>
                    <button
                      onClick={() => {
                        setConfirmDialog({
                          message: "¿Eliminar este tema y sus notas?",
                          onConfirm: () => {
                            deleteCategory(catId);
                            setConfirmDialog(null);
                          },
                        });
                        setContextMenu(null);
                      }}
                      className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-destructive/10 flex items-center gap-2 font-body text-destructive"
                    >
                      <Trash2 size={12} />
                      Eliminar tema
                    </button>
                  </>
                );
              })()}

            {contextMenu.nodeId.startsWith("note-") &&
              (() => {
                const nId = contextMenu.nodeId.replace("note-", "");
                const note = notes.find((n) => n.id === nId);
                if (!note) return null;
                return (
                  <>
                    <button
                      onClick={() => {
                        setNewNoteDialog({ categoryId: note.categoryId, parentNoteId: nId, type: "text" });
                        setContextMenu(null);
                      }}
                      className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                    >
                      <FileText size={12} />
                      Añadir hija (texto)
                    </button>
                    <button
                      onClick={() => {
                        setNewNoteDialog({ categoryId: note.categoryId, parentNoteId: nId, type: "checklist" });
                        setContextMenu(null);
                      }}
                      className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                    >
                      <ListChecks size={12} />
                      Añadir hija (lista)
                    </button>
                    <button
                      onClick={() => {
                        setLinkingNoteId(nId);
                        setContextMenu(null);
                        toast.info("Pulsa otra nota para enlazar");
                      }}
                      className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                    >
                      🔗 Enlazar con otra nota
                    </button>
                    <button
                      onClick={() => {
                        setConfirmDialog({
                          message: "¿Eliminar esta nota?",
                          onConfirm: () => {
                            deleteNote(nId);
                            setConfirmDialog(null);
                          },
                        });
                        setContextMenu(null);
                      }}
                      className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-destructive/10 flex items-center gap-2 font-body text-destructive"
                    >
                      <Trash2 size={12} />
                      Eliminar
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
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-body text-muted-foreground mb-2">Elige un color</p>
          <ColorPicker
            value={categories.find((c) => c.id === colorPickerCat.id)?.color || ""}
            onChange={(color) => {
              updateCategory(colorPickerCat.id, { color });
              setColorPickerCat(null);
            }}
          />
        </div>
      )}

      {/* Icon picker (category) */}
      {iconPickerCat && (
        <div
          className="fixed z-50 bg-card border border-border rounded-lg shadow-xl p-3"
          style={{ left: Math.min(iconPickerCat.x, size.w - 280), top: Math.min(iconPickerCat.y, size.h - 260) }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-body text-muted-foreground mb-2">Elige un icono</p>
          <EmojiPicker
            value={categories.find((c) => c.id === iconPickerCat.id)?.icon}
            onChange={(icon) => {
              updateCategory(iconPickerCat.id, { icon });
              setIconPickerCat(null);
            }}
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
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-card border border-border rounded-xl shadow-2xl p-5 max-w-[280px] w-full mx-4 space-y-4"
            >
              <p className="text-sm font-body text-foreground text-center">{confirmDialog.message}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 text-sm md:text-xs py-2.5 md:py-2 min-h-11 md:min-h-0 rounded-lg bg-muted text-foreground font-body hover:bg-muted/80"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDialog.onConfirm}
                  className="flex-1 text-sm md:text-xs py-2.5 md:py-2 min-h-11 md:min-h-0 rounded-lg bg-primary text-primary-foreground font-body hover:opacity-90"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-right controls */}
      <div className="fixed top-3 right-3 z-30 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleTheme();
          }}
          className="p-2.5 md:p-2 min-h-11 min-w-11 md:min-h-0 md:min-w-0 rounded-lg border border-border bg-card/90 backdrop-blur-sm shadow-sm hover:shadow text-muted-foreground transition-all flex items-center justify-center"
          title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
          aria-label="Alternar modo oscuro"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowProfileMenu((v) => !v);
              setShowFilterPanel(false);
              setIsAddingCat(false);
            }}
            className="p-2.5 md:p-2 min-h-11 min-w-11 md:min-h-0 md:min-w-0 rounded-lg border border-border bg-card/90 backdrop-blur-sm shadow-sm hover:shadow text-muted-foreground transition-all flex items-center justify-center"
            title={user ? "Perfil" : "Iniciar sesión"}
          >
            <UserIcon size={16} />
          </button>
          {showProfileMenu && (
            <div
              className="absolute right-0 top-11 bg-card border border-border rounded-lg shadow-xl py-1 min-w-[200px]"
              onClick={(e) => e.stopPropagation()}
            >
              {user ? (
                <>
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs md:text-[10px] font-body text-muted-foreground">Sesión</p>
                    <p className="text-sm md:text-xs font-body text-foreground truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowBrainDialog(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                  >
                    <Brain size={12} />
                    Renombrar tu brain
                  </button>
                  <GoogleCalendarMenuItem onClose={() => setShowProfileMenu(false)} />
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowHistoryDialog(true);
                    }}
                    className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                  >
                    <History size={12} />
                    Historial
                  </button>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      setShowExportDialog(true);
                    }}
                    className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                  >
                    <Download size={12} />
                    Descargar mis notas
                  </button>
                  <button
                    onClick={async () => {
                      setShowProfileMenu(false);
                      await signOut();
                      navigate("/auth");
                    }}
                    className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-destructive/10 flex items-center gap-2 font-body text-destructive"
                  >
                    <LogOut size={12} />
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate("/auth");
                  }}
                  className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                >
                  <LogIn size={12} />
                  Iniciar sesión
                </button>
              )}
            </div>
          )}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setOffsets({});
            fitFullTree();
            setShowFilterPanel(false);
            setIsAddingCat(false);
          }}
          className="p-2.5 md:p-2 min-h-11 min-w-11 md:min-h-0 md:min-w-0 rounded-lg border border-border bg-card/90 backdrop-blur-sm shadow-sm hover:shadow text-muted-foreground transition-all flex items-center justify-center"
          title="Restablecer vista del árbol"
        >
          <TreePine size={16} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowFilterPanel((v) => !v);
            setIsAddingCat(false);
          }}
          className={`p-2.5 md:p-2 min-h-11 min-w-11 md:min-h-0 md:min-w-0 rounded-lg border border-border bg-card/90 backdrop-blur-sm shadow-sm hover:shadow transition-all flex items-center justify-center ${
            hiddenCategoryIds.size > 0 ? "text-primary" : "text-muted-foreground"
          }`}
          title="Filtrar temas"
        >
          {/* eye icon via emoji to avoid extra import */}
          <span className="text-sm leading-none">{hiddenCategoryIds.size > 0 ? "🙈" : "👁"}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsAddingCat(true);
            setShowFilterPanel(false);
          }}
          className="p-2.5 md:p-2 min-h-11 min-w-11 md:min-h-0 md:min-w-0 rounded-lg border border-border bg-card/90 backdrop-blur-sm shadow-sm hover:shadow text-muted-foreground transition-all flex items-center justify-center"
          title="Nuevo tema"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Filter panel */}
      {showFilterPanel && (
        <div
          className="fixed top-14 right-3 z-30 bg-card border border-border rounded-lg shadow-lg p-3 space-y-2 min-w-[220px] max-h-[60vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm md:text-xs font-display font-semibold text-foreground">Mostrar temas</p>
            {hiddenCategoryIds.size > 0 && (
              <button
                onClick={() => setHiddenCategoryIds(new Set())}
                className="text-xs md:text-[10px] font-body text-primary hover:underline min-h-11 md:min-h-0 px-2 md:px-0"
              >
                Mostrar todos
              </button>
            )}
          </div>
          {categories.length === 0 && (
            <p className="text-sm md:text-[11px] font-body text-muted-foreground">No hay temas aún.</p>
          )}
          {categories.map((cat) => {
            const hidden = hiddenCategoryIds.has(cat.id);
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setHiddenCategoryIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(cat.id)) next.delete(cat.id);
                    else next.add(cat.id);
                    return next;
                  });
                }}
                className={`w-full flex items-center gap-2 px-2 py-2.5 md:py-1.5 min-h-11 md:min-h-0 rounded-md text-sm md:text-xs font-body text-left transition-colors ${
                  hidden ? "opacity-40 hover:opacity-70" : "hover:bg-muted"
                }`}
              >
                <span
                  className="w-3.5 h-3.5 md:w-3 md:h-3 rounded-full border"
                  style={{ backgroundColor: `hsl(${cat.color})`, borderColor: `hsl(${cat.color})` }}
                />
                <span className="flex-1 truncate text-foreground">
                  {cat.icon} {cat.name}
                </span>
                <span className="text-xs md:text-[10px] text-muted-foreground">{hidden ? "oculto" : "visible"}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Add category panel */}
      {isAddingCat && (
        <div
          className="fixed top-14 right-3 z-30 bg-card border border-border rounded-lg shadow-lg p-3 space-y-3 min-w-[220px]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex gap-2">
            <input
              value={newCatIcon}
              onChange={(e) => setNewCatIcon(e.target.value)}
              className="w-11 md:w-10 text-center bg-muted rounded text-base md:text-sm p-2 md:p-1 min-h-11 md:min-h-0"
              maxLength={2}
            />
            <input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              placeholder="Nombre del tema..."
              autoFocus
              className="flex-1 bg-muted rounded text-base md:text-xs px-2 py-2.5 md:py-1 min-h-11 md:min-h-0 text-foreground outline-none font-body"
            />
          </div>
          <div>
            <p className="text-xs md:text-[10px] font-body text-muted-foreground mb-1">Color</p>
            <ColorPicker value={newCatColor} onChange={setNewCatColor} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddCategory}
              className="flex-1 bg-primary text-primary-foreground rounded text-sm md:text-xs py-2.5 md:py-1.5 min-h-11 md:min-h-0 font-medium"
            >
              Añadir
            </button>
            <button
              onClick={() => {
                setIsAddingCat(false);
                setNewCatName("");
              }}
              className="flex-1 bg-muted text-foreground rounded text-sm md:text-xs py-2.5 md:py-1.5 min-h-11 md:min-h-0"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Edit category name */}
      {editingCat && (
        <div
          className="fixed top-14 right-3 z-30 bg-card border border-border rounded-lg shadow-lg p-3 space-y-2 min-w-[200px]"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            value={editingCat.name}
            onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter" && editingCat.name.trim()) {
                updateCategory(editingCat.id, { name: editingCat.name.trim() });
                setEditingCat(null);
              }
            }}
            autoFocus
            className="w-full bg-muted rounded text-base md:text-xs px-2 py-2.5 md:py-1.5 min-h-11 md:min-h-0 text-foreground outline-none font-body"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (editingCat.name.trim()) {
                  updateCategory(editingCat.id, { name: editingCat.name.trim() });
                  setEditingCat(null);
                }
              }}
              className="flex-1 bg-primary text-primary-foreground rounded text-sm md:text-xs py-2.5 md:py-1.5 min-h-11 md:min-h-0 font-medium"
            >
              Guardar
            </button>
            <button
              onClick={() => setEditingCat(null)}
              className="flex-1 bg-muted text-foreground rounded text-sm md:text-xs py-2.5 md:py-1.5 min-h-11 md:min-h-0"
            >
              Cancelar
            </button>
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

      <HistoryDialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog} />

      <ExportDialog open={showExportDialog} onOpenChange={setShowExportDialog} />

      {/* Post-it overlay */}
      <AnimatePresence>
        {openPostIt && (
          <NotePostIt
            key={openPostIt.noteId}
            noteId={openPostIt.noteId}
            position={{ x: openPostIt.x, y: openPostIt.y }}
            onClose={() => {
              setOpenPostIt(null);
              setSelectedNoteId(null);
            }}
          />
        )}
      </AnimatePresence>

      <NameInputDialog
        open={newNoteDialog !== null}
        title={
          newNoteDialog?.type === "checklist"
            ? newNoteDialog?.parentNoteId
              ? "Nueva lista hija"
              : "Nueva lista"
            : newNoteDialog?.parentNoteId
              ? "Nueva nota hija"
              : "Nueva nota"
        }
        placeholder={newNoteDialog?.type === "checklist" ? "Nombre de la lista..." : "Nombre de la nota..."}
        onSubmit={async (name) => {
          if (!newNoteDialog) return;
          const { categoryId, parentNoteId, type } = newNoteDialog;
          setNewNoteDialog(null);
          const created = await addNote(categoryId, parentNoteId, type);
          if (created) updateNote(created.id, { title: name });
        }}
        onCancel={() => setNewNoteDialog(null)}
      />

      <CreateNodeDialog
        open={createDialog !== null}
        notes={notes}
        brainName={brainName}
        onCreateNote={async (parentNoteId, type, name, color) => {
          setCreateDialog(null);
          const created = await addNote(null, parentNoteId, type, parentNoteId ? null : color);
          if (created) updateNote(created.id, { title: name });
        }}
        onCancel={() => setCreateDialog(null)}
      />
    </div>
  );
};

export default GraphView;
