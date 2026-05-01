// Warm editorial palette (HSL strings to be used as `hsl(var(...))` or directly)
export const CATEGORY_COLORS: { name: string; hsl: string }[] = [
  { name: "Terracota", hsl: "14 65% 55%" },
  { name: "Mostaza",   hsl: "38 75% 55%" },
  { name: "Oliva",     hsl: "75 35% 45%" },
  { name: "Salvia",    hsl: "140 25% 50%" },
  { name: "Océano",    hsl: "200 45% 50%" },
  { name: "Ciruela",   hsl: "320 30% 50%" },
  { name: "Arcilla",   hsl: "20 40% 45%" },
  { name: "Carbón",    hsl: "30 10% 35%" },
];

export const DEFAULT_CATEGORY_COLOR = CATEGORY_COLORS[0].hsl;
