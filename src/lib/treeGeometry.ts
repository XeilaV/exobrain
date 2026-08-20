// ExoBrain tree geometry V3 — simple organic branching
//
// Esta versión NO usa:
// - sectores angulares
// - tidy layout por columnas
// - spread / jitter
// - forks procedurales
//
// La forma se construye de manera simple:
// 1. El tronco tiene puntos de salida fijos a distintas alturas.
// 2. Cada nota raíz sale a izquierda o derecha.
// 3. Cada nodo coloca a sus hijas con una plantilla fija según nº de hijas.
// 4. Cada hija vuelve a aplicar la misma regla.
// 5. Cada relación es una curva independiente que empieza exactamente en la madre
//    y termina exactamente en la hija.
//
// Resultado: una red de ramas repetible, estable y editable.

export type Vec = { x: number; y: number };

export interface BranchMotif {
  c: number[][][];
  bend: number;
}

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

type InternalPoint = {
  x: number;
  y: number;
  side: Side;
  depth: number;
  rootId: string;
};

/* -------------------------------------------------------------------------- */
/* Curvas                                                                      */
/* -------------------------------------------------------------------------- */

// Son suaves a propósito. La geometría del árbol la deciden las posiciones,
// no una curva complicada.
const CURVE_MOTIFS: BranchMotif[] = [
  {
    c: [
      [
        [0.24, -0.02],
        [0.7, 0.07],
        [1, 0],
      ],
    ],
    bend: 0.03,
  },
  {
    c: [
      [
        [0.2, 0.05],
        [0.72, -0.08],
        [1, 0],
      ],
    ],
    bend: -0.03,
  },
  {
    c: [
      [
        [0.3, -0.06],
        [0.66, 0.03],
        [1, 0],
      ],
    ],
    bend: 0.04,
  },
];

const hash = (value: string) => {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
};

const motifFor = (seed: string) => CURVE_MOTIFS[Math.floor(hash(seed) * CURVE_MOTIFS.length) % CURVE_MOTIFS.length];

// Se mantiene exportado porque GraphViewV3 lo usa como fallback al recalcular
// un path. El drag está desactivado actualmente, pero así no rompemos la API.
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

  motif.c.forEach((segment) => {
    const c1 = map(segment[0]);
    const c2 = map(segment[1]);
    const end = map(segment[2]);

    d += ` C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)}, ${c2.x.toFixed(
      2,
    )} ${c2.y.toFixed(2)}, ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  });

  return d;
};

// Curva de rama muy simple: empieza en el nodo madre y acaba en el nodo hija.
// Los controles solo suavizan el recorrido; NO cambian dónde están los nodos.
const organicBranchPath = (from: Vec, to: Vec, variant: number, main = false): string => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  const v = variant % 3;

  const firstX = main ? 0.16 : v === 0 ? 0.3 : v === 1 ? 0.24 : 0.34;
  const firstY = main ? 0.1 : v === 0 ? 0.08 : v === 1 ? 0.16 : 0.04;

  const secondX = main ? 0.68 : v === 0 ? 0.7 : v === 1 ? 0.64 : 0.76;
  const secondY = main ? 0.9 : v === 0 ? 0.92 : v === 1 ? 0.84 : 0.96;

  const c1x = from.x + dx * firstX;
  const c1y = from.y + dy * firstY;
  const c2x = from.x + dx * secondX;
  const c2y = from.y + dy * secondY;

  return `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(
    2,
  )} ${c2y.toFixed(2)}, ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
};

