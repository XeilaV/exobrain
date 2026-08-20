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
  Move,
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
import MoveToDialog from "./MoveToDialog";
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
  color: string; // hsl string
  categoryId?: string;
  noteId?: string;
  parentNoteId?: string | null;
  noteType?: "text" | "checklist";
  hasChildren?: boolean;
  isCollapsed?: boolean;
  isMain?: boolean;
  depth: number;
  isVirtual?: boolean;
  branchRootId?: string;
  side?: -1 | 1;
  z?: number;
}

interface Edge {
  from: string;
  to: string;
  kind?: "trunk" | "branch";
}

const ROOT_R = 30;
const CAT_R = 22;
const NOTE_R = 12;

const GraphView = () => {
  const {
    notes,
    categories,
    addNote,
    deleteNote,
    moveNote,
    canMoveTo,
    updateNote,
    linkNotes,
    toggleNoteCollapsed,
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
  const [movingNoteId, setMovingNoteId] = useState<string | null>(null);
  const [pickTargetForId, setPickTargetForId] = useState<string | null>(null);
  const [showBrainDialog, setShowBrainDialog] = useState(false);
  const [linkingNoteId, setLinkingNoteId] = useState<string | null>(null);
  const [focusNoteId, setFocusNoteId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [newNoteDialog, setNewNoteDialog] = useState<{
    parentNoteId: string | null;
    type: "text" | "checklist";
  } | null>(null);
  const [createDialog, setCreateDialog] = useState<{ x: number; y: number } | null>(null);
  const canvasLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasLongPressStart = useRef<{ x: number; y: number } | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [viewZoom, setViewZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);

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

  // Hidden main-branch filter
  const [hiddenCategoryIds, setHiddenCategoryIds] = useState<Set<string>>(new Set());
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  // Todo el árbol nace desplegado: el plegado es manual (doble clic) y vive en sesión,
  // ignorando el estado persistido `isCollapsed`.
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const rootNotes = useMemo(() => notes.filter((n) => !n.parentNoteId), [notes]);
  const visibleRoots = useMemo(
    () => rootNotes.filter((n) => !hiddenCategoryIds.has(n.id)),
    [rootNotes, hiddenCategoryIds],
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

  // Build a real tree: one shared trunk, main branches emerging at different
  // heights, and descendants fanning out as smaller ramifications.
  const { positions, edges, parentMap } = useMemo(() => {
    const pos: NodePos[] = [];
    const eds: Edge[] = [];
    const parent: Record<string, string> = {};
    const W = size.w;
    const H = size.h;
    const isMobile = W < 640;

    if (rootNotes.length === 0) return { positions: pos, edges: eds, parentMap: parent };

    const fallbackPalette = [
      "262 62% 62%", // violet
      "196 58% 50%", // cyan
      "24 78% 58%", // orange
      "332 62% 60%", // pink
      "145 42% 50%", // green
      "220 68% 62%", // blue
    ];

    const colorForRoot = (root: Note, index: number) => {
      const legacyCategory = categories.find((c) => c.id === root.categoryId);
      return root.color || legacyCategory?.color || fallbackPalette[index % fallbackPalette.length];
    };

    const descendantsCount = (noteId: string): number => {
      const children = notes.filter((n) => n.parentNoteId === noteId);
      return children.reduce((sum, child) => sum + 1 + descendantsCount(child.id), 0);
    };

    // Shared vertical trunk. Exobrain is the base, not a radial hub.
    const trunkX = W / 2;
    const rootY = isMobile ? H - 88 : H - 72;
    const trunkTopY = isMobile ? Math.max(96, H * 0.18) : Math.max(96, H * 0.16);
    const trunkBottomY = rootY - (isMobile ? 34 : 38);

    pos.push({
      id: "root",
      x: trunkX,
      y: rootY,
      type: "root",
      label: brainName || "ExoBrain",
      color: "265 24% 44%",
      depth: -1,
      z: 1,
    });

    // One virtual point at the crown so SVG can draw the uninterrupted trunk.
    pos.push({
      id: "trunk-top",
      x: trunkX,
      y: trunkTopY,
      type: "category",
      label: "",
      color: "262 35% 58%",
      depth: -1,
      isVirtual: true,
      z: 0.9,
    });
    parent["trunk-top"] = "root";
    eds.push({ from: "root", to: "trunk-top", kind: "trunk" });

    // Balance heavy subtrees between both sides so the crown does not become a list.
    const weightedRoots = visibleRoots.map((root, originalIndex) => ({
      root,
      originalIndex,
      weight: 1 + descendantsCount(root.id),
    }));

    const left: typeof weightedRoots = [];
    const right: typeof weightedRoots = [];
    let leftWeight = 0;
    let rightWeight = 0;
    weightedRoots
      .slice()
      .sort((a, b) => b.weight - a.weight)
      .forEach((item) => {
        if (leftWeight <= rightWeight) {
          left.push(item);
          leftWeight += item.weight;
        } else {
          right.push(item);
          rightWeight += item.weight;
        }
      });

    // Restore chronological/visual order inside each side.
    left.sort((a, b) => a.originalIndex - b.originalIndex);
    right.sort((a, b) => a.originalIndex - b.originalIndex);

    const allBySide = [
      ...left.map((item, i) => ({ ...item, side: -1 as const, sideIndex: i, sideCount: left.length })),
      ...right.map((item, i) => ({ ...item, side: 1 as const, sideIndex: i, sideCount: right.length })),
    ];

    const trunkSpan = Math.max(180, trunkBottomY - trunkTopY);
    const attachLow = trunkBottomY - trunkSpan * 0.18;
    const attachHigh = trunkTopY + trunkSpan * 0.18;

    const clampUpperAngle = (angle: number, side: -1 | 1) => {
      // Keep descendants in the crown: sideways/upwards, never hanging beneath the parent.
      if (side === 1) return Math.max(-1.58, Math.min(0.08, angle));
      return Math.max(-3.22, Math.min(-1.58, angle));
    };

    const placeChildren = (
      parentNote: Note,
      parentX: number,
      parentY: number,
      outwardAngle: number,
      color: string,
      depth: number,
      branchRootId: string,
      side: -1 | 1,
      branchZ: number,
    ) => {
      const children = notes.filter((n) => n.parentNoteId === parentNote.id);
      const expanded = parentNote.isCollapsed === false && children.length > 0;
      if (!expanded) return;

      const count = children.length;
      const spread = Math.min(depth === 1 ? 1.5 : 1.18, 0.5 + count * 0.12);
      const baseRadius = isMobile
        ? depth === 1
          ? 92
          : Math.max(68, 88 - depth * 5)
        : depth === 1
          ? 132
          : Math.max(86, 116 - depth * 7);
      const radius = baseRadius + Math.min(isMobile ? 42 : 88, count * (isMobile ? 5 : 8));

      children.forEach((child, i) => {
        const t = count === 1 ? 0 : i / (count - 1) - 0.5;
        // Small deterministic radius variation makes the crown less diagrammatic while
        // preserving predictable positions between renders.
        const radialJitter = ((i % 3) - 1) * (isMobile ? 8 : 15);
        const rawAngle = outwardAngle + t * spread;
        const angle = clampUpperAngle(rawAngle, side);
        const childR = radius + radialJitter;
        const x = parentX + Math.cos(angle) * childR;
        const y = parentY + Math.sin(angle) * childR;
        const childId = `note-${child.id}`;
        const parentId = `note-${parentNote.id}`;
        const childChildren = notes.filter((n) => n.parentNoteId === child.id);
        const childExpanded = child.isCollapsed === false && childChildren.length > 0;

        pos.push({
          id: childId,
          x,
          y,
          type: "note",
          label: child.title,
          color,
          categoryId: child.categoryId ?? undefined,
          noteId: child.id,
          parentNoteId: child.parentNoteId,
          noteType: child.noteType,
          hasChildren: childChildren.length > 0,
          isCollapsed: !childExpanded,
          isMain: false,
          depth,
          branchRootId,
          side,
          z: Math.max(0.62, branchZ - depth * 0.035),
        });
        parent[childId] = parentId;
        eds.push({ from: parentId, to: childId, kind: "branch" });

        placeChildren(child, x, y, angle, color, depth + 1, branchRootId, side, branchZ);
      });
    };

    allBySide.forEach((item, globalIndex) => {
      const { root, side, sideIndex, sideCount, originalIndex } = item;
      const color = colorForRoot(root, originalIndex);
      const sideT = sideCount <= 1 ? 0.5 : sideIndex / (sideCount - 1);

      // Branches emerge from the middle / upper trunk at distinct heights.
      const attachY = attachLow + (attachHigh - attachLow) * (0.22 + sideT * 0.68);
      const attachId = `attach-${root.id}`;
      const branchZ = 0.76 + ((originalIndex * 37) % 24) / 100; // 0.76..0.99

      pos.push({
        id: attachId,
        x: trunkX,
        y: attachY,
        type: "category",
        label: "",
        color,
        depth: -1,
        isVirtual: true,
        branchRootId: root.id,
        side,
        z: branchZ,
      });
      parent[attachId] = "root";

      // Main branches arc outward and upward from that shared trunk.
      const horizontal = isMobile ? Math.min(W * 0.28, 128) : Math.min(W * 0.24, 250);
      const vertical = isMobile ? 58 + sideT * 34 : 82 + sideT * 54;
      const mainX = trunkX + side * horizontal;
      const mainY = Math.max(trunkTopY + 42, attachY - vertical);
      const mainAngle = Math.atan2(mainY - attachY, mainX - trunkX);
      const children = notes.filter((n) => n.parentNoteId === root.id);
      const expanded = root.isCollapsed === false && children.length > 0;
      const mainId = `note-${root.id}`;

      pos.push({
        id: mainId,
        x: mainX,
        y: mainY,
        type: "note",
        label: root.title,
        color,
        categoryId: root.categoryId ?? undefined,
        noteId: root.id,
        parentNoteId: root.parentNoteId,
        noteType: root.noteType,
        hasChildren: children.length > 0,
        isCollapsed: !expanded,
        isMain: true,
        depth: 0,
        branchRootId: root.id,
        side,
        z: branchZ,
      });
      parent[mainId] = attachId;
      eds.push({ from: attachId, to: mainId, kind: "branch" });

      placeChildren(root, mainX, mainY, mainAngle, color, 1, root.id, side, branchZ);
    });

    return { positions: pos, edges: eds, parentMap: parent };
  }, [notes, categories, rootNotes, visibleRoots, brainName, size.w, size.h]);

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
    if (node.isVirtual) return 0;
    if (node.type === "root") return ROOT_R;
    if (node.type === "note" && node.isMain) return CAT_R;
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
      if (nodes.length === 0) return null;
      return nodes.reduce(
        (bounds, node) => {
          const r = getNodeRadius(node);
          const labelPadX = node.isVirtual ? 0 : node.type === "root" ? 86 : node.isMain ? 92 : 78;
          const labelPadY = node.isVirtual ? 0 : node.type === "root" ? 24 : node.isMain ? 20 : 16;
          return {
            minX: Math.min(bounds.minX, node.x - Math.max(r, labelPadX)),
            maxX: Math.max(bounds.maxX, node.x + Math.max(r, labelPadX)),
            minY: Math.min(bounds.minY, node.y - Math.max(r, labelPadY)),
            maxY: Math.max(bounds.maxY, node.y + Math.max(r, labelPadY)),
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
      const panelReserve = !isMobile && openPostIt ? 390 : 0;
      const availableW = Math.max(240, size.w - panelReserve - (isMobile ? 36 : 90));
      const availableH = Math.max(240, size.h - (isMobile ? 120 : 100));
      const branchW = Math.max(1, bounds.maxX - bounds.minX);
      const branchH = Math.max(1, bounds.maxY - bounds.minY);
      const zoom = Math.min(1.42, Math.max(0.88, Math.min(availableW / branchW, availableH / branchH) * 0.82));
      const targetX = (size.w - panelReserve) / 2;
      const targetY = size.h * 0.48;
      const branchCenterX = (bounds.minX + bounds.maxX) / 2;
      const branchCenterY = (bounds.minY + bounds.maxY) / 2;

      setViewZoom(zoom);
      setPan({ x: targetX - branchCenterX * zoom, y: targetY - branchCenterY * zoom });
    },
    [getNodesBounds, getSubtreeIds, positionsWithOffsets, size.w, size.h, openPostIt],
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
            lastExpandedRef.current = note.isCollapsed ? nodeId : null;
            lastCollapsedRef.current = note.isCollapsed ? null : nodeId;
            setFocusNoteId(note.isCollapsed ? nId : null);
            toggleNoteCollapsed(nId);
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
          setFocusNoteId(nId);
          // En escritorio el panel lateral ocupa la derecha: desplazamos el mapa
          // para que el nodo activo siga siendo visible.
          if (window.innerWidth >= 768) {
            const panelW = 400;
            const overlapX = clientX - (window.innerWidth - panelW - 24);
            if (overlapX > -40) setPan((p) => ({ x: p.x - (overlapX + 80), y: p.y }));
          }
          setOpenPostIt({ noteId: nId, x: clientX, y: clientY });
        } else if (nodeId === "root") {
          // single click on root opens rename
          setShowBrainDialog(true);
        }
      }, 240);
    },
    [contextMenu, notes, toggleNoteCollapsed, linkingNoteId, linkNotes],
  );

  // Smooth branch path. Main branches leave the shared trunk almost vertically
  // and then bend outward; inner ramifications continue in the direction of growth.
  const branchPath = (from: NodePos, to: NodePos, kind: "trunk" | "branch" = "branch") => {
    if (kind === "trunk") {
      const dy = to.y - from.y;
      return `M ${from.x} ${from.y - ROOT_R * 0.55} C ${from.x - 2} ${from.y + dy * 0.34}, ${to.x + 2} ${from.y + dy * 0.72}, ${to.x} ${to.y}`;
    }

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const leavesTrunk = from.isVirtual && from.id.startsWith("attach-");
    if (leavesTrunk) {
      const rise = Math.max(28, Math.abs(dy) * 0.42);
      return `M ${from.x} ${from.y} C ${from.x} ${from.y - rise}, ${to.x - dx * 0.26} ${to.y - dy * 0.08}, ${to.x} ${to.y}`;
    }

    return `M ${from.x} ${from.y} C ${from.x + dx * 0.3} ${from.y + dy * 0.16}, ${from.x + dx * 0.74} ${from.y + dy * 0.88}, ${to.x} ${to.y}`;
  };

  // Thin graphic lines rather than a literal / realistic trunk.
  const widthForDepth = (depth: number, isMain = false) => {
    if (depth < 0) return 2.7;
    if (isMain || depth === 0) return 2.35;
    return Math.max(0.95, 1.8 - depth * 0.18);
  };
  // Rama con protagonismo: subárbol de la raíz del nodo enfocado
  const focusIds = useMemo(() => {
    if (!focusNoteId) return null;
    let cur = notes.find((n) => n.id === focusNoteId);
    if (!cur) return null;
    while (cur.parentNoteId) {
      const p = notes.find((n) => n.id === cur!.parentNoteId);
      if (!p) break;
      cur = p;
    }
    const ids = new Set<string>(["root", "trunk-top", `attach-${cur.id}`]);
    const visit = (id: string) => {
      ids.add(`note-${id}`);
      notes.filter((n) => n.parentNoteId === id).forEach((c) => visit(c.id));
    };
    visit(cur.id);
    return ids;
  }, [focusNoteId, notes]);

  const dimFor = useCallback((id: string) => (focusIds && !focusIds.has(id) ? 0.16 : 1), [focusIds]);

  // Nivel de detalle según zoom: con la vista alejada solo ramas principales
  const showLeafLabels = viewZoom > 0.62;

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
      className="flex-1 h-full w-full canvas-wash overflow-hidden relative select-none"
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
        if (openPostIt) {
          setOpenPostIt(null);
          setFocusNoteId(null);
        }
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
        {/* Shared trunk + organic ramifications. Thin lines, no literal tree illustration. */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0, overflow: "visible" }}>
          <defs>
            <filter id="branch-soft-depth" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.15" />
            </filter>
          </defs>

          {edges.map((edge, idx) => {
            const from = getPos(edge.from);
            const to = getPos(edge.to);
            if (!from || !to) return null;

            const kind = edge.kind ?? "branch";
            const isTrunk = kind === "trunk";
            const isMain = to.type === "note" && to.isMain;
            const width = isTrunk ? 2.75 : widthForDepth(to.depth, isMain);
            const z = Math.min(from.z ?? 1, to.z ?? 1);
            const focusDim = isTrunk ? 1 : Math.min(dimFor(edge.from), dimFor(edge.to));
            const isActive = !!focusIds && focusIds.has(edge.to);
            const baseOpacity = isTrunk ? 0.5 : isMain ? 0.78 : 0.56;
            const opacity = isActive ? Math.min(0.96, baseOpacity + 0.16) : baseOpacity * z * focusDim;
            const stroke = isTrunk ? "hsl(262 32% 58%)" : `hsl(${to.color})`;
            const d = branchPath(from, to, kind);

            return (
              <g key={`be-${idx}`} style={{ opacity, transition: "opacity 320ms ease" }}>
                {/* very soft under-line gives depth without neon */}
                {!isTrunk && (
                  <path
                    d={d}
                    fill="none"
                    stroke={stroke}
                    strokeWidth={width + 3.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={isActive ? 0.09 : 0.045}
                    filter="url(#branch-soft-depth)"
                  />
                )}
                <path
                  d={d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* one restrained highlight is enough for the 2.5D feel */}
                {!isTrunk && z > 0.82 && (
                  <path
                    d={d}
                    fill="none"
                    stroke="hsl(0 0% 100%)"
                    strokeWidth={Math.max(0.45, width * 0.28)}
                    strokeLinecap="round"
                    opacity={0.22}
                    transform="translate(-0.35 -0.55)"
                  />
                )}
              </g>
            );
          })}

          {/* Cross-links stay secondary to the actual hierarchy. */}
          {linkEdges.map((edge, idx) => {
            const from = getPos(edge.from);
            const to = getPos(edge.to);
            if (!from || !to) return null;
            return (
              <path
                key={`le-${idx}`}
                d={branchPath(from, to, "branch")}
                fill="none"
                stroke="hsl(var(--muted-foreground) / 0.30)"
                strokeWidth={1}
                strokeDasharray="4 6"
                strokeLinecap="round"
                style={{ opacity: Math.min(dimFor(edge.from), dimFor(edge.to)), transition: "opacity 320ms ease" }}
              />
            );
          })}
        </svg>

        {/* Labels are the nodes: small, readable and sitting directly on the ramifications. */}
        <AnimatePresence>
          {positionsWithOffsets.map((node) => {
            if (node.isVirtual) return null;

            const isRoot = node.type === "root";
            const isMainNote = node.type === "note" && node.isMain;
            const nodeNote = node.noteId ? notes.find((n) => n.id === node.noteId) : null;
            const childCount = nodeNote ? notes.filter((n) => n.parentNoteId === nodeNote.id).length : 0;
            const dim = dimFor(node.id);
            const z = node.z ?? 1;
            const isFocused = !!focusIds && focusIds.has(node.id);
            const isLinkSource = linkingNoteId && node.noteId === linkingNoteId;
            const showChildLabel = isMainNote || showLeafLabels || isFocused;
            const baseScale = focusIds ? (isFocused ? (isMainNote ? 1.06 : 1.025) : 0.96) : 0.96 + z * 0.04;
            const visualOpacity = dim * (focusIds ? 1 : Math.max(0.68, z));

            return (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                  opacity: visualOpacity,
                  scale: baseScale,
                  left: node.x,
                  top: node.y,
                }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={
                  dragState.current?.nodeId === node.id
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 290, damping: 28 }
                }
                className="absolute cursor-grab active:cursor-grabbing touch-none"
                data-graph-node
                style={{
                  width: 1,
                  height: 1,
                  zIndex: isRoot ? 8 : isMainNote ? 6 : 4,
                  filter: dim < 1 ? "blur(0.55px)" : z < 0.82 ? "blur(0.18px)" : "none",
                  transition: "filter 300ms ease",
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
                {isRoot ? (
                  <div
                    className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-2xl border bg-card/95 px-5 py-2.5 font-display font-semibold text-foreground shadow-sm"
                    style={{
                      borderColor: "hsl(262 30% 70% / 0.55)",
                      boxShadow: "0 8px 26px hsl(262 30% 40% / 0.10)",
                    }}
                  >
                    {node.label}
                  </div>
                ) : showChildLabel ? (
                  <div
                    className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center whitespace-nowrap rounded-full border bg-card/95 font-body text-foreground shadow-sm transition-shadow ${
                      isMainNote
                        ? "gap-2 px-3 py-1.5 text-[12px] font-semibold"
                        : "gap-1.5 px-2.5 py-1 text-[10px] font-medium"
                    } ${isLinkSource ? "ring-2 ring-primary/50 ring-offset-2 ring-offset-background" : ""}`}
                    style={{
                      borderColor: `hsl(${node.color} / ${isFocused ? 0.72 : isMainNote ? 0.48 : 0.3})`,
                      boxShadow: isFocused
                        ? `0 5px 18px hsl(${node.color} / 0.18)`
                        : `0 3px 12px hsl(${node.color} / 0.08)`,
                    }}
                  >
                    <span
                      className={isMainNote ? "h-2 w-2 shrink-0 rounded-full" : "h-1.5 w-1.5 shrink-0 rounded-full"}
                      style={{ backgroundColor: `hsl(${node.color})` }}
                    />
                    {nodeNote?.icon && <span className="text-[10px] leading-none opacity-80">{nodeNote.icon}</span>}
                    <span className="max-w-[150px] overflow-hidden text-ellipsis">{node.label}</span>
                    {childCount > 0 && (
                      <span className="ml-0.5 text-[9px] font-normal text-muted-foreground">{childCount}</span>
                    )}
                  </div>
                ) : (
                  <span
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-card"
                    style={{
                      width: 6,
                      height: 6,
                      backgroundColor: `hsl(${node.color})`,
                      boxShadow: `0 2px 7px hsl(${node.color} / 0.16)`,
                    }}
                  />
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
            className="fixed z-50 surface-panel rounded-2xl py-1 min-w-[170px]"
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

            {contextMenu.nodeId.startsWith("note-") &&
              (() => {
                const nId = contextMenu.nodeId.replace("note-", "");
                const note = notes.find((n) => n.id === nId);
                if (!note) return null;
                return (
                  <>
                    <button
                      onClick={() => {
                        setNewNoteDialog({ parentNoteId: nId, type: "text" });
                        setContextMenu(null);
                      }}
                      className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                    >
                      <FileText size={12} />
                      Añadir hija (texto)
                    </button>
                    <button
                      onClick={() => {
                        setNewNoteDialog({ parentNoteId: nId, type: "checklist" });
                        setContextMenu(null);
                      }}
                      className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                    >
                      <ListChecks size={12} />
                      Añadir hija (lista)
                    </button>
                    <button
                      onClick={() => {
                        setMovingNoteId(nId);
                        setContextMenu(null);
                      }}
                      className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                    >
                      <Move size={12} />
                      Mover a...
                    </button>
                    <button
                      onClick={() => {
                        setEditingCat({ id: nId, name: note.title });
                        setContextMenu(null);
                      }}
                      className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                    >
                      <Pencil size={12} />
                      Renombrar
                    </button>
                    {!note.parentNoteId && (
                      <button
                        onClick={() => {
                          setColorPickerCat({ id: nId, x: contextMenu.x, y: contextMenu.y });
                          setContextMenu(null);
                        }}
                        className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                      >
                        <Palette size={12} />
                        Cambiar color
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setIconPickerCat({ id: nId, x: contextMenu.x, y: contextMenu.y });
                        setContextMenu(null);
                      }}
                      className="w-full text-left text-sm md:text-xs px-3 py-3 md:py-2 min-h-11 md:min-h-0 hover:bg-muted flex items-center gap-2 font-body text-foreground"
                    >
                      <span className="text-sm leading-none">🙂</span>Cambiar icono
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
          className="fixed z-50 surface-panel rounded-2xl p-3"
          style={{ left: Math.min(colorPickerCat.x, size.w - 180), top: Math.min(colorPickerCat.y, size.h - 140) }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-body text-muted-foreground mb-2">Elige un color</p>
          <ColorPicker
            value={notes.find((n) => n.id === colorPickerCat.id)?.color || DEFAULT_CATEGORY_COLOR}
            onChange={(color) => {
              updateNote(colorPickerCat.id, { color });
              setColorPickerCat(null);
            }}
          />
        </div>
      )}

      {/* Icon picker (category) */}
      {iconPickerCat && (
        <div
          className="fixed z-50 surface-panel rounded-2xl p-3"
          style={{ left: Math.min(iconPickerCat.x, size.w - 280), top: Math.min(iconPickerCat.y, size.h - 260) }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-body text-muted-foreground mb-2">Elige un icono</p>
          <EmojiPicker
            value={notes.find((n) => n.id === iconPickerCat.id)?.icon || undefined}
            onChange={(icon) => {
              updateNote(iconPickerCat.id, { icon });
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
          className="p-2.5 md:p-2 min-h-11 min-w-11 md:min-h-0 md:min-w-0 rounded-xl surface-glass hover:bg-muted/40 text-muted-foreground transition-all flex items-center justify-center"
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
            }}
            className="p-2.5 md:p-2 min-h-11 min-w-11 md:min-h-0 md:min-w-0 rounded-xl surface-glass hover:bg-muted/40 text-muted-foreground transition-all flex items-center justify-center"
            title={user ? "Perfil" : "Iniciar sesión"}
          >
            <UserIcon size={16} />
          </button>
          {showProfileMenu && (
            <div
              className="absolute right-0 top-12 surface-panel rounded-2xl py-1 min-w-[200px]"
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
            setFocusNoteId(null);
            fitFullTree();
            setShowFilterPanel(false);
          }}
          className="p-2.5 md:p-2 min-h-11 min-w-11 md:min-h-0 md:min-w-0 rounded-xl surface-glass hover:bg-muted/40 text-muted-foreground transition-all flex items-center justify-center"
          title="Restablecer vista del árbol"
        >
          <TreePine size={16} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowFilterPanel((v) => !v);
          }}
          className={`p-2.5 md:p-2 min-h-11 min-w-11 md:min-h-0 md:min-w-0 rounded-xl surface-glass hover:bg-muted/40 transition-all flex items-center justify-center ${
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
            setCreateDialog({ x: size.w / 2, y: size.h / 2 });
            setShowFilterPanel(false);
          }}
          className="p-2.5 md:p-2 min-h-11 min-w-11 md:min-h-0 md:min-w-0 rounded-xl surface-glass hover:bg-muted/40 text-muted-foreground transition-all flex items-center justify-center"
          title="Crear nuevo"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Filter panel */}
      {showFilterPanel && (
        <div
          className="fixed top-16 right-3 z-30 surface-panel rounded-2xl p-3 space-y-2 min-w-[220px] max-h-[60vh] overflow-y-auto"
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
          {rootNotes.length === 0 && (
            <p className="text-sm md:text-[11px] font-body text-muted-foreground">No hay ramas aún.</p>
          )}
          {rootNotes.map((cat) => {
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
                  style={{
                    backgroundColor: `hsl(${cat.color || DEFAULT_CATEGORY_COLOR})`,
                    borderColor: `hsl(${cat.color || DEFAULT_CATEGORY_COLOR})`,
                  }}
                />
                <span className="flex-1 truncate text-foreground">
                  {cat.icon || ""} {cat.title}
                </span>
                <span className="text-xs md:text-[10px] text-muted-foreground">{hidden ? "oculto" : "visible"}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Edit category name */}
      {editingCat && (
        <div
          className="fixed top-16 right-3 z-30 surface-panel rounded-2xl p-3 space-y-2 min-w-[200px]"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            value={editingCat.name}
            onChange={(e) => setEditingCat({ ...editingCat, name: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter" && editingCat.name.trim()) {
                updateNote(editingCat.id, { title: editingCat.name.trim() });
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
                  updateNote(editingCat.id, { title: editingCat.name.trim() });
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
      {rootNotes.length === 0 && !loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <p className="text-5xl mb-3">🌳</p>
            <p className="font-display text-xl">Empieza tu árbol</p>
            <p className="text-sm mt-1 font-body">Pulsa + para crear tu primera rama</p>
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
              setFocusNoteId(null);
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
          const { parentNoteId, type } = newNoteDialog;
          setNewNoteDialog(null);
          const created = await addNote(null, parentNoteId, type);
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

      <MoveToDialog
        open={movingNoteId !== null}
        noteId={movingNoteId}
        notes={notes}
        brainName={brainName}
        onMove={async (targetId) => {
          if (!movingNoteId) return;
          const id = movingNoteId;
          setMovingNoteId(null);
          await moveNote(id, targetId);
        }}
        onCancel={() => setMovingNoteId(null)}
      />
    </div>
  );
};

export default GraphView;
