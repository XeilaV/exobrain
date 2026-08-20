import type { Note } from "@/types/notes";

export const CANONICAL_SIZE = { width: 611, height: 767 } as const;
export const CANONICAL_ROOT = { x: 307, y: 719 } as const;

export interface CanonicalBranch {
  key: string;
  color: string;
  root: { x: number; y: number };
  attach: { x: number; y: number };
  slots: readonly { x: number; y: number }[];
  mainPath: string;
}

// Calco en coordenadas del lienzo 611 × 767 de la captura entregada.
// El orden de los puntos es estable: las notas existentes conservan siempre el
// mismo punto y las futuras usan sus coordenadas persistidas, sin redistribuir.
export const CANONICAL_BRANCHES: readonly CanonicalBranch[] = [
  {
    key: "reflexion",
    color: "145 32% 55%",
    root: { x: 251, y: 237 },
    attach: { x: 314, y: 236 },
    mainPath: "M 314 236 C 298 246, 277 249, 251 237",
    slots: [
      { x: 334, y: 276 }, { x: 364, y: 227 }, { x: 388, y: 170 }, { x: 358, y: 134 },
      { x: 288, y: 165 }, { x: 322, y: 107 }, { x: 330, y: 75 }, { x: 235, y: 133 },
      { x: 211, y: 100 }, { x: 228, y: 70 }, { x: 168, y: 168 }, { x: 137, y: 109 },
      { x: 160, y: 204 }, { x: 143, y: 243 }, { x: 199, y: 275 }, { x: 370, y: 372 },
    ],
  },
  {
    key: "idea",
    color: "38 75% 55%",
    root: { x: 382, y: 276 },
    attach: { x: 367, y: 318 },
    mainPath: "M 367 318 C 370 303, 369 285, 382 276",
    slots: [
      { x: 376, y: 234 }, { x: 396, y: 180 }, { x: 458, y: 144 }, { x: 536, y: 155 },
      { x: 536, y: 194 }, { x: 526, y: 225 }, { x: 489, y: 263 }, { x: 515, y: 320 },
      { x: 467, y: 359 }, { x: 420, y: 329 }, { x: 514, y: 319 },
    ],
  },
  {
    key: "tarea",
    color: "14 72% 61%",
    root: { x: 220, y: 421 },
    attach: { x: 307, y: 544 },
    mainPath: "M 307 544 C 276 513, 250 464, 220 421",
    slots: [
      { x: 287, y: 470 }, { x: 267, y: 512 }, { x: 231, y: 466 }, { x: 213, y: 531 },
      { x: 184, y: 499 }, { x: 145, y: 542 }, { x: 154, y: 437 }, { x: 122, y: 468 },
      { x: 80, y: 440 }, { x: 57, y: 518 }, { x: 88, y: 498 }, { x: 72, y: 479 },
      { x: 116, y: 405 }, { x: 94, y: 366 }, { x: 132, y: 310 }, { x: 83, y: 330 },
      { x: 187, y: 322 }, { x: 231, y: 344 }, { x: 246, y: 378 }, { x: 285, y: 318 },
    ],
  },
  {
    key: "abuela carmen",
    color: "145 32% 55%",
    root: { x: 371, y: 432 },
    attach: { x: 300, y: 463 },
    mainPath: "M 300 463 C 327 475, 347 449, 371 432",
    slots: [{ x: 370, y: 372 }, { x: 429, y: 394 }, { x: 412, y: 468 }],
  },
  {
    key: "psico",
    color: "320 34% 67%",
    root: { x: 343, y: 555 },
    attach: { x: 307, y: 544 },
    mainPath: "M 307 544 C 321 548, 331 552, 343 555",
    slots: [
      { x: 358, y: 471 }, { x: 350, y: 503 }, { x: 407, y: 528 }, { x: 449, y: 490 },
      { x: 476, y: 520 }, { x: 441, y: 562 }, { x: 471, y: 590 }, { x: 388, y: 590 },
      { x: 372, y: 619 }, { x: 417, y: 617 },
    ],
  },
] as const;

export const CANONICAL_TRUNK_PATH =
  "M 307 719 C 303 700, 322 685, 313 660 C 301 635, 303 620, 310 603 C 316 584, 303 568, 307 544 C 310 519, 292 501, 298 475 C 305 451, 290 429, 299 404 C 307 381, 294 359, 303 337 C 312 316, 303 289, 314 269 C 322 254, 311 244, 314 236";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

export const branchForTitle = (title: string) => {
  const key = normalize(title);
  return CANONICAL_BRANCHES.find((branch) => key.includes(branch.key));
};

export const stableSubtree = (notes: Note[], rootId: string) => {
  const descendants: Note[] = [];
  const visit = (parentId: string) => {
    notes
      .filter((note) => note.parentNoteId === parentId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .forEach((note) => {
        descendants.push(note);
        visit(note.id);
      });
  };
  visit(rootId);
  return descendants;
};