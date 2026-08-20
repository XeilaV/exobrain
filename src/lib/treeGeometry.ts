// Objetivo visual: tronco central + ramas principales separadas por sectores,
// como en la referencia del usuario. Cada rama raíz recibe una zona exclusiva
// del lienzo; toda su descendencia se mantiene dentro de esa zona. No hay jitter
// angular ni crecimiento radial, por lo que ramas de temas distintos no se cruzan.

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

/** Hash estable, usado solo para microvariaciones de forma. Nunca decide el sector. */
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
};

/**
 * Curva de un segmento entre dos junctions.
 * Se recalcula también después de arrastrar un nodo, de modo que línea y nodo
 * comparten siempre las mismas coordenadas finales.
 */
export const segmentPath = (from: Vec, to: Vec, kind: SegmentKind = "branch"): string => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (kind === "trunk") {
    // Tronco casi vertical y suave. Los controles siguen el eje Y para evitar
    // serpenteos y cruces visuales.
    const c1 = { x: from.x + dx * 0.18, y: from.y + dy * 0.34 };
    const c2 = { x: to.x - dx * 0.18, y: from.y + dy * 0.72 };
    return `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)}, ${c2.x.toFixed(2)} ${c2.y.toFixed(2)}, ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
  }

  if (kind === "connector") {
    // Salida azul desde el tronco hacia la raíz de cada tema: primero acompaña
    // al tronco y después se abre lateralmente, como en el diseño de referencia.
    const c1 = { x: from.x + dx * 0.08, y: from.y + dy * 0.48 };
    const c2 = { x: from.x + dx * 0.58, y: to.y - dy * 0.1 };
    return `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)}, ${c2.x.toFixed(2)} ${c2.y.toFixed(2)}, ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
  }

  // Ramificación de color. Los controles son mayoritariamente horizontales:
  // la rama sale suave de la bifurcación y llega tangente al nodo hijo.
  const side = dx >= 0 ? 1 : -1;
  const absDx = Math.abs(dx);
  const handle = Math.max(18, absDx * 0.46);
  const c1 = {
    x: from.x + side * handle,
    y: from.y + dy * 0.12,
  };
  const c2 = {
    x: to.x - side * Math.max(14, absDx * 0.3),
    y: to.y - dy * 0.1,
  };

  return `M ${from.x.toFixed(2)} ${from.y.toFixed(2)} C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)}, ${c2.x.toFixed(2)} ${c2.y.toFixed(2)}, ${to.x.toFixed(2)} ${to.y.toFixed(2)}`;
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
 * Posición conceptual de cada rama principal.
 * Los cuatro primeros temas conservan exactamente la composición de referencia:
 * 0 abajo-izquierda, 1 abajo-derecha, 2 arriba-derecha, 3 arriba-izquierda.
 * A partir del quinto se siguen apilando sectores independientes hacia arriba.
 */
const placementForRoot = (index: number, total: number): RootPlacement => {
  if (total === 1) return { side: 1, orderFromBottom: 0 };

  if (total === 2) {
    return index === 0 ? { side: -1, orderFromBottom: 0 } : { side: 1, orderFromBottom: 0 };
  }

  if (total === 3) {
    const slots: RootPlacement[] = [
      { side: -1, orderFromBottom: 0 },
      { side: 1, orderFromBottom: 0 },
      { side: 1, orderFromBottom: 1 },
    ];
    return slots[index];
  }

  if (total === 4) {
    const slots: RootPlacement[] = [
      { side: -1, orderFromBottom: 0 }, // abajo izquierda
      { side: 1, orderFromBottom: 0 }, // abajo derecha
      { side: 1, orderFromBottom: 1 }, // arriba derecha
      { side: -1, orderFromBottom: 1 }, // arriba izquierda
    ];
    return slots[index];
  }

  // Más de cuatro ramas principales: seguimos alternando lados y apilando
  // verticalmente. Nunca comparten una misma banda.
  return {
    side: index % 2 === 0 ? -1 : 1,
    orderFromBottom: Math.floor(index / 2),
  };
};

/**
 * Construye sectores de altura DINÁMICA.
 * Una rama con 30 hojas ocupa más alto que una con 3: nunca se comprime todo
 * dentro de una franja fija ni se permite que invada la franja de otro tema.
 */
