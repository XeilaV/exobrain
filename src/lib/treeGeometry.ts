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
  title?: string;
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

const BASE_ROOT = { x: 356, y: 704 };
const UP = -Math.PI / 2;

const pointKey = (x: number, y: number) => `${x.toFixed(2)}:${y.toFixed(2)}`;
const angleBetween = (a: Vec, b: Vec) => Math.atan2(b.y - a.y, b.x - a.x);

export const motifPath = (from: Vec, to: Vec, motif: BranchMotif, mirror = false): string => {
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
    d += ` C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)}, ${c2.x.toFixed(2)} ${c2.y.toFixed(2)}, ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
  });
  return d;
};

const motifFromTangents = (from: Vec, to: Vec, startAngle: number, endAngle: number, strength = 0.42): BranchMotif => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const vx = -uy;
  const vy = ux;

  const c1 = {
    x: from.x + Math.cos(startAngle) * len * strength,
    y: from.y + Math.sin(startAngle) * len * strength,
  };
  const c2 = {
    x: to.x - Math.cos(endAngle) * len * strength,
    y: to.y - Math.sin(endAngle) * len * strength,
  };

  const norm = (p: Vec) => {
    const px = p.x - from.x;
    const py = p.y - from.y;
    return [(px * ux + py * uy) / len, (px * vx + py * vy) / len];
  };

  const n1 = norm(c1);
  const n2 = norm(c2);
  return {
    c: [[n1, n2, [1, 0]]],
    bend: (Math.abs(n1[1]) + Math.abs(n2[1])) / 2,
  };
};

// Kept for compatibility with GraphViewV2. The traced layout builds its own motifs.
export const pickMotif = (_seed: string, _maxBend: number): BranchMotif => ({
  c: [
    [
      [0.34, 0],
      [0.66, 0],
      [1, 0],
    ],
  ],
  bend: 0,
});

interface Profile {
  name: "pink" | "yellow" | "green" | "peach";
  root: [number, number];
  trunkAttach: [number, number];
  side: -1 | 1;
  localHeading: number;
  localScale: number;
  paths: Array<Array<[number, number]>>;
  terminals: Array<[number, number]>;
  terminalPriority: number[];
}

const PROFILES: Profile[] = [
  {
    name: "pink",
    root: [304, 460],
    trunkAttach: [356, 558],
    side: -1,
    localHeading: Math.PI - 0.05,
    localScale: 22,
    paths: [
      [
        [304, 460],
        [285, 428],
        [259, 398],
        [274, 323],
        [264, 263],
      ],
      [
        [274, 323],
        [250, 294],
        [224, 284],
      ],
      [
        [259, 398],
        [228, 359],
        [167, 305],
      ],
      [
        [259, 398],
        [224, 367],
        [168, 348],
      ],
      [
        [304, 460],
        [266, 435],
        [211, 429],
        [121, 388],
        [47, 373],
      ],
      [
        [121, 388],
        [91, 409],
        [63, 411],
      ],
      [
        [211, 429],
        [180, 444],
        [143, 433],
      ],
      [
        [211, 429],
        [180, 470],
        [134, 479],
      ],
    ],
    terminals: [
      [264, 263],
      [224, 284],
      [167, 305],
      [168, 348],
      [47, 373],
      [63, 411],
      [143, 433],
      [134, 479],
    ],
    terminalPriority: [0, 4, 1, 2, 3, 5, 6, 7],
  },
  {
    name: "yellow",
    root: [334, 238],
    trunkAttach: [356, 318],
    side: -1,
    localHeading: Math.PI - 0.35,
    localScale: 22,
    paths: [
      [
        [334, 238],
        [289, 177],
        [304, 103],
        [290, 39],
      ],
      [
        [304, 103],
        [280, 70],
        [254, 62],
      ],
      [
        [289, 177],
        [252, 131],
        [219, 86],
      ],
      [
        [289, 177],
        [243, 143],
        [198, 126],
      ],
      [
        [334, 238],
        [285, 213],
        [207, 211],
        [164, 257],
      ],
      [
        [207, 211],
        [180, 179],
        [151, 165],
        [76, 152],
      ],
      [
        [151, 165],
        [120, 185],
        [92, 188],
      ],
    ],
    terminals: [
      [290, 39],
      [254, 62],
      [219, 86],
      [198, 126],
      [164, 257],
      [76, 152],
      [92, 188],
    ],
    terminalPriority: [3, 4, 5, 0, 1, 2, 6],
  },
  {
    name: "green",
    root: [379, 306],
    trunkAttach: [356, 365],
    side: 1,
    localHeading: -0.35,
    localScale: 20,
    paths: [
      [
        [379, 306],
        [400, 274],
        [423, 245],
        [409, 169],
        [423, 108],
      ],
      [
        [409, 169],
        [430, 140],
        [462, 131],
      ],
      [
        [423, 245],
        [455, 208],
        [515, 194],
      ],
      [
        [379, 306],
        [421, 281],
        [467, 275],
        [539, 280],
      ],
      [
        [467, 275],
        [505, 247],
        [562, 234],
        [637, 221],
      ],
      [
        [562, 234],
        [586, 257],
        [620, 257],
      ],
      [
        [467, 275],
        [500, 305],
        [549, 325],
      ],
    ],
    terminals: [
      [423, 108],
      [462, 131],
      [515, 194],
      [539, 280],
      [637, 221],
      [620, 257],
      [549, 325],
    ],
    terminalPriority: [2, 6, 3, 0, 1, 4, 5],
  },
  {
    name: "peach",
    root: [402, 444],
    trunkAttach: [356, 558],
    side: 1,
    localHeading: -0.15,
    localScale: 20,
    paths: [
      [
        [402, 444],
        [414, 404],
        [445, 377],
      ],
      [
        [402, 444],
        [435, 414],
        [490, 413],
        [563, 417],
      ],
      [
        [490, 413],
        [540, 378],
        [585, 372],
        [661, 357],
      ],
      [
        [585, 372],
        [610, 393],
        [644, 395],
      ],
      [
        [490, 413],
        [522, 454],
        [571, 464],
      ],
    ],
    terminals: [
      [445, 377],
      [563, 417],
      [661, 357],
      [644, 395],
      [571, 464],
    ],
    terminalPriority: [1, 4, 0, 3, 2],
  },
];

const hueOf = (color?: string | null) => {
  if (!color) return null;
  const h = Number.parseFloat(color.trim().split(/\s+/)[0]);
  return Number.isFinite(h) ? ((h % 360) + 360) % 360 : null;
};

const preferredProfile = (root: TreeNoteInput, index: number, used: Set<string>) => {
  const hue = hueOf(root.color);
  let name: Profile["name"] | null = null;
  if (hue !== null) {
    if (hue >= 285) name = "pink";
    else if (hue >= 25 && hue <= 75) name = "yellow";
    else if (hue >= 80 && hue <= 190) name = "green";
    else if (hue < 25 || hue >= 345) name = "peach";
  }

  const fallback: Profile["name"][] = ["pink", "yellow", "green", "peach"];
  if (!name || used.has(name)) name = fallback.find((x) => !used.has(x)) ?? fallback[index % fallback.length];
  used.add(name);
  return PROFILES.find((p) => p.name === name)!;
};

export const buildTreeSkeleton = (notes: TreeNoteInput[], opts: SkeletonOptions = {}): TreeSkeleton => {
  const rootX = opts.rootX ?? 356;
  const rootY = opts.rootY ?? 704;
  const scale = opts.compact ? 0.72 : 1;
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
    const total = 1 + kids.reduce((sum, child) => sum + weightOf(child.id), 0);
    weightCache.set(id, total);
    return total;
  };

  const junctions: TreeJunction[] = [];
  const segments: BranchSegment[] = [];
  const byNote = new Map<string, TreeJunction>();
  const branchRootOf = new Map<string, string>();
  const coordMap = new Map<string, TreeJunction>();
  const segmentKeys = new Set<string>();
  let virtualCounter = 0;
  let segmentCounter = 0;

  const P = ([x, y]: [number, number]): Vec => ({
    x: rootX + (x - BASE_ROOT.x) * scale,
    y: rootY + (y - BASE_ROOT.y) * scale,
  });

  const rootJunction: TreeJunction = {
    id: "trunk-root",
    x: rootX,
    y: rootY,
    depth: 0,
    angle: UP,
    branchRootId: "trunk",
  };
  junctions.push(rootJunction);
  coordMap.set(pointKey(rootX, rootY), rootJunction);

  const getOrCreate = (
    p: Vec,
    branchRootId: string,
    depth: number,
    note?: TreeNoteInput,
    angle = UP,
    preferredId?: string,
  ) => {
    const key = pointKey(p.x, p.y);
    let j = coordMap.get(key);
    if (!j) {
      j = {
        id: preferredId ?? `v-${virtualCounter++}`,
        x: p.x,
        y: p.y,
        branchRootId,
        depth,
        angle,
      };
      coordMap.set(key, j);
      junctions.push(j);
    }
    if (note) {
      j.noteId = note.id;
      j.branchRootId = branchRootId;
      j.depth = depth;
      j.angle = angle;
      byNote.set(note.id, j);
      branchRootOf.set(note.id, branchRootId);
    }
    return j;
  };

  const addSegment = (
    from: TreeJunction,
    to: TreeJunction,
    startAngle: number,
    endAngle: number,
    branchRootId: string,
    depth: number,
    kind: "trunk" | "branch",
    strength = 0.42,
  ) => {
    const key = `${from.id}>${to.id}:${kind}`;
    if (segmentKeys.has(key)) return;
    segmentKeys.add(key);
    const motif = motifFromTangents(from, to, startAngle, endAngle, strength);
    segments.push({
      id: `seg-${segmentCounter++}`,
      fromJunctionId: from.id,
      toJunctionId: to.id,
      d: motifPath(from, to, motif, false),
      branchRootId,
      depth,
      kind,
      motif,
      mirror: false,
    });
  };

  const connectPath = (
    rawPoints: Array<[number, number]>,
    branchRootId: string,
    depth: number,
    kind: "trunk" | "branch",
  ) => {
    const points = rawPoints.map(P);
    const js = points.map((p, i) =>
      getOrCreate(p, branchRootId, depth, undefined, UP, i === 0 ? undefined : undefined),
    );
    const tangentAt = (i: number) => {
      if (i === 0) return angleBetween(points[0], points[1]);
      if (i === points.length - 1) return angleBetween(points[points.length - 2], points[points.length - 1]);
      return angleBetween(points[i - 1], points[i + 1]);
    };
    for (let i = 0; i < js.length - 1; i++) {
      addSegment(js[i], js[i + 1], tangentAt(i), tangentAt(i + 1), branchRootId, depth, kind, 0.4);
      js[i + 1].angle = tangentAt(i + 1);
    }
    return js;
  };

  // Reference trunk, traced from the supplied design.
  connectPath(
    [
      [356, 704],
      [356, 558],
      [356, 365],
      [356, 318],
    ],
    "trunk",
    0,
    "trunk",
  );

  const roots = (childrenOf.get(null) ?? []).filter((n) => !hidden.has(n.id));
  const usedProfiles = new Set<string>();

  const localGrow = (
    parent: TreeNoteInput,
    from: TreeJunction,
    profile: Profile,
    branchRootId: string,
    depth: number,
    localScale: number,
  ) => {
    if (collapsed.has(parent.id)) return;
    const kids = [...(childrenOf.get(parent.id) ?? [])].sort((a, b) => weightOf(b.id) - weightOf(a.id));
    if (kids.length === 0) return;

    const target = profile.localHeading;
    const stemLength = localScale * (0.55 + 0.09 * Math.min(kids.length, 5)) * scale;
    let previous = from;
    let previousPoint: Vec = { x: from.x, y: from.y };
    const branchPoints: TreeJunction[] = [];

    kids.forEach((kid, i) => {
      const t = (i + 1) / (kids.length + 0.4);
      const curve = (t - 0.5) * 0.28 * -profile.side;
      const a = target + curve;
      const p = {
        x: from.x + Math.cos(a) * stemLength * t,
        y: from.y + Math.sin(a) * stemLength * t + (i - (kids.length - 1) / 2) * 3 * scale,
      };
      const bp = getOrCreate(p, branchRootId, depth, undefined, a);
      addSegment(previous, bp, previous.angle || target, a, branchRootId, depth, "branch", 0.44);
      previous = bp;
      previousPoint = p;
      branchPoints.push(bp);
    });

    kids.forEach((kid, i) => {
      const bp = branchPoints[i];
      const spread = (i - (kids.length - 1) / 2) * 0.16;
      const a = target + spread;
      const dist = localScale * (0.42 + 0.07 * Math.min(4, Math.sqrt(weightOf(kid.id)))) * scale;
      const p = {
        x: bp.x + Math.cos(a) * dist,
        y: bp.y + Math.sin(a) * dist + (i % 2 === 0 ? -1 : 1) * dist * 0.35,
      };
      const child = getOrCreate(p, branchRootId, depth, kid, a, `j-${kid.id}`);
      addSegment(bp, child, target, a, branchRootId, depth, "branch", 0.46);
      if (!collapsed.has(kid.id)) localGrow(kid, child, profile, branchRootId, depth + 1, localScale * 0.58);
    });
  };

  roots.forEach((root, index) => {
    const profile = preferredProfile(root, index, usedProfiles);
    const rootPoint = P(profile.root);
    const rootAngle = angleBetween(P(profile.trunkAttach), rootPoint);
    const rootNoteJ = getOrCreate(rootPoint, root.id, 1, root, rootAngle, `j-${root.id}`);

    // Blue connection from the trunk to the main branch node.
    const trunkStart = getOrCreate(P(profile.trunkAttach), "trunk", 0, undefined, UP);
    addSegment(trunkStart, rootNoteJ, UP, rootAngle, "trunk", 0, "trunk", 0.48);

    if (collapsed.has(root.id)) return;

    // Fixed traced branch silhouette. Shared coordinates are reused so the paths
    // really bifurcate instead of crossing as independent connectors.
    profile.paths.forEach((path) => connectPath(path, root.id, 2, "branch"));

    const terminalHeading = new Map<string, number>();
    profile.paths.forEach((path) => {
      const a = path[path.length - 2];
      const b = path[path.length - 1];
      terminalHeading.set(pointKey(P(b).x, P(b).y), angleBetween(P(a), P(b)));
    });

    const kids = [...(childrenOf.get(root.id) ?? [])].sort((a, b) => weightOf(b.id) - weightOf(a.id));
    const usedTerminalIndexes = new Set<number>();

    kids.forEach((kid, childIndex) => {
      const preferredIndex = profile.terminalPriority[childIndex];
      const terminalIndex =
        preferredIndex !== undefined && !usedTerminalIndexes.has(preferredIndex)
          ? preferredIndex
          : profile.terminals.findIndex((_p, i) => !usedTerminalIndexes.has(i));

      if (terminalIndex >= 0) {
        usedTerminalIndexes.add(terminalIndex);
        const p = P(profile.terminals[terminalIndex]);
        const key = pointKey(p.x, p.y);
        const heading = terminalHeading.get(key) ?? profile.localHeading;
        const terminal = getOrCreate(p, root.id, 2, kid, heading, `j-${kid.id}`);
        if (!collapsed.has(kid.id)) localGrow(kid, terminal, profile, root.id, 3, profile.localScale);
      } else {
        // More first-level notes than the reference has endpoints: extend the
        // canopy locally rather than stretching or re-laying out the whole tree.
        const baseAngle = profile.localHeading + (childIndex - kids.length / 2) * 0.12;
        const distance = (46 + (childIndex - profile.terminals.length) * 8) * scale;
        const p = {
          x: rootNoteJ.x + Math.cos(baseAngle) * distance,
          y: rootNoteJ.y + Math.sin(baseAngle) * distance,
        };
        const child = getOrCreate(p, root.id, 2, kid, baseAngle, `j-${kid.id}`);
        addSegment(rootNoteJ, child, profile.localHeading, baseAngle, root.id, 2, "branch", 0.48);
        if (!collapsed.has(kid.id)) localGrow(kid, child, profile, root.id, 3, profile.localScale);
      }
    });
  });

  return { junctions, segments, byNote, rootJunction, branchRootOf };
};

export const strokeForDepth = (depth: number, kind: "trunk" | "branch") => {
  if (kind === "trunk") return 3;
  if (depth <= 1) return 2.35;
  if (depth === 2) return 2.05;
  if (depth === 3) return 1.7;
  return Math.max(1.15, 1.55 - (depth - 4) * 0.1);
};

export const BRANCH_PALETTE = ["#FAADE2", "#F5E076", "#45C9BE", "#E7B48C"];
export const paletteColorFor = (_id: string, index: number) => BRANCH_PALETTE[index % BRANCH_PALETTE.length];
