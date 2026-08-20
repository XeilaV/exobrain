// Geometría del árbol de ExoBrain.
//
// Los motivos de curva de este archivo NO son fórmulas inventadas: se han extraído
// directamente de los `path d` de `Group 8.svg` (referencia del usuario). Cada path
// cúbico del SVG se ha normalizado (origen en el inicio del tramo, extremo en (1,0),
// escala = longitud del tramo) conservando sus puntos de control Bézier tal cual.
// En runtime no se lee ningún SVG: los motivos viven aquí como datos y se reutilizan
// mediante escala, rotación y espejo.

export type Vec = { x: number; y: number };

/** Cadena de curvas cúbicas normalizadas: [[c1, c2, end], ...] con inicio implícito en (0,0). */
export interface BranchMotif {
  c: number[][][];
  bend: number;
}

export const BRANCH_MOTIFS: BranchMotif[] = [{"c":[[[0.0734,-0.0222],[0.2497,-0.0539],[0.3681,-0.0029]],[[0.5161,0.0609],[0.6373,0.1351],[1.0,0.0]]],"bend":0.0195},{"c":[[[0.0734,-0.0222],[0.2497,-0.054],[0.3681,-0.0029]],[[0.5161,0.0609],[0.6373,0.1351],[1.0,0.0]]],"bend":0.0195},{"c":[[[0.0734,0.0222],[0.2497,0.0539],[0.3681,0.0029]],[[0.5161,-0.0609],[0.6373,-0.1351],[1.0,-0.0]]],"bend":-0.0195},{"c":[[[0.0734,0.0222],[0.2497,0.0539],[0.3681,0.0029]],[[0.5161,-0.0609],[0.6373,-0.1351],[1.0,-0.0]]],"bend":-0.0195},{"c":[[[0.1088,0.0133],[0.2444,0.0344],[0.4564,-0.0282]],[[0.5971,-0.0699],[0.8054,-0.126],[1.0,0.0]]],"bend":-0.0294},{"c":[[[0.1262,0.0219],[0.267,0.0591],[0.3786,0.0656]],[[0.6658,0.0821],[0.7087,-0.0504],[1.0,0.0]]],"bend":0.0297},{"c":[[[0.1262,0.0219],[0.267,0.0591],[0.3786,0.0656]],[[0.6658,0.0821],[0.7087,-0.0504],[1.0,0.0]]],"bend":0.0297},{"c":[[[0.1262,-0.0219],[0.267,-0.0591],[0.3786,-0.0656]],[[0.6658,-0.0821],[0.7087,0.0504],[1.0,-0.0]]],"bend":-0.0297},{"c":[[[0.1262,-0.0219],[0.267,-0.0591],[0.3786,-0.0656]],[[0.6658,-0.0821],[0.7087,0.0504],[1.0,0.0]]],"bend":-0.0297},{"c":[[[0.2069,-0.0122],[0.7526,-0.0445],[0.8243,-0.0488]],[[0.9138,-0.0541],[0.9376,-0.023],[1.0,-0.0]]],"bend":-0.0304},{"c":[[[0.1771,-0.0351],[0.2847,-0.1345],[0.5314,-0.0745]],[[0.6936,-0.0351],[0.8571,0.0582],[1.0,0.0]]],"bend":-0.0368},{"c":[[[0.1112,0.0494],[0.2824,0.1419],[0.4892,0.0786]],[[0.7476,-0.0005],[0.835,-0.0333],[1.0,-0.0]]],"bend":0.0394},{"c":[[[0.1112,-0.0494],[0.2824,-0.1419],[0.4892,-0.0786]],[[0.7476,0.0005],[0.835,0.0333],[1.0,-0.0]]],"bend":-0.0394},{"c":[[[0.1112,-0.0494],[0.2824,-0.1419],[0.4892,-0.0786]],[[0.7476,0.0005],[0.835,0.0333],[1.0,-0.0]]],"bend":-0.0394},{"c":[[[0.0776,0.033],[0.6508,0.0876],[1.0,0.0]]],"bend":0.0402},{"c":[[[0.0776,0.033],[0.6508,0.0876],[1.0,0.0]]],"bend":0.0402},{"c":[[[0.0776,-0.033],[0.6508,-0.0876],[1.0,0.0]]],"bend":-0.0402},{"c":[[[0.0776,-0.033],[0.6508,-0.0876],[1.0,0.0]]],"bend":-0.0402},{"c":[[[0.0644,0.0648],[0.2321,0.1789],[0.3871,0.1165]],[[0.581,0.0386],[0.7191,-0.0716],[1.0,0.0]]],"bend":0.0545},{"c":[[[0.0644,-0.0648],[0.2321,-0.1789],[0.3871,-0.1165]],[[0.581,-0.0386],[0.7191,0.0716],[1.0,0.0]]],"bend":-0.0545},{"c":[[[0.0644,-0.0648],[0.2321,-0.1789],[0.3871,-0.1165]],[[0.581,-0.0386],[0.7191,0.0716],[1.0,0.0]]],"bend":-0.0545},{"c":[[[0.3638,-0.1673],[0.8582,-0.0242],[1.0,0.0]]],"bend":-0.0638},{"c":[[[0.0391,-0.0156],[0.1522,-0.0395],[0.2484,0.0446]],[[0.5771,0.3319],[0.819,0.1054],[1.0,0.0]]],"bend":0.0711},{"c":[[[0.0391,-0.0156],[0.1521,-0.0396],[0.2484,0.0446]],[[0.5771,0.3319],[0.819,0.1054],[1.0,0.0]]],"bend":0.0711},{"c":[[[0.0391,0.0156],[0.1522,0.0395],[0.2484,-0.0446]],[[0.5771,-0.3319],[0.819,-0.1054],[1.0,-0.0]]],"bend":-0.0711},{"c":[[[0.0391,0.0156],[0.1522,0.0395],[0.2484,-0.0446]],[[0.5771,-0.3319],[0.819,-0.1054],[1.0,-0.0]]],"bend":-0.0711},{"c":[[[0.2992,-0.0188],[0.7154,-0.2013],[1.0,0.0]]],"bend":-0.0734},{"c":[[[0.2992,0.0188],[0.7154,0.2013],[1.0,0.0]]],"bend":0.0734},{"c":[[[0.2992,0.0188],[0.7154,0.2013],[1.0,0.0]]],"bend":0.0734},{"c":[[[0.2658,0.0782],[0.341,0.2582],[0.5973,0.137]],[[0.721,0.0785],[0.8509,-0.0667],[1.0,-0.0]]],"bend":0.0809},{"c":[[[0.2658,0.0782],[0.341,0.2582],[0.5973,0.137]],[[0.721,0.0785],[0.8509,-0.0667],[1.0,-0.0]]],"bend":0.0809},{"c":[[[0.2658,-0.0782],[0.341,-0.2582],[0.5973,-0.137]],[[0.721,-0.0785],[0.8509,0.0667],[1.0,0.0]]],"bend":-0.0809},{"c":[[[0.2658,-0.0782],[0.341,-0.2582],[0.5973,-0.137]],[[0.721,-0.0785],[0.8509,0.0667],[1.0,0.0]]],"bend":-0.0809},{"c":[[[0.0686,0.0682],[0.2464,0.1958],[0.4091,0.1604]],[[0.6123,0.1161],[0.7404,-0.0536],[1.0,-0.0]]],"bend":0.0811},{"c":[[[0.0686,0.0682],[0.2464,0.1958],[0.4091,0.1604]],[[0.6123,0.1161],[0.7404,-0.0536],[1.0,-0.0]]],"bend":0.0811},{"c":[[[0.0686,-0.0682],[0.2464,-0.1958],[0.4091,-0.1604]],[[0.6123,-0.1161],[0.7404,0.0536],[1.0,0.0]]],"bend":-0.0811},{"c":[[[0.0686,-0.0682],[0.2464,-0.1958],[0.4091,-0.1604]],[[0.6123,-0.1161],[0.7404,0.0536],[1.0,0.0]]],"bend":-0.0811},{"c":[[[0.0686,-0.0682],[0.2464,-0.1958],[0.4091,-0.1604]],[[0.6123,-0.1161],[0.7404,0.0536],[1.0,0.0]]],"bend":-0.0811},{"c":[[[0.0686,-0.0682],[0.2464,-0.1958],[0.4091,-0.1604]],[[0.6123,-0.1161],[0.7404,0.0536],[1.0,0.0]]],"bend":-0.0811},{"c":[[[0.0692,0.0683],[0.2483,0.1959],[0.4106,0.1604]],[[0.6134,0.1161],[0.7399,-0.0536],[1.0,0.0]]],"bend":0.0812},{"c":[[[0.0692,-0.0683],[0.2483,-0.1959],[0.4106,-0.1604]],[[0.6134,-0.1161],[0.7399,0.0536],[1.0,0.0]]],"bend":-0.0812},{"c":[[[0.0692,-0.0683],[0.2483,-0.1959],[0.4106,-0.1604]],[[0.6134,-0.1161],[0.7399,0.0536],[1.0,0.0]]],"bend":-0.0812},{"c":[[[0.3109,-0.3318],[0.786,0.0161],[1.0,0.0]]],"bend":-0.1052},{"c":[[[0.3109,-0.3318],[0.786,0.0161],[1.0,0.0]]],"bend":-0.1052},{"c":[[[0.3109,0.3318],[0.786,-0.0161],[1.0,0.0]]],"bend":0.1052},{"c":[[[0.3109,0.3318],[0.786,-0.0161],[1.0,0.0]]],"bend":0.1052},{"c":[[[0.3337,0.2126],[0.6735,0.2164],[1.0,0.0]]],"bend":0.143}];


