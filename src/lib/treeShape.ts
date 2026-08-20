// Forma del árbol inspirada en Group-8-2.svg:
// tronco vertical azul, racimos que salen a los lados alternando (der/der/izq/izq),
// ramas con curva en S de tangente horizontal, grosor uniforme y tramos que se
// acortan al alejarse del tronco. Geometría determinista: ni selección ni zoom la
// modifican.

export type Vec = { x: number; y: number };

export type SegmentKind = "trunk" | "connector" | "branch";

export interface TreeJunction {
  id: string;
  x: number;
  y: number;
  noteId?: string;
  branchRootId?: string;
  depth: number;
  side?: -1 | 1;
}

export interface BranchSegment {
  id: string;
  fromJunctionId: string;
  toJunctionId: string;
  d: string;
  branchRootId: string;
  depth: number;
  kind: SegmentKind;
}

export interface TreeNoteInput {
  id: string;
  parentId: string | null;
  color?: string | null;
}

export interface SkeletonOptions {
  rootX?: number;
  rootY?: number;
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

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Hash estable: solo se usa para microvariaciones de forma, nunca para la topología. */
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
};

/**
 * Curva de un segmento. Se recalcula también tras arrastrar un nodo, de modo que
 * línea y nodo comparten siempre las mismas coordenadas finales.
 */