// Tronco casi vertical, con una desviación mínima.
const trunkPath = (from: Vec, to: Vec, index: number): string => {
  const wobble = index % 2 === 0 ? -2.5 : 2.5;
  const dy = to.y - from.y;

  return `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} C ${(from.x + wobble).toFixed(2)} ${(from.y + dy * 0.34).toFixed(
    2,
  )}, ${(to.x - wobble).toFixed(2)} ${(from.y + dy * 0.72).toFixed(2)}, ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
};

/* -------------------------------------------------------------------------- */
/* Plantillas de colocación                                                    */
/* -------------------------------------------------------------------------- */

// x = avance hacia fuera.
// y = apertura vertical respecto a la madre.
//
// Son deliberadamente asimétricas para que no parezca un organigrama.
// La plantilla completa puede invertirse verticalmente, pero sus puntos
// relativos no se recalculan.
const CHILD_LAYOUTS: Record<number, Array<{ x: number; y: number }>> = {
  1: [{ x: 1.0, y: -0.55 }],

  2: [
    { x: 0.86, y: -0.92 },
    { x: 1.1, y: 0.64 },
  ],

  3: [
    { x: 0.76, y: -1.3 },
    { x: 1.12, y: -0.14 },
    { x: 0.9, y: 1.06 },
  ],

  4: [
    { x: 0.72, y: -1.58 },
    { x: 1.04, y: -0.58 },
    { x: 1.16, y: 0.42 },
    { x: 0.8, y: 1.42 },
  ],

  5: [
    { x: 0.7, y: -1.78 },
    { x: 0.94, y: -0.98 },
    { x: 1.16, y: -0.14 },
    { x: 1.02, y: 0.76 },
    { x: 0.74, y: 1.62 },
  ],

  6: [
    { x: 0.68, y: -1.98 },
    { x: 0.88, y: -1.26 },
    { x: 1.1, y: -0.54 },
    { x: 1.16, y: 0.28 },
    { x: 0.96, y: 1.02 },
    { x: 0.7, y: 1.82 },
  ],

  7: [
    { x: 0.66, y: -2.14 },
    { x: 0.84, y: -1.46 },
    { x: 1.04, y: -0.8 },
    { x: 1.16, y: -0.1 },
    { x: 1.1, y: 0.62 },
    { x: 0.88, y: 1.32 },
    { x: 0.68, y: 2.02 },
  ],

  8: [
    { x: 0.64, y: -2.28 },
    { x: 0.82, y: -1.64 },
    { x: 1.0, y: -1.02 },
    { x: 1.14, y: -0.38 },
    { x: 1.17, y: 0.3 },
    { x: 1.04, y: 0.94 },
    { x: 0.84, y: 1.58 },
    { x: 0.66, y: 2.22 },
  ],
};

// Disposición fija de ramas principales.
// Con los 4 temas actuales da:
//
//   Ideas                 (derecha alta)
//   Reflexiones           (derecha media)
//   Tareas                (izquierda media)
//   Psico                 (izquierda baja)
//
// Al añadir más raíces sigue usando slots predefinidos antes de caer en el
// fallback.
const ROOT_SLOTS: Array<{
  side: Side;
  y: number;
  reach: number;
  endShift: number;
}> = [
  { side: -1, y: 0.73, reach: 0.18, endShift: -0.01 },
  { side: 1, y: 0.34, reach: 0.2, endShift: -0.02 },
  { side: 1, y: 0.5, reach: 0.22, endShift: 0.01 },
  { side: -1, y: 0.57, reach: 0.22, endShift: 0.01 },

  { side: -1, y: 0.4, reach: 0.19, endShift: -0.02 },
  { side: 1, y: 0.66, reach: 0.18, endShift: 0.02 },
  { side: -1, y: 0.27, reach: 0.17, endShift: -0.02 },
  { side: 1, y: 0.76, reach: 0.17, endShift: 0.02 },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const templateFor = (count: number) => {
  if (count <= 8) return CHILD_LAYOUTS[Math.max(1, count)];

  // Fallback únicamente para nodos con más de 8 hijas.
  // Mantiene la misma lógica: arco irregular hacia fuera.
  const result: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < count; i += 1) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const centered = t * 2 - 1;

    result.push({
      x: 0.66 + 0.5 * (1 - Math.abs(centered)),
      y: centered * 2.35,
    });
  }

  return result;
};

/* -------------------------------------------------------------------------- */
/* Generador                                                                   */
/* -------------------------------------------------------------------------- */

export const buildTreeSkeleton = (notes: TreeNoteInput[], opts: SkeletonOptions = {}): TreeSkeleton => {
  const W = Math.max(360, opts.canvasWidth ?? 1200);
  const H = Math.max(520, opts.canvasHeight ?? 800);

  const compact = !!opts.compact;
  const collapsed = opts.collapsed ?? new Set<string>();
  const hiddenRoots = opts.hiddenRootIds ?? new Set<string>();

  const rootX = opts.rootX ?? W / 2;
  const rootY = opts.rootY ?? H - (compact ? 92 : 84);

  const childrenOf = new Map<string | null, TreeNoteInput[]>();

  notes.forEach((note) => {
    const key = note.parentId ?? null;
    const current = childrenOf.get(key);

    if (current) current.push(note);
    else childrenOf.set(key, [note]);
  });

  const roots = (childrenOf.get(null) ?? []).filter((root) => !hiddenRoots.has(root.id));

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

  if (roots.length === 0) {
    return {
      junctions,
      segments,
      byNote,
      rootJunction,
      branchRootOf,
    };
  }

  const positions = new Map<string, InternalPoint>();
  const attachmentByRoot = new Map<string, TreeJunction>();

  // Paso horizontal según profundidad. La disminución es explícita y estable.
  const depthStep = (depth: number) => {
    const base = compact ? 78 : 108;
    const table = [base, base, base * 0.84, base * 0.7, base * 0.6, base * 0.52, base * 0.46];

    return table[Math.min(depth, table.length - 1)];
  };

  // Apertura vertical según profundidad.
  const verticalStep = (depth: number) => {
    const base = compact ? 34 : 46;
    const table = [base, base, base * 0.88, base * 0.76, base * 0.66, base * 0.58, base * 0.52];

    return table[Math.min(depth, table.length - 1)];
  };

  const fallbackRootSlot = (index: number) => {
    const extraIndex = index - ROOT_SLOTS.length;
    const side: Side = extraIndex % 2 === 0 ? -1 : 1;

    // Los extras se intercalan de forma fija en la parte superior.
    const row = Math.floor(extraIndex / 2);
    const y = clamp(0.22 + row * 0.075, 0.18, 0.82);

    return {
      side,
      y,
      reach: 0.16,
      endShift: row % 2 === 0 ? -0.015 : 0.015,
    };
  };

  // 1) Colocar raíces y sus puntos de salida del tronco.
  roots.forEach((root, index) => {
    const slot = ROOT_SLOTS[index] ?? fallbackRootSlot(index);

    const attachY = clamp(H * slot.y, compact ? 70 : 82, rootY - (compact ? 56 : 70));

    const attachment: TreeJunction = {
      id: `attach-${root.id}`,
      x: rootX,
      y: attachY,
      depth: 0,
      angle: -Math.PI / 2,
    };

    junctions.push(attachment);
    attachmentByRoot.set(root.id, attachment);

    const reachPx = clamp(W * slot.reach, compact ? 88 : 145, compact ? 150 : 245);

    const rootPoint: InternalPoint = {
      x: rootX + slot.side * reachPx,
      y: attachY + H * slot.endShift,
      side: slot.side,
      depth: 1,
      rootId: root.id,
    };

    positions.set(root.id, rootPoint);
  });

  // 2) Colocar hijas recursivamente usando SOLO plantillas.
  const placeChildren = (parent: TreeNoteInput, parentPoint: InternalPoint) => {
    if (collapsed.has(parent.id)) return;

    const children = childrenOf.get(parent.id) ?? [];
    if (children.length === 0) return;

    const layout = templateFor(children.length);
    const stepX = depthStep(parentPoint.depth);
    const stepY = verticalStep(parentPoint.depth);

    // Una inversión vertical completa da variedad, pero mantiene intacta la
    // plantilla. No hay ruido individual por hija.
    const flipY = hash(`${parent.id}-layout`) > 0.5 ? -1 : 1;

    children.forEach((child, index) => {
      const slot = layout[index];
      const point: InternalPoint = {
        x: parentPoint.x + parentPoint.side * stepX * slot.x,
        y: parentPoint.y + stepY * slot.y * flipY,
        side: parentPoint.side,
        depth: parentPoint.depth + 1,
        rootId: parentPoint.rootId,
      };

      positions.set(child.id, point);
      placeChildren(child, point);
    });
  };

  roots.forEach((root) => {
    const point = positions.get(root.id);
    if (point) placeChildren(root, point);
  });

  // 3) Crear junctions reales de notas.
  positions.forEach((point, noteId) => {
    const junction: TreeJunction = {
      id: `j-${noteId}`,
      x: point.x,
      y: point.y,
      noteId,
      branchRootId: point.rootId,
      depth: point.depth,
      angle: point.side === 1 ? 0 : Math.PI,
    };

    junctions.push(junction);
    byNote.set(noteId, junction);
    branchRootOf.set(noteId, point.rootId);
  });

  // 4) Tronco segmentado. Los puntos de unión se ordenan de abajo arriba.
  const orderedAttachments = roots
    .map((root) => attachmentByRoot.get(root.id))
    .filter((value): value is TreeJunction => !!value)
    .sort((a, b) => b.y - a.y);

  let previousTrunk: TreeJunction = rootJunction;

  orderedAttachments.forEach((attachment, index) => {
    const motif = CURVE_MOTIFS[0];

    segments.push({
      id: `trunk-${index}`,
      fromJunctionId: previousTrunk.id,
      toJunctionId: attachment.id,
      d: trunkPath(previousTrunk, attachment, index),
      branchRootId: "trunk",
      depth: 0,
      kind: "trunk",
      motif,
      mirror: false,
    });

    previousTrunk = attachment;
  });

  // Pequeña continuación superior del tronco.
  const trunkTip: TreeJunction = {
    id: "trunk-tip",
    x: rootX,
    y: Math.max(compact ? 38 : 48, previousTrunk.y - (compact ? 56 : 78)),
    depth: 0,
    angle: -Math.PI / 2,
  };

  junctions.push(trunkTip);

  segments.push({
    id: "trunk-tip-segment",
    fromJunctionId: previousTrunk.id,
    toJunctionId: trunkTip.id,
    d: trunkPath(previousTrunk, trunkTip, orderedAttachments.length),
    branchRootId: "trunk",
    depth: 0,
    kind: "trunk",
    motif: CURVE_MOTIFS[0],
    mirror: false,
  });

  // 5) Rama principal de cada raíz.
  roots.forEach((root, index) => {
    const from = attachmentByRoot.get(root.id);
    const to = byNote.get(root.id);

    if (!from || !to) return;

    const motif = motifFor(`root-${root.id}`);

    segments.push({
      id: `root-branch-${root.id}`,
      fromJunctionId: from.id,
      toJunctionId: to.id,
      d: organicBranchPath(from, to, index, true),
      branchRootId: root.id,
      depth: 1,
      kind: "branch",
      motif,
      mirror: false,
    });
  });

  // 6) Una curva independiente por relación madre -> hija.
  notes.forEach((note) => {
    if (!note.parentId) return;

    const from = byNote.get(note.parentId);
    const to = byNote.get(note.id);

    if (!from || !to) return;

    const point = positions.get(note.id);
    if (!point) return;

    const variant = Math.floor(hash(note.id) * 3);
    const motif = motifFor(note.id);

    segments.push({
      id: `branch-${note.id}`,
      fromJunctionId: from.id,
      toJunctionId: to.id,
      d: organicBranchPath(from, to, variant, false),
      branchRootId: point.rootId,
      depth: point.depth,
      kind: "branch",
      motif,
      mirror: false,
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
  if (kind === "trunk") return 1.55;
  if (depth <= 1) return 1.3;
  if (depth === 2) return 1.05;
  if (depth === 3) return 0.86;
  return 0.72;
};