const buildRootSectors = (
  roots: TreeNoteInput[],
  rootY: number,
  compact: boolean,
  laneCountForRoot: (rootId: string) => number,
): RootSector[] => {
  const minBandHeight = compact ? 150 : 205;
  const laneGap = compact ? 30 : 42;
  const bandPadding = compact ? 26 : 38;
  const sectorGap = compact ? 34 : 52;
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

      // Si hay una sola rama en ese lado queda centrada. En una pila, la rama
      // inferior nace cerca de la parte alta de su sector y las superiores cerca
      // de la parte baja. Así cada copa crece alejándose de la zona de separación.
      const onlyOne = indices.length === 1;
      const rootFactor = onlyOne ? 0.5 : stackIndex === 0 ? 0.3 : 0.7;
      const computedRootY = bandTop + requiredHeight * rootFactor;

      result[rootIndex] = {
        side,
        rootY: computedRootY,
        bandTop,
        bandBottom,
        attachYOffset: stackIndex === 0 ? 5 : -5,
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

  const rootJunction: TreeJunction = {
    id: "trunk-0",
    x: rootX,
    y: rootY,
    depth: 0,
  };
  junctions.push(rootJunction);

  if (roots.length === 0) {
    return { junctions, segments, byNote, rootJunction, branchRootOf };
  }

  const rootOffsetX = compact ? 34 : 46;

  // Peso vertical real de un subárbol. Cada hoja necesita su propio carril.
  // Al añadir más notas, la banda de esa rama crece en lugar de comprimirlas.
  const laneCount = (id: string): number => {
    if (collapsed.has(id)) return 1;
    const kids = childrenOf.get(id) ?? [];
    if (kids.length === 0) return 1;
    return kids.reduce((sum, kid) => sum + laneCount(kid.id), 0);
  };

  const sectors = buildRootSectors(roots, rootY, compact, laneCount);

  // ----- Tronco central -----
  // Un junction del tronco por cada punto de salida, ordenado de abajo a arriba.
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
    // Microdesplazamiento de 2-4 px, nunca suficiente para deformar el eje.
    const wobble = (hash(`${item.root.id}-trunk`) - 0.5) * (compact ? 4 : 7);
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

  // ----- Cada rama principal vive dentro de su sector -----
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

    // La conexión tronco -> raíz sigue siendo azul. El color del tema empieza
    // a partir del círculo raíz hacia sus hijas, igual que en la referencia.
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

    const leafWeight = (id: string): number => laneCount(id);

    const levelGap = compact ? 52 : 72;

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

      const weights = kids.map((kid) => leafWeight(kid.id));
      const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;
      let cursor = intervalTop;
      const intervalHeight = Math.max(1, intervalBottom - intervalTop);

      kids.forEach((kid, childIndex) => {
        const share = intervalHeight * (weights[childIndex] / totalWeight);
        const childTop = cursor;
        const childBottom = cursor + share;
        cursor = childBottom;

        let y = (childTop + childBottom) / 2;

        // En cadenas de un solo hijo evitamos una línea totalmente recta, pero
        // la variación queda siempre dentro del sector reservado.
        if (kids.length === 1) {
          const driftSign = hash(`${kid.id}-vertical`) > 0.5 ? 1 : -1;
          const drift = Math.min(compact ? 14 : 22, intervalHeight * 0.08);
          const localPad = compact ? 5 : 7;
          const localMin = Math.min(childTop + localPad, childBottom - localPad);
          const localMax = Math.max(childTop + localPad, childBottom - localPad);
          y = clamp(parentJunction.y + driftSign * drift, localMin, localMax);
        }

        // Crecimiento horizontal sin límite fijo. Cada nivel avanza una distancia
        // mínima real; si el árbol gana profundidad, se ensancha en vez de colocar
        // nietas/bisnietas encima de la misma X.
        const variation = 0.88 + hash(`${kid.id}-x`) * 0.24;
        const step = levelGap * variation;
        const x = parentJunction.x + sector.side * step;

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
          d: segmentPath(parentJunction, junction, "branch"),
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

/** Grosor de trazo en píxeles de pantalla. Se usa con vector-effect non-scaling-stroke. */
export const strokeForDepth = (depth: number, kind: SegmentKind) => {
  if (kind === "trunk") return 3.2;
  if (kind === "connector") return 3.0;
  if (depth <= 2) return 3.0;
  if (depth === 3) return 2.4;
  if (depth === 4) return 1.9;
  return Math.max(1.15, 1.75 - (depth - 4) * 0.16);
};

// Se conservan estos exports por compatibilidad con posibles imports antiguos.
export const BRANCH_PALETTE = ["#7A6BFF", "#42E1C6", "#FFB06B", "#F57BC8", "#F3D75F", "#6BB8FF", "#B98BFF", "#7FE08A"];
export const paletteColorFor = (_id: string, index: number) => BRANCH_PALETTE[index % BRANCH_PALETTE.length];