export const segmentPath = (from: Vec, to: Vec, kind: SegmentKind = "branch", seed = ""): string => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const M = `M ${from.x.toFixed(2)} ${from.y.toFixed(2)}`;
  const C = (c1: Vec, c2: Vec) =>
    `${M} C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)}, ${c2.x.toFixed(2)} ${c2.y.toFixed(2)}, ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;

  if (kind === "trunk") {
    // Tronco casi recto, con una inflexión mínima para que no parezca una regla.
    return C(
      { x: from.x + dx * 0.12, y: from.y + dy * 0.36 },
      { x: to.x - dx * 0.12, y: from.y + dy * 0.74 },
    );
  }

  if (kind === "connector") {
    // Salida azul del tronco hacia la raíz del tema: acompaña al tronco y luego
    // se abre lateralmente, como en el SVG de referencia.
    return C(
      { x: from.x + dx * 0.06, y: from.y + dy * 0.55 },
      { x: from.x + dx * 0.62, y: to.y - dy * 0.08 },
    );
  }

  // Rama de color: sale casi horizontal de la bifurcación, ondula levemente y
  // llega tangente al nodo hijo.
  const side = dx >= 0 ? 1 : -1;
  const dist = Math.hypot(dx, dy) || 1;
  const handle = Math.max(20, Math.abs(dx) * 0.5);
  const wobble = (hash(`${seed}-w`) - 0.5) * Math.min(24, dist * 0.26);

  return C(
    { x: from.x + side * handle, y: from.y + dy * 0.1 + wobble },
    { x: to.x - side * Math.max(16, Math.abs(dx) * 0.34), y: to.y - dy * 0.08 - wobble },
  );
};

interface RootSector {
  side: -1 | 1;
  rootY: number;
  bandTop: number;
  bandBottom: number;
  attachYOffset: number;
}

interface RootPlacement {
  side: -1 | 1;
  orderFromBottom: number;
}

/**
 * Posición conceptual de cada racimo, siguiendo el reparto del SVG:
 * dos racimos a la derecha y dos espejados a la izquierda.
 */
const placementForRoot = (index: number, total: number): RootPlacement => {
  if (total === 1) return { side: 1, orderFromBottom: 0 };
  if (total === 2) return index === 0 ? { side: 1, orderFromBottom: 0 } : { side: -1, orderFromBottom: 0 };
  if (total === 3) {
    const slots: RootPlacement[] = [
      { side: 1, orderFromBottom: 0 },
      { side: -1, orderFromBottom: 0 },
      { side: 1, orderFromBottom: 1 },
    ];
    return slots[index];
  }
  return {
    side: index % 2 === 0 ? 1 : -1,
    orderFromBottom: Math.floor(index / 2),
  };
};

/**
 * Sectores de altura dinámica: una rama con muchas hojas ocupa más alto que una
 * con pocas, y ninguna invade la franja de otra.
 */
const buildRootSectors = (
  roots: TreeNoteInput[],
  rootY: number,
  compact: boolean,
  laneCountForRoot: (rootId: string) => number,
): RootSector[] => {
  const minBandHeight = compact ? 140 : 190;
  const laneGap = compact ? 28 : 38;
  const bandPadding = compact ? 24 : 34;
  const sectorGap = compact ? 32 : 48;
  const bottomClearance = compact ? 26 : 34;

  const placements = roots.map((_, index) => placementForRoot(index, roots.length));
  const result = new Array<RootSector>(roots.length);

  ([-1, 1] as const).forEach((side) => {
    const indices = roots
      .map((_, index) => index)
      .filter((index) => placements[index].side === side)
      .sort((a, b) => placements[a].orderFromBottom - placements[b].orderFromBottom);

    let cursorBottom = rootY - bottomClearance;

    indices.forEach((rootIndex, stackIndex) => {
      const lanes = Math.max(1, laneCountForRoot(roots[rootIndex].id));
      const requiredHeight = Math.max(minBandHeight, lanes * laneGap + bandPadding * 2);
      const bandBottom = cursorBottom;
      const bandTop = bandBottom - requiredHeight;

      const onlyOne = indices.length === 1;
      const rootFactor = onlyOne ? 0.5 : stackIndex === 0 ? 0.32 : 0.68;

      result[rootIndex] = {
        side,
        rootY: bandTop + requiredHeight * rootFactor,
        bandTop,
        bandBottom,
        attachYOffset: stackIndex === 0 ? 6 : -6,
      };

      cursorBottom = bandTop - sectorGap;
    });
  });

  return result;
};

export const buildTreeSkeleton = (notes: TreeNoteInput[], opts: SkeletonOptions = {}): TreeSkeleton => {
  const rootX = opts.rootX ?? 0;
  const rootY = opts.rootY ?? 0;
  const compact = !!opts.compact;
  const collapsed = opts.collapsed ?? new Set<string>();
  const hidden = opts.hiddenRootIds ?? new Set<string>();

  const childrenOf = new Map<string | null, TreeNoteInput[]>();
  notes.forEach((note) => {
    const key = note.parentId ?? null;
    const list = childrenOf.get(key);
    if (list) list.push(note);
    else childrenOf.set(key, [note]);
  });

  const roots = (childrenOf.get(null) ?? []).filter((note) => !hidden.has(note.id));
  const junctions: TreeJunction[] = [];
  const segments: BranchSegment[] = [];
  const byNote = new Map<string, TreeJunction>();
  const branchRootOf = new Map<string, string>();

  const rootJunction: TreeJunction = { id: "trunk-0", x: rootX, y: rootY, depth: 0 };
  junctions.push(rootJunction);

  if (roots.length === 0) {
    return { junctions, segments, byNote, rootJunction, branchRootOf };
  }

  const rootOffsetX = compact ? 34 : 46;

  const laneCount = (id: string): number => {
    if (collapsed.has(id)) return 1;
    const kids = childrenOf.get(id) ?? [];
    if (kids.length === 0) return 1;
    return kids.reduce((sum, kid) => sum + laneCount(kid.id), 0);
  };

  const sectors = buildRootSectors(roots, rootY, compact, laneCount);

  // ----- Tronco central -----
  const attachments = roots
    .map((root, index) => ({
      root,
      index,
      sector: sectors[index],
      y: sectors[index].rootY + sectors[index].attachYOffset,
    }))
    .sort((a, b) => b.y - a.y);

  let previous = rootJunction;
  const attachmentByRoot = new Map<string, TreeJunction>();

  attachments.forEach((item, trunkIndex) => {
    const wobble = (hash(`${item.root.id}-trunk`) - 0.5) * (compact ? 4 : 6);
    const junction: TreeJunction = {
      id: `trunk-${trunkIndex + 1}`,
      x: rootX + wobble,
      y: item.y,
      depth: 0,
    };
    junctions.push(junction);
    segments.push({
      id: `seg-trunk-${trunkIndex}`,
      fromJunctionId: previous.id,
      toJunctionId: junction.id,
      d: segmentPath(previous, junction, "trunk"),
      branchRootId: "trunk",
      depth: 0,
      kind: "trunk",
    });
    attachmentByRoot.set(item.root.id, junction);
    previous = junction;
  });

  // ----- Cada racimo vive dentro de su sector -----
  roots.forEach((root, rootIndex) => {
    const sector = sectors[rootIndex];
    const attach = attachmentByRoot.get(root.id) ?? rootJunction;

    const rootNode: TreeJunction = {
      id: `j-${root.id}`,
      x: rootX + sector.side * rootOffsetX,
      y: sector.rootY,
      noteId: root.id,
      branchRootId: root.id,
      depth: 1,
      side: sector.side,
    };
    junctions.push(rootNode);
    byNote.set(root.id, rootNode);
    branchRootOf.set(root.id, root.id);

    segments.push({
      id: `seg-root-${root.id}`,
      fromJunctionId: attach.id,
      toJunctionId: rootNode.id,
      d: segmentPath(attach, rootNode, "connector"),
      branchRootId: root.id,
      depth: 1,
      kind: "connector",
    });

    if (collapsed.has(root.id)) return;

    const baseStep = compact ? 62 : 84;
    const minStep = compact ? 26 : 34;
    const DECAY = 0.75;

    const placeChildren = (
      parentNote: TreeNoteInput,
      parentJunction: TreeJunction,
      depthFromRoot: number,
      intervalTop: number,
      intervalBottom: number,
    ) => {
      if (collapsed.has(parentNote.id)) return;
      const kids = childrenOf.get(parentNote.id) ?? [];
      if (kids.length === 0) return;

      const weights = kids.map((kid) => laneCount(kid.id));
      const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;
      let cursor = intervalTop;
      const intervalHeight = Math.max(1, intervalBottom - intervalTop);

      // Tramos cada vez más cortos al alejarse del tronco, como en el SVG.
      const step = Math.max(minStep, baseStep * Math.pow(DECAY, depthFromRoot - 1));

      kids.forEach((kid, childIndex) => {
        const share = intervalHeight * (weights[childIndex] / totalWeight);
        const childTop = cursor;
        const childBottom = cursor + share;
        cursor = childBottom;

        let y = (childTop + childBottom) / 2;

        if (kids.length === 1) {
          // Cadena de un solo hijo: se evita la línea recta sin salir del sector.
          const driftSign = hash(`${kid.id}-v`) > 0.5 ? 1 : -1;
          const drift = Math.min(compact ? 16 : 24, intervalHeight * 0.1);
          const pad = compact ? 5 : 7;
          const localMin = Math.min(childTop + pad, childBottom - pad);
          const localMax = Math.max(childTop + pad, childBottom - pad);
          y = clamp(parentJunction.y + driftSign * drift, localMin, localMax);
        }

        const variation = 0.88 + hash(`${kid.id}-x`) * 0.26;
        const x = parentJunction.x + sector.side * step * variation;

        const junction: TreeJunction = {
          id: `j-${kid.id}`,
          x,
          y,
          noteId: kid.id,
          branchRootId: root.id,
          depth: depthFromRoot + 1,
          side: sector.side,
        };
        junctions.push(junction);
        byNote.set(kid.id, junction);
        branchRootOf.set(kid.id, root.id);

        segments.push({
          id: `seg-${kid.id}`,
          fromJunctionId: parentJunction.id,
          toJunctionId: junction.id,
          d: segmentPath(parentJunction, junction, "branch", kid.id),
          branchRootId: root.id,
          depth: depthFromRoot + 1,
          kind: "branch",
        });

        placeChildren(kid, junction, depthFromRoot + 1, childTop, childBottom);
      });
    };

    placeChildren(root, rootNode, 1, sector.bandTop, sector.bandBottom);
  });

  return { junctions, segments, byNote, rootJunction, branchRootOf };
};

/** Grosor uniforme, como en el SVG (stroke-width 2 en todos los trazos). */
export const STROKE_WIDTH = 2;

/** Tamaños de punto del SVG: 15 raíz de tema, 7 intermedio, 5 hoja. */
export const dotSizeForDepth = (depth: number, hasChildren: boolean) => {
  if (depth <= 0) return 15;
  return hasChildren ? 7 : 5;
};

export const BRANCH_PALETTE = ["#45C9BE", "#E7B48C", "#FAADE2", "#F5E076", "#6BB8FF", "#B98BFF"];
export const paletteColorFor = (_id: string, index: number) => BRANCH_PALETTE[index % BRANCH_PALETTE.length];
