// ExoBrain tree geometry V3
//
// Objetivo de esta versión: estabilidad visual antes que "crecimiento" procedural.
// No usa spread/jitter/ángulos aleatorios para colocar hijos.
// Cada rama raíz ocupa una zona fija de un lado del tronco y cada subárbol se
// distribuye con un layout tidy (subárboles hermanos nunca comparten el mismo
// intervalo vertical). Los paths son segmentos independientes que empiezan y
// terminan exactamente en sus junctions.

export type Vec = { x: number; y: number };

/**
 * Motivos de curva suaves extraídos del Group 8.svg original y normalizados.
 * Se usan únicamente para dar el lenguaje de línea; NUNCA deciden la posición
 * de los nodos.
 */
export interface BranchMotif {
  c: number[][][];
  bend: number;
}

const SAFE_MOTIFS: BranchMotif[] = [
  {
    c: [
      [
        [0.0734, -0.0222],
        [0.2497, -0.0539],
        [0.3681, -0.0029],
      ],
      [
        [0.5161, 0.0609],
        [0.6373, 0.1351],
        [1, 0],
      ],
    ],
    bend: 0.0195,
  },
  {
    c: [
      [
        [0.1088, 0.0133],
        [0.2444, 0.0344],
        [0.4564, -0.0282],
      ],
      [
        [0.5971, -0.0699],
        [0.8054, -0.126],
        [1, 0],
      ],
    ],
    bend: -0.0294,
  },
  {
    c: [
      [
        [0.1262, 0.0219],
        [0.267, 0.0591],
        [0.3786, 0.0656],
      ],
      [
        [0.6658, 0.0821],
        [0.7087, -0.0504],
        [1, 0],
      ],
    ],
    bend: 0.0297,
  },
  {
    c: [
      [
        [0.0776, 0.033],
        [0.6508, 0.0876],
        [1, 0],
      ],
    ],
    bend: 0.0402,
  },
];

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
};