/* ------------------------------------------------------------------ */
/* Aplicación de motivos                                               */
/* ------------------------------------------------------------------ */

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
};

/**
 * Construye el `d` de un segmento aplicando un motivo normalizado entre dos puntos.
 * El motivo se escala a la distancia, se rota a la dirección y opcionalmente se
 * refleja; sus puntos de control no se aproximan ni se simplifican.
 */
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
    return { x: from.x + px * ca - py * sa, y: from.y + px * sa + py * ca };
  };
  let d = `M ${from.x.toFixed(2)} ${from.y.toFixed(2)}`;
  motif.c.forEach((seg) => {
    const c1 = map(seg[0]);
    const c2 = map(seg[1]);
    const e = map(seg[2]);
    d += ` C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)}, ${c2.x.toFixed(2)} ${c2.y.toFixed(2)}, ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
  });
  return d;
};

/** Motivo estable para un identificador dado, filtrando por curvatura deseada. */
export const pickMotif = (seed: string, maxBend: number): BranchMotif => {
  const pool = BRANCH_MOTIFS.filter((m) => Math.abs(m.bend) <= maxBend);
  const list = pool.length ? pool : BRANCH_MOTIFS;
  return list[Math.floor(hash(seed) * list.length) % list.length];
};

/* ------------------------------------------------------------------ */
/* Esqueleto del árbol                                                 */
/* ------------------------------------------------------------------ */

export interface TreeJunction {
  id: string;
  x: number;
  y: number;
  noteId?: string;
  branchRootId?: string;
  depth: number;
  /** dirección de crecimiento en radianes (pantalla: -PI/2 = hacia arriba) */
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
  /** motivo aplicado, para poder re-dibujar el mismo trazo si el nodo se arrastra */
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
  compact?: boolean;
  collapsed?: Set<string>;
  hiddenRootIds?: Set<string>;
}

export interface TreeSkeleton {
  junctions: TreeJunction[];
  segments: BranchSegment[];
  byNote: Map<string, TreeJunction>;
  rootJunction: TreeJunction;
  /** rama principal a la que pertenece cada nota */
  branchRootOf: Map<string, string>;
}

const TAU = Math.PI * 2;
const UP = -Math.PI / 2;

export const buildTreeSkeleton = (notes: TreeNoteInput[], opts: SkeletonOptions = {}): TreeSkeleton => {
  const rootX = opts.rootX ?? 0;
  const rootY = opts.rootY ?? 0;
  const compact = !!opts.compact;
  const collapsed = opts.collapsed ?? new Set<string>();
  const hidden = opts.hiddenRootIds ?? new Set<string>();

  const childrenOf = new Map<string | null, TreeNoteInput[]>();
  notes.forEach((n) => {
    const key = n.parentId ?? null;
    const arr = childrenOf.get(key);
    if (arr) arr.push(n);
    else childrenOf.set(key, [n]);
  });

  const weightCache = new Map<string, number>();
  const weightOf = (id: string): number => {
    const cached = weightCache.get(id);
    if (cached !== undefined) return cached;
    const kids = childrenOf.get(id) ?? [];
    let w = 1;
    kids.forEach((k) => (w += weightOf(k.id)));
    weightCache.set(id, w);
    return w;
  };

  const junctions: TreeJunction[] = [];
  const segments: BranchSegment[] = [];
  const byNote = new Map<string, TreeJunction>();
  const branchRootOf = new Map<string, string>();

  const rootJunction: TreeJunction = { id: "trunk-0", x: rootX, y: rootY, depth: 0, angle: UP };
  junctions.push(rootJunction);

  const roots = (childrenOf.get(null) ?? []).filter((n) => !hidden.has(n.id));

  // --- Tronco: vertical, ligeramente irregular, partido en tramos ---
  // Paso del tronco algo mayor para que las cabezas de rama no se crucen.
  const trunkStep = (compact ? 88 : 124) * (roots.length > 6 ? 0.94 : 1);

  let prev = rootJunction;
  const trunkPoints: TreeJunction[] = [rootJunction];

  roots.forEach((root, i) => {
    const wobble = (hash(`${root.id}-trunk`) - 0.5) * (compact ? 14 : 22);
    const j: TreeJunction = {
      id: `trunk-${i + 1}`,
      x: rootX + wobble,
      y: prev.y - trunkStep * (0.85 + hash(`${root.id}-h`) * 0.4),
      depth: 0,
      angle: UP,
    };
    junctions.push(j);
    const motif = pickMotif(`trunk-${root.id}`, 0.05);
    const mirror = hash(`${root.id}-m`) > 0.5;
    segments.push({
      id: `seg-trunk-${i}`,
      fromJunctionId: prev.id,
      toJunctionId: j.id,
      d: motifPath(prev, j, motif, mirror),
      branchRootId: "trunk",
      depth: 0,
      kind: "trunk",
      motif,
      mirror,
    });
    trunkPoints.push(j);
    prev = j;
  });

  // Punta del tronco
  if (roots.length > 0) {
    const tip: TreeJunction = {
      id: "trunk-tip",
      x: prev.x + (hash("tip") - 0.5) * 18,
      y: prev.y - trunkStep * 0.55,
      depth: 0,
      angle: UP,
    };
    junctions.push(tip);
    segments.push({
      id: "seg-trunk-tip",
      fromJunctionId: prev.id,
      toJunctionId: tip.id,
      d: motifPath(prev, tip, pickMotif("trunk-tip", 0.05), false),
      branchRootId: "trunk",
      depth: 0,
      kind: "trunk",
      motif: pickMotif("trunk-tip", 0.05),
      mirror: false,
    });
  }

  // --- Copa: recursión por motivos ---
  const grow = (
    note: TreeNoteInput,
    from: TreeJunction,
    angle: number,
    length: number,
    depth: number,
    branchRootId: string,
  ) => {
    const end = {
      x: from.x + Math.cos(angle) * length,
      y: from.y + Math.sin(angle) * length,
    };
    const j: TreeJunction = {
      id: `j-${note.id}`,
      x: end.x,
      y: end.y,
      noteId: note.id,
      branchRootId,
      depth,
      angle,
    };
    junctions.push(j);
    byNote.set(note.id, j);
    branchRootOf.set(note.id, branchRootId);

    const maxBend = depth <= 1 ? 0.09 : 0.16;
    const motif = pickMotif(`${note.id}-${depth}`, maxBend);
    const mirror = hash(`${note.id}-mir`) > 0.5;
    segments.push({
      id: `seg-${note.id}`,
      fromJunctionId: from.id,
      toJunctionId: j.id,
      d: motifPath(from, j, motif, mirror),
      branchRootId,
      depth,
      kind: "branch",
      motif,
      mirror,
    });

    if (collapsed.has(note.id)) return;
    const kids = childrenOf.get(note.id) ?? [];
    if (kids.length === 0) return;

    const weights = kids.map((k) => weightOf(k.id));
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    // Apertura del ramaje: amplia en el primer nivel para que las hijas no se
    // apilen, y progresivamente más contenida al profundizar.
    const baseSpread = depth === 1 ? 2.0 : depth === 2 ? 1.35 : 1.05;
    const spread = Math.min(baseSpread * (0.7 + Math.min(1, total / 8) * 0.7), 2.4);
    // Separación angular mínima entre hermanas, mayor cuanta más descendencia hay.
    const minGap = Math.min(0.85, (depth === 1 ? 0.42 : 0.3) + Math.min(0.3, total * 0.03));
    const angles: number[] = [];

    let acc = 0;
    kids.forEach((kid, i) => {
      const w = weights[i];
      const t = kids.length === 1 ? 0 : (acc + w / 2) / total - 0.5;
      acc += w;
      // Irregularidad determinista: la copa nunca es un abanico perfecto.
      const jitter = (hash(`${kid.id}-a`) - 0.5) * (depth === 1 ? 0.42 : 0.3);
      const single = kids.length === 1 ? (hash(`${kid.id}-s`) - 0.5) * 0.8 : 0;
      let a = angle + t * spread + jitter + single;
      // Nunca crecer hacia abajo: se mantiene la silueta de copa.
      const limit = 1.32;
      const rel = ((a - UP + Math.PI * 3) % TAU) - Math.PI;
      if (rel > limit) a = UP + limit;
      if (rel < -limit) a = UP - limit;
      // Anti-solape determinista: empujar si queda demasiado cerca de una hermana.
      angles.forEach((prevA) => {
        const diff = a - prevA;
        if (Math.abs(diff) < minGap) a = prevA + (diff >= 0 ? minGap : -minGap);
      });
      angles.push(a);

      // Tramos cortos: decrecimiento marcado con la profundidad.
      const decay = depth === 1 ? 0.58 : depth === 2 ? 0.66 : 0.7;
      const len =
        length *
        (decay + hash(`${kid.id}-l`) * 0.18) *
        (1 + Math.min(0.4, Math.sqrt(w) * 0.12));
      grow(kid, j, a, Math.max(compact ? 34 : 46, len), depth + 1, branchRootId);
    });
  };

  roots.forEach((root, i) => {
    const from = trunkPoints[i + 1] ?? rootJunction;
    const side = i % 2 === 0 ? 1 : -1;
    const tilt = 0.6 + hash(`${root.id}-t`) * 0.45;
    const angle = UP + side * tilt;
    const w = weightOf(root.id);
    const length = (compact ? 84 : 118) * (1 + Math.min(0.55, Math.sqrt(w) * 0.12));
    grow(root, from, angle, length, 1, root.id);
  });


  return { junctions, segments, byNote, rootJunction, branchRootOf };
};

/** Grosor de trazo según profundidad (referencia: prototipo oscuro del usuario). */
export const strokeForDepth = (depth: number, kind: "trunk" | "branch") => {
  if (kind === "trunk") return 1.7;
  if (depth <= 1) return 1.4;
  if (depth === 2) return 1.1;
  return Math.max(0.65, 0.95 - (depth - 3) * 0.08);
};

/** Paleta de ramas del prototipo oscuro. */
export const BRANCH_PALETTE = ["#7A6BFF", "#42E1C6", "#FFB06B", "#F57BC8", "#F3D75F", "#6BB8FF", "#B98BFF", "#7FE08A"];

export const paletteColorFor = (id: string, index: number) => BRANCH_PALETTE[index % BRANCH_PALETTE.length];