export const motifPath = (from: Vec, to: Vec, motif: BranchMotif, mirror: boolean): string => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;

  const ca = dx / len;
  const sa = dy / len;
  const m = mirror ? -1 : 1;

  const map = (p: number[]) => {
    const px = p[0] * len;
    const py = p[1] * m * len;

    return {
      x: from.x + px * ca - py * sa,
      y: from.y + px * sa + py * ca,
    };
  };

  let d = `M ${from.x.toFixed(2)} ${from.y.toFixed(2)}`;

  motif.c.forEach((seg) => {
    const c1 = map(seg[0]);
    const c2 = map(seg[1]);
    const end = map(seg[2]);

    d += ` C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)}, ${c2.x.toFixed(
      2,
    )} ${c2.y.toFixed(2)}, ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  });

  return d;
};

const safeMotifFor = (seed: string, depth: number) => {
  const available = depth <= 1 ? SAFE_MOTIFS.slice(0, 2) : SAFE_MOTIFS;

  return available[Math.floor(hash(seed) * available.length) % available.length];
};

export interface TreeJunction {
  id: string;
  x: number;
  y: number;
  noteId?: string;
  branchRootId?: string;
  depth: number;
  angle: number;
}

export interface BranchSegment {
  id: string;
  fromJunctionId: string;
  toJunctionId: string;
  d: string;
  branchRootId: string;
  depth: number;
  kind: "trunk" | "branch";
  motif: BranchMotif;
  mirror: boolean;
}

export interface TreeNoteInput {
  id: string;
  parentId: string | null;
  color?: string | null;
}

export interface SkeletonOptions {
  rootX?: number;
  rootY?: number;
  canvasWidth?: number;
  canvasHeight?: number;
  compact?: boolean;
  collapsed?: Set<string>;
  hiddenRootIds?: Set<string>;
}

export interface TreeSkeleton {
  junctions: TreeJunction[];
  segments: BranchSegment[];
  byNote: Map<string, TreeJunction>;
  rootJunction: TreeJunction;
  branchRootOf: Map<string, string>;
}

type Side = -1 | 1;

type Band = {
  minY: number;
  maxY: number;
};

type RootSlot = {
  note: TreeNoteInput;
  originalIndex: number;
  side: Side;
  band: Band;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const buildTreeSkeleton = (notes: TreeNoteInput[], opts: SkeletonOptions = {}): TreeSkeleton => {
  const W = Math.max(320, opts.canvasWidth ?? 1200);
  const H = Math.max(480, opts.canvasHeight ?? 800);

  const rootX = opts.rootX ?? W / 2;
  const rootY = opts.rootY ?? H - 84;

  const compact = !!opts.compact;
  const collapsed = opts.collapsed ?? new Set<string>();
  const hidden = opts.hiddenRootIds ?? new Set<string>();

  const childrenOf = new Map<string | null, TreeNoteInput[]>();

  notes.forEach((note) => {
    const key = note.parentId ?? null;
    const list = childrenOf.get(key);

    if (list) {
      list.push(note);
    } else {
      childrenOf.set(key, [note]);
    }
  });

  const visibleChildren = (id: string) => (collapsed.has(id) ? [] : (childrenOf.get(id) ?? []));

  const leafCache = new Map<string, number>();

  const leafCount = (id: string): number => {
    const cached = leafCache.get(id);

    if (cached !== undefined) {
      return cached;
    }

    const kids = visibleChildren(id);

    const value = kids.length === 0 ? 1 : kids.reduce((sum, kid) => sum + leafCount(kid.id), 0);

    leafCache.set(id, value);

    return value;
  };

  const depthCache = new Map<string, number>();

  const subtreeDepth = (id: string): number => {
    const cached = depthCache.get(id);

    if (cached !== undefined) {
      return cached;
    }

    const kids = visibleChildren(id);

    const value = kids.length === 0 ? 1 : 1 + Math.max(...kids.map((kid) => subtreeDepth(kid.id)));

    depthCache.set(id, value);

    return value;
  };

  const allRoots = (childrenOf.get(null) ?? []).filter((root) => !hidden.has(root.id));

  const junctions: TreeJunction[] = [];
  const segments: BranchSegment[] = [];

  const byNote = new Map<string, TreeJunction>();
  const branchRootOf = new Map<string, string>();

  const rootJunction: TreeJunction = {
    id: "trunk-root",
    x: rootX,
    y: rootY,
    depth: 0,
    angle: -Math.PI / 2,
  };

  junctions.push(rootJunction);

  if (allRoots.length === 0) {
    return {
      junctions,
      segments,
      byNote,
      rootJunction,
      branchRootOf,
    };
  }

  // ---------------------------------------------------------------------------
  // 1) Reserva de espacio por rama raíz.
  // Cada lado se reparte en bandas verticales disjuntas.
  // ---------------------------------------------------------------------------

  const canopyTop = compact ? 54 : 46;
  const canopyBottom = rootY - (compact ? 78 : 72);

  const sideGroups: Record<
    "left" | "right",
    {
      note: TreeNoteInput;
      originalIndex: number;
      side: Side;
    }[]
  > = {
    left: [],
    right: [],
  };

  allRoots.forEach((note, originalIndex) => {
    const side: Side = originalIndex % 2 === 0 ? 1 : -1;

    if (side === 1) {
      sideGroups.right.push({
        note,
        originalIndex,
        side,
      });
    } else {
      sideGroups.left.push({
        note,
        originalIndex,
        side,
      });
    }
  });

  const slots: RootSlot[] = [];

  const allocateSide = (items: typeof sideGroups.left) => {
    if (items.length === 0) {
      return;
    }

    const gap = compact ? 18 : 28;

    const totalHeight = Math.max(160, canopyBottom - canopyTop - gap * (items.length - 1));

    const weights = items.map(({ note }) => Math.max(1, Math.pow(leafCount(note.id), 0.72)));

    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0) || 1;

    let cursor = canopyBottom;

    items.forEach((item, index) => {
      const height = totalHeight * (weights[index] / totalWeight);

      const minY = Math.max(canopyTop, cursor - height);
      const maxY = cursor;

      slots.push({
        ...item,
        band: {
          minY,
          maxY,
        },
      });

      cursor = minY - gap;
    });
  };

  allocateSide(sideGroups.left);
  allocateSide(sideGroups.right);

  // ---------------------------------------------------------------------------
  // 2) Layout del subárbol dentro de cada banda.
  // ---------------------------------------------------------------------------

  const notePositions = new Map<
    string,
    {
      x: number;
      y: number;
      depth: number;
      side: Side;
      rootId: string;
    }
  >();

  const layoutRoot = (slot: RootSlot) => {
    const { note: root, side, band } = slot;

    const leaves = Math.max(1, leafCount(root.id));
    const maxDepth = Math.max(1, subtreeDepth(root.id));

    const bandPad = compact ? 10 : 14;

    const usableMinY = band.minY + bandPad;
    const usableMaxY = band.maxY - bandPad;

    const bandHeight = Math.max(20, usableMaxY - usableMinY);

    const leafStep = leaves <= 1 ? 0 : bandHeight / (leaves - 1);

    let leafCursor = 0;

    const halfWidth = Math.max(140, Math.min(W * 0.44, compact ? 300 : 560));

    const rootLead = clamp(halfWidth * 0.18, compact ? 58 : 82, compact ? 78 : 112);

    const depthGap = clamp(
      (halfWidth - rootLead - 26) / Math.max(1, maxDepth - 1),
      compact ? 42 : 54,
      compact ? 72 : 96,
    );

    const assign = (node: TreeNoteInput, depthFromRoot: number): number => {
      const kids = visibleChildren(node.id);

      let y: number;

      if (kids.length === 0) {
        y = leaves <= 1 ? (usableMinY + usableMaxY) / 2 : usableMinY + leafCursor * leafStep;

        leafCursor += 1;
      } else {
        const childYs = kids.map((kid) => assign(kid, depthFromRoot + 1));

        y = childYs.reduce((sum, value) => sum + value, 0) / childYs.length;

        if (kids.length === 1) {
          const sign = depthFromRoot % 2 === 0 ? -1 : 1;

          y = clamp(y + sign * (compact ? 7 : 10), usableMinY, usableMaxY);
        }
      }

      const x = rootX + side * (rootLead + depthFromRoot * depthGap);

      notePositions.set(node.id, {
        x,
        y,
        depth: depthFromRoot + 1,
        side,
        rootId: root.id,
      });

      return y;
    };

    assign(root, 0);
  };

  slots.forEach(layoutRoot);

  // ---------------------------------------------------------------------------
  // 3) Junctions del tronco.
  // ---------------------------------------------------------------------------

  const attachmentDrafts = allRoots
    .map((root, originalIndex) => {
      const position = notePositions.get(root.id)!;

      const sideOffset = position.side === 1 ? 12 : -12;

      return {
        root,
        originalIndex,
        y: clamp(position.y + (compact ? 14 : 20) + sideOffset, canopyTop + 18, rootY - 42),
      };
    })
    .sort((a, b) => b.y - a.y);

  for (let i = 1; i < attachmentDrafts.length; i++) {
    const previous = attachmentDrafts[i - 1];
    const current = attachmentDrafts[i];

    const minGap = compact ? 22 : 30;

    if (previous.y - current.y < minGap) {
      current.y = previous.y - minGap;
    }
  }

  const attachmentByRoot = new Map<string, TreeJunction>();

  let previousTrunk = rootJunction;

  attachmentDrafts.forEach((draft, trunkIndex) => {
    const wobble = trunkIndex % 2 === 0 ? -(compact ? 2 : 3) : compact ? 2 : 3;

    const attach: TreeJunction = {
      id: `attach-${draft.root.id}`,
      x: rootX + wobble,
      y: draft.y,
      depth: 0,
      angle: -Math.PI / 2,
    };

    junctions.push(attach);

    attachmentByRoot.set(draft.root.id, attach);

    const motif = SAFE_MOTIFS[0];

    segments.push({
      id: `trunk-seg-${trunkIndex}`,
      fromJunctionId: previousTrunk.id,
      toJunctionId: attach.id,
      d: motifPath(previousTrunk, attach, motif, trunkIndex % 2 === 1),
      branchRootId: "trunk",
      depth: 0,
      kind: "trunk",
      motif,
      mirror: trunkIndex % 2 === 1,
    });

    previousTrunk = attach;
  });

  const tip: TreeJunction = {
    id: "trunk-tip",
    x: rootX + (compact ? 1.5 : 2.5),
    y: Math.max(canopyTop + 8, previousTrunk.y - (compact ? 42 : 56)),
    depth: 0,
    angle: -Math.PI / 2,
  };

  junctions.push(tip);

  const tipMotif = SAFE_MOTIFS[0];

  segments.push({
    id: "trunk-tip-seg",
    fromJunctionId: previousTrunk.id,
    toJunctionId: tip.id,
    d: motifPath(previousTrunk, tip, tipMotif, false),
    branchRootId: "trunk",
    depth: 0,
    kind: "trunk",
    motif: tipMotif,
    mirror: false,
  });

  // ---------------------------------------------------------------------------
  // 4) Junctions de notas.
  // ---------------------------------------------------------------------------

  notePositions.forEach((position, noteId) => {
    const junction: TreeJunction = {
      id: `j-${noteId}`,
      x: position.x,
      y: position.y,
      noteId,
      branchRootId: position.rootId,
      depth: position.depth,
      angle: position.side === 1 ? 0 : Math.PI,
    };

    junctions.push(junction);

    byNote.set(noteId, junction);

    branchRootOf.set(noteId, position.rootId);
  });

  allRoots.forEach((root) => {
    const to = byNote.get(root.id);
    const from = attachmentByRoot.get(root.id);

    if (!from || !to) {
      return;
    }

    const position = notePositions.get(root.id)!;

    const motif = safeMotifFor(`root-${root.id}`, 1);

    const mirror = position.side === -1;

    segments.push({
      id: `branch-root-${root.id}`,
      fromJunctionId: from.id,
      toJunctionId: to.id,
      d: motifPath(from, to, motif, mirror),
      branchRootId: root.id,
      depth: 1,
      kind: "branch",
      motif,
      mirror,
    });
  });

  notes.forEach((note) => {
    if (!note.parentId) {
      return;
    }

    const from = byNote.get(note.parentId);

    const to = byNote.get(note.id);

    if (!from || !to) {
      return;
    }

    const position = notePositions.get(note.id)!;

    const motif = safeMotifFor(`child-${note.id}`, position.depth);

    const mirror = position.side === -1 ? hash(note.id) > 0.35 : hash(note.id) > 0.65;

    segments.push({
      id: `branch-${note.id}`,
      fromJunctionId: from.id,
      toJunctionId: to.id,
      d: motifPath(from, to, motif, mirror),
      branchRootId: position.rootId,
      depth: position.depth,
      kind: "branch",
      motif,
      mirror,
    });
  });

  return {
    junctions,
    segments,
    byNote,
    rootJunction,
    branchRootOf,
  };
};

export const strokeForDepth = (depth: number, kind: "trunk" | "branch") => {
  if (kind === "trunk") {
    return 1.7;
  }

  if (depth <= 1) {
    return 1.4;
  }

  if (depth === 2) {
    return 1.1;
  }

  return Math.max(0.68, 0.86 - (depth - 3) * 0.06);
};

export const BRANCH_PALETTE = [
  "247 100% 71%", // #7A6BFF
  "170 72% 57%", // #42E1C6
  "28 100% 71%", // #FFB06B
  "322 83% 72%", // #F57BC8
  "49 86% 66%", // #F3D75F
  "203 100% 71%",
  "267 75% 73%",
  "128 63% 69%",
];
