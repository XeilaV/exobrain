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
/* Motivos de bifurcación (extraídos de Group 8.svg)                    */
/* ------------------------------------------------------------------ */
//
// Cada ForkMotif es una unión REAL del dibujo: se detectaron las junctions por
// coincidencia geométrica de extremos (sin asumir la dirección de los paths) y,
// cuando un path estaba dibujado al revés, su Bézier se invirtió matemáticamente
// (orden de segmentos y de puntos de control) conservando exactamente la curva.
// Todas las salidas se almacenan desde la junction hacia fuera, en un marco local
// donde +X es la dirección de crecimiento de la rama madre entrante y la escala es
// la longitud de la salida más larga. No hay lectura de SVG en runtime.

export interface ForkChild {
  /** extremo de la salida en el marco local normalizado */
  anchor: number[];
  /** cadena de cúbicas [[c1, c2, end], ...] con inicio implícito en (0,0) */
  curves: number[][][];
}

export interface ForkMotif {
  arity: number;
  children: ForkChild[];
  extent: number[];
  spanY: number;
}

export const FORK_MOTIFS: ForkMotif[] = [{"arity": 2, "children": [{"anchor": [0.8021, 0.1605], "curves": [[[0.2833, -0.1322], [0.563, -0.0715], [0.8021, 0.1605]]]}, {"anchor": [0.651, 0.7591], "curves": [[[0.4803, 0.0347], [0.5078, 0.607], [0.651, 0.7591]]]}], "extent": [0, -0.1322, 0.8021, 0.7591], "spanY": 0.8913}, {"arity": 1, "children": [{"anchor": [-0.5913, -0.8064], "curves": [[[-0.0672, -0.0383], [-0.0973, -0.2398], [-0.1723, -0.4042]], [[-0.2863, -0.6542], [-0.443, -0.6793], [-0.5913, -0.8064]]]}], "extent": [-0.5913, -0.8064, 0, 0], "spanY": 0.8064}, {"arity": 2, "children": [{"anchor": [0.7777, -0.6286], "curves": [[[0.476, 0.0484], [0.6093, -0.5065], [0.7777, -0.6286]]]}, {"anchor": [0.7593, -0.05], "curves": [[[0.2649, 0.0031], [0.5695, 0.1085], [0.7593, -0.05]]]}], "extent": [0, -0.6286, 0.7777, 0.1085], "spanY": 0.7371}, {"arity": 2, "children": [{"anchor": [0.6333, 0.4091], "curves": [[[0.2214, 0.1196], [0.543, 0.1756], [0.6333, 0.4091]]]}, {"anchor": [0.3659, 0.9307], "curves": [[[0.4306, 0.1829], [0.2766, 0.7399], [0.3659, 0.9307]]]}], "extent": [0, 0, 0.6333, 0.9307], "spanY": 0.9307}, {"arity": 3, "children": [{"anchor": [0.3785, -0.428], "curves": [[[0.0859, -0.0597], [0.1041, -0.109], [0.1653, -0.2483]], [[0.2142, -0.3597], [0.3166, -0.3987], [0.3785, -0.428]]]}, {"anchor": [0.9939, 0.1101], "curves": [[[0.2432, 0.0792], [0.39, -0.077], [0.5992, -0.0984]], [[0.7665, -0.1155], [0.9321, 0.0335], [0.9939, 0.1101]]]}, {"anchor": [0.7352, 0.304], "curves": [[[0.1953, 0.1447], [0.3273, 0.1057], [0.49, 0.1063]], [[0.6202, 0.1068], [0.7077, 0.2383], [0.7352, 0.304]]]}], "extent": [0, -0.428, 0.9939, 0.304], "spanY": 0.7319}, {"arity": 3, "children": [{"anchor": [0.5639, -0.6425], "curves": [[[0.1281, -0.1503], [0.6071, -0.2647], [0.5639, -0.6425]]]}, {"anchor": [-0.5549, 0.8319], "curves": [[[-0.1519, 0.0998], [-0.103, 0.2841], [-0.1216, 0.4168]], [[-0.1603, 0.6917], [-0.348, 0.6564], [-0.5549, 0.8319]]]}, {"anchor": [-0.6201, 0.3388], "curves": [[[-0.062, 0.002], [-0.4345, 0.1649], [-0.6201, 0.3388]]]}], "extent": [-0.6201, -0.6425, 0.6071, 0.8319], "spanY": 1.4744}, {"arity": 2, "children": [{"anchor": [0.9684, 0.2494], "curves": [[[0.124, 0.0576], [0.2501, 0.1276], [0.3557, 0.161]], [[0.6274, 0.2468], [0.701, 0.13], [0.9684, 0.2494]]]}, {"anchor": [0.5952, 0.6066], "curves": [[[0.0494, 0.0265], [0.1752, 0.1152], [0.2155, 0.2184]], [[0.2658, 0.3474], [0.2936, 0.4664], [0.5952, 0.6066]]]}], "extent": [0, 0, 0.9684, 0.6066], "spanY": 0.6066}, {"arity": 2, "children": [{"anchor": [0.8984, 0.3646], "curves": [[[0.2109, 0.1331], [0.3904, 0.0286], [0.5904, 0.0655]], [[0.7503, 0.095], [0.8623, 0.2773], [0.8984, 0.3646]]]}, {"anchor": [0.4495, 0.8933], "curves": [[[0.0792, 0.2695], [0.2834, 0.3074], [0.411, 0.4657]], [[0.513, 0.5923], [0.4792, 0.8035], [0.4495, 0.8933]]]}], "extent": [0, 0, 0.8984, 0.8933], "spanY": 0.8933}, {"arity": 3, "children": [{"anchor": [0.5639, -0.6425], "curves": [[[0.1282, -0.1503], [0.6071, -0.2647], [0.5639, -0.6425]]]}, {"anchor": [-0.5549, 0.8319], "curves": [[[-0.1519, 0.0998], [-0.103, 0.2841], [-0.1216, 0.4168]], [[-0.1603, 0.6917], [-0.348, 0.6564], [-0.5549, 0.8319]]]}, {"anchor": [-0.6201, 0.3388], "curves": [[[-0.062, 0.002], [-0.4345, 0.1649], [-0.6201, 0.3388]]]}], "extent": [-0.6201, -0.6425, 0.6071, 0.8319], "spanY": 1.4744}, {"arity": 2, "children": [{"anchor": [0.9684, 0.2494], "curves": [[[0.124, 0.0576], [0.2501, 0.1276], [0.3557, 0.161]], [[0.6274, 0.2468], [0.701, 0.13], [0.9684, 0.2494]]]}, {"anchor": [0.5952, 0.6066], "curves": [[[0.0494, 0.0265], [0.1753, 0.1152], [0.2155, 0.2184]], [[0.2658, 0.3474], [0.2936, 0.4664], [0.5952, 0.6066]]]}], "extent": [0, 0, 0.9684, 0.6066], "spanY": 0.6066}, {"arity": 3, "children": [{"anchor": [0.7352, -0.304], "curves": [[[0.1953, -0.1447], [0.3273, -0.1057], [0.49, -0.1063]], [[0.6202, -0.1068], [0.7077, -0.2383], [0.7352, -0.304]]]}, {"anchor": [0.9939, -0.1101], "curves": [[[0.2432, -0.0792], [0.39, 0.077], [0.5992, 0.0984]], [[0.7665, 0.1155], [0.9321, -0.0335], [0.9939, -0.1101]]]}, {"anchor": [0.3785, 0.428], "curves": [[[0.0859, 0.0597], [0.1041, 0.109], [0.1653, 0.2483]], [[0.2142, 0.3597], [0.3166, 0.3987], [0.3785, 0.428]]]}], "extent": [0, -0.304, 0.9939, 0.428], "spanY": 0.7319}, {"arity": 3, "children": [{"anchor": [-0.6201, -0.3388], "curves": [[[-0.062, -0.002], [-0.4345, -0.1649], [-0.6201, -0.3388]]]}, {"anchor": [-0.5549, -0.8319], "curves": [[[-0.1519, -0.0998], [-0.103, -0.2841], [-0.1216, -0.4168]], [[-0.1603, -0.6917], [-0.348, -0.6564], [-0.5549, -0.8319]]]}, {"anchor": [0.5639, 0.6425], "curves": [[[0.1281, 0.1503], [0.6071, 0.2647], [0.5639, 0.6425]]]}], "extent": [-0.6201, -0.8319, 0.6071, 0.6425], "spanY": 1.4744}, {"arity": 2, "children": [{"anchor": [0.5952, -0.6066], "curves": [[[0.0494, -0.0265], [0.1752, -0.1152], [0.2155, -0.2184]], [[0.2658, -0.3474], [0.2936, -0.4664], [0.5952, -0.6066]]]}, {"anchor": [0.9684, -0.2494], "curves": [[[0.124, -0.0576], [0.2501, -0.1276], [0.3557, -0.161]], [[0.6274, -0.2468], [0.701, -0.13], [0.9684, -0.2494]]]}], "extent": [0, -0.6066, 0.9684, 0], "spanY": 0.6066}, {"arity": 2, "children": [{"anchor": [0.4495, -0.8933], "curves": [[[0.0792, -0.2695], [0.2835, -0.3074], [0.411, -0.4657]], [[0.513, -0.5923], [0.4792, -0.8035], [0.4495, -0.8933]]]}, {"anchor": [0.8984, -0.3646], "curves": [[[0.2109, -0.1331], [0.3904, -0.0286], [0.5903, -0.0655]], [[0.7503, -0.095], [0.8623, -0.2773], [0.8984, -0.3646]]]}], "extent": [0, -0.8933, 0.8984, 0], "spanY": 0.8933}, {"arity": 2, "children": [{"anchor": [0.4805, -0.877], "curves": [[[0.4532, -0.1323], [0.3693, -0.6999], [0.4805, -0.877]]]}, {"anchor": [0.6805, -0.3305], "curves": [[[0.2393, -0.0953], [0.563, -0.1115], [0.6805, -0.3305]]]}], "extent": [0, -0.877, 0.6805, 0], "spanY": 0.877}, {"arity": 3, "children": [{"anchor": [0.7352, -0.304], "curves": [[[0.1953, -0.1447], [0.3273, -0.1057], [0.49, -0.1063]], [[0.6202, -0.1068], [0.7077, -0.2383], [0.7352, -0.304]]]}, {"anchor": [0.9939, -0.1101], "curves": [[[0.2432, -0.0792], [0.39, 0.077], [0.5992, 0.0984]], [[0.7665, 0.1155], [0.9321, -0.0335], [0.9939, -0.1101]]]}, {"anchor": [0.3785, 0.428], "curves": [[[0.0859, 0.0597], [0.1041, 0.109], [0.1653, 0.2483]], [[0.2142, 0.3597], [0.3166, 0.3987], [0.3785, 0.428]]]}], "extent": [0, -0.304, 0.9939, 0.428], "spanY": 0.7319}, {"arity": 3, "children": [{"anchor": [-0.6201, -0.3388], "curves": [[[-0.062, -0.002], [-0.4345, -0.1649], [-0.6201, -0.3388]]]}, {"anchor": [-0.5549, -0.8319], "curves": [[[-0.1519, -0.0998], [-0.103, -0.2841], [-0.1216, -0.4168]], [[-0.1603, -0.6917], [-0.348, -0.6564], [-0.5549, -0.8319]]]}, {"anchor": [0.5639, 0.6425], "curves": [[[0.1281, 0.1503], [0.6071, 0.2647], [0.5639, 0.6425]]]}], "extent": [-0.6201, -0.8319, 0.6071, 0.6425], "spanY": 1.4744}, {"arity": 2, "children": [{"anchor": [0.5952, -0.6066], "curves": [[[0.0494, -0.0265], [0.1752, -0.1152], [0.2155, -0.2184]], [[0.2658, -0.3474], [0.2936, -0.4664], [0.5952, -0.6066]]]}, {"anchor": [0.9684, -0.2494], "curves": [[[0.124, -0.0576], [0.2501, -0.1276], [0.3557, -0.161]], [[0.6274, -0.2468], [0.701, -0.13], [0.9684, -0.2494]]]}], "extent": [0, -0.6066, 0.9684, 0], "spanY": 0.6066}, {"arity": 2, "children": [{"anchor": [0.4495, -0.8933], "curves": [[[0.0792, -0.2695], [0.2834, -0.3074], [0.411, -0.4657]], [[0.513, -0.5923], [0.4792, -0.8035], [0.4495, -0.8933]]]}, {"anchor": [0.8984, -0.3646], "curves": [[[0.2109, -0.1331], [0.3904, -0.0286], [0.5904, -0.0655]], [[0.7503, -0.095], [0.8623, -0.2773], [0.8984, -0.3646]]]}], "extent": [0, -0.8933, 0.8984, 0], "spanY": 0.8933}, {"arity": 1, "children": [{"anchor": [0.9806, 0.1962], "curves": [[[0.3463, -0.1616], [0.6883, -0.0874], [0.9806, 0.1962]]]}], "extent": [0, -0.1616, 0.9806, 0.1962], "spanY": 0.3578}, {"arity": 1, "children": [{"anchor": [0.651, 0.7591], "curves": [[[0.4803, 0.0347], [0.5078, 0.607], [0.651, 0.7591]]]}], "extent": [0, 0, 0.651, 0.7591], "spanY": 0.7591}, {"arity": 1, "children": [{"anchor": [0.7777, -0.6286], "curves": [[[0.476, 0.0484], [0.6093, -0.5065], [0.7777, -0.6286]]]}], "extent": [0, -0.6286, 0.7777, 0.0484], "spanY": 0.677}, {"arity": 1, "children": [{"anchor": [0.9978, -0.0657], "curves": [[[0.3481, 0.0041], [0.7484, 0.1426], [0.9978, -0.0657]]]}], "extent": [0, -0.0657, 0.9978, 0.1426], "spanY": 0.2083}, {"arity": 1, "children": [{"anchor": [0.84, 0.5426], "curves": [[[0.2937, 0.1586], [0.7202, 0.2329], [0.84, 0.5426]]]}], "extent": [0, 0, 0.84, 0.5426], "spanY": 0.5426}, {"arity": 1, "children": [{"anchor": [0.3659, 0.9307], "curves": [[[0.4306, 0.1829], [0.2766, 0.7399], [0.3659, 0.9307]]]}], "extent": [0, 0, 0.4306, 0.9307], "spanY": 0.9307}, {"arity": 1, "children": [{"anchor": [0.6625, -0.7491], "curves": [[[0.1503, -0.1045], [0.1822, -0.1908], [0.2893, -0.4346]], [[0.3749, -0.6296], [0.5541, -0.6978], [0.6625, -0.7491]]]}], "extent": [0, -0.7491, 0.6625, 0], "spanY": 0.7491}, {"arity": 1, "children": [{"anchor": [0.9939, 0.1101], "curves": [[[0.2432, 0.0792], [0.39, -0.077], [0.5992, -0.0984]], [[0.7665, -0.1155], [0.9321, 0.0335], [0.9939, 0.1101]]]}], "extent": [0, -0.1155, 0.9939, 0.1101], "spanY": 0.2256}, {"arity": 1, "children": [{"anchor": [0.9241, 0.3821], "curves": [[[0.2455, 0.1819], [0.4114, 0.1329], [0.6159, 0.1336]], [[0.7796, 0.1342], [0.8895, 0.2995], [0.9241, 0.3821]]]}], "extent": [0, 0, 0.9241, 0.3821], "spanY": 0.3821}, {"arity": 1, "children": [{"anchor": [0.6596, -0.7516], "curves": [[[0.1498, -0.1758], [0.7102, -0.3096], [0.6596, -0.7516]]]}], "extent": [0, -0.7516, 0.7102, 0], "spanY": 0.7516}, {"arity": 1, "children": [{"anchor": [-0.5549, 0.8319], "curves": [[[-0.1519, 0.0998], [-0.103, 0.2841], [-0.1216, 0.4168]], [[-0.1603, 0.6917], [-0.348, 0.6564], [-0.5549, 0.8319]]]}], "extent": [-0.5549, 0, 0, 0.8319], "spanY": 0.8319}, {"arity": 1, "children": [{"anchor": [-0.8776, 0.4795], "curves": [[[-0.0877, 0.0028], [-0.6149, 0.2334], [-0.8776, 0.4795]]]}], "extent": [-0.8776, 0, 0, 0.4795], "spanY": 0.4795}, {"arity": 1, "children": [{"anchor": [0.9684, 0.2494], "curves": [[[0.124, 0.0576], [0.2501, 0.1276], [0.3557, 0.161]], [[0.6274, 0.2468], [0.701, 0.13], [0.9684, 0.2494]]]}], "extent": [0, 0, 0.9684, 0.2494], "spanY": 0.2494}, {"arity": 1, "children": [{"anchor": [0.7004, 0.7138], "curves": [[[0.0581, 0.0312], [0.2062, 0.1356], [0.2536, 0.257]], [[0.3128, 0.4088], [0.3455, 0.5488], [0.7004, 0.7138]]]}], "extent": [0, 0, 0.7004, 0.7138], "spanY": 0.7138}, {"arity": 1, "children": [{"anchor": [0.9266, 0.376], "curves": [[[0.2175, 0.1373], [0.4027, 0.0295], [0.6089, 0.0676]], [[0.7739, 0.098], [0.8894, 0.286], [0.9266, 0.376]]]}], "extent": [0, 0, 0.9266, 0.376], "spanY": 0.376}, {"arity": 1, "children": [{"anchor": [0.4495, 0.8933], "curves": [[[0.0792, 0.2695], [0.2834, 0.3074], [0.411, 0.4657]], [[0.513, 0.5923], [0.4792, 0.8035], [0.4495, 0.8933]]]}], "extent": [0, 0, 0.513, 0.8933], "spanY": 0.8933}, {"arity": 1, "children": [{"anchor": [0.6596, -0.7516], "curves": [[[0.15, -0.1758], [0.7102, -0.3096], [0.6596, -0.7516]]]}], "extent": [0, -0.7516, 0.7102, 0], "spanY": 0.7516}, {"arity": 1, "children": [{"anchor": [-0.5549, 0.8319], "curves": [[[-0.1519, 0.0998], [-0.103, 0.2841], [-0.1216, 0.4168]], [[-0.1603, 0.6917], [-0.348, 0.6564], [-0.5549, 0.8319]]]}], "extent": [-0.5549, 0, 0, 0.8319], "spanY": 0.8319}, {"arity": 1, "children": [{"anchor": [-0.8776, 0.4795], "curves": [[[-0.0877, 0.0028], [-0.6149, 0.2334], [-0.8776, 0.4795]]]}], "extent": [-0.8776, 0, 0, 0.4795], "spanY": 0.4795}, {"arity": 1, "children": [{"anchor": [0.9684, 0.2494], "curves": [[[0.124, 0.0576], [0.2501, 0.1276], [0.3557, 0.161]], [[0.6274, 0.2468], [0.701, 0.13], [0.9684, 0.2494]]]}], "extent": [0, 0, 0.9684, 0.2494], "spanY": 0.2494}, {"arity": 1, "children": [{"anchor": [0.7004, 0.7138], "curves": [[[0.0581, 0.0312], [0.2063, 0.1356], [0.2536, 0.257]], [[0.3128, 0.4088], [0.3455, 0.5488], [0.7004, 0.7138]]]}], "extent": [0, 0, 0.7004, 0.7138], "spanY": 0.7138}, {"arity": 1, "children": [{"anchor": [0.9241, -0.3821], "curves": [[[0.2455, -0.1819], [0.4114, -0.1329], [0.6159, -0.1336]], [[0.7796, -0.1342], [0.8895, -0.2995], [0.9241, -0.3821]]]}], "extent": [0, -0.3821, 0.9241, 0], "spanY": 0.3821}, {"arity": 1, "children": [{"anchor": [0.9939, -0.1101], "curves": [[[0.2432, -0.0792], [0.39, 0.077], [0.5992, 0.0984]], [[0.7665, 0.1155], [0.9321, -0.0335], [0.9939, -0.1101]]]}], "extent": [0, -0.1101, 0.9939, 0.1155], "spanY": 0.2256}, {"arity": 1, "children": [{"anchor": [0.6625, 0.7491], "curves": [[[0.1503, 0.1045], [0.1822, 0.1908], [0.2893, 0.4346]], [[0.3749, 0.6296], [0.5541, 0.6978], [0.6625, 0.7491]]]}], "extent": [0, 0, 0.6625, 0.7491], "spanY": 0.7491}, {"arity": 1, "children": [{"anchor": [-0.8776, -0.4795], "curves": [[[-0.0877, -0.0028], [-0.6149, -0.2334], [-0.8776, -0.4795]]]}], "extent": [-0.8776, -0.4795, 0, 0], "spanY": 0.4795}, {"arity": 1, "children": [{"anchor": [-0.5549, -0.8319], "curves": [[[-0.1519, -0.0998], [-0.103, -0.2841], [-0.1216, -0.4168]], [[-0.1603, -0.6917], [-0.348, -0.6564], [-0.5549, -0.8319]]]}], "extent": [-0.5549, -0.8319, 0, 0], "spanY": 0.8319}, {"arity": 1, "children": [{"anchor": [0.6596, 0.7516], "curves": [[[0.1498, 0.1758], [0.7102, 0.3096], [0.6596, 0.7516]]]}], "extent": [0, 0, 0.7102, 0.7516], "spanY": 0.7516}, {"arity": 1, "children": [{"anchor": [0.7004, -0.7138], "curves": [[[0.0581, -0.0312], [0.2062, -0.1356], [0.2536, -0.257]], [[0.3128, -0.4088], [0.3455, -0.5488], [0.7004, -0.7138]]]}], "extent": [0, -0.7138, 0.7004, 0], "spanY": 0.7138}, {"arity": 1, "children": [{"anchor": [0.9684, -0.2494], "curves": [[[0.124, -0.0576], [0.2501, -0.1276], [0.3557, -0.161]], [[0.6274, -0.2468], [0.701, -0.13], [0.9684, -0.2494]]]}], "extent": [0, -0.2494, 0.9684, 0], "spanY": 0.2494}, {"arity": 1, "children": [{"anchor": [0.4495, -0.8933], "curves": [[[0.0792, -0.2695], [0.2835, -0.3074], [0.411, -0.4657]], [[0.513, -0.5923], [0.4792, -0.8035], [0.4495, -0.8933]]]}], "extent": [0, -0.8933, 0.513, 0], "spanY": 0.8933}, {"arity": 1, "children": [{"anchor": [0.9266, -0.376], "curves": [[[0.2175, -0.1373], [0.4027, -0.0295], [0.6088, -0.0676]], [[0.7739, -0.098], [0.8894, -0.286], [0.9266, -0.376]]]}], "extent": [0, -0.376, 0.9266, 0], "spanY": 0.376}, {"arity": 1, "children": [{"anchor": [0.4805, -0.877], "curves": [[[0.4532, -0.1323], [0.3693, -0.6999], [0.4805, -0.877]]]}], "extent": [0, -0.877, 0.4805, 0], "spanY": 0.877}, {"arity": 1, "children": [{"anchor": [0.8995, -0.4369], "curves": [[[0.3163, -0.126], [0.7442, -0.1474], [0.8995, -0.4369]]]}], "extent": [0, -0.4369, 0.8995, 0], "spanY": 0.4369}, {"arity": 1, "children": [{"anchor": [0.9241, -0.3821], "curves": [[[0.2455, -0.1819], [0.4114, -0.1329], [0.6159, -0.1336]], [[0.7796, -0.1342], [0.8895, -0.2995], [0.9241, -0.3821]]]}], "extent": [0, -0.3821, 0.9241, 0], "spanY": 0.3821}, {"arity": 1, "children": [{"anchor": [0.9939, -0.1101], "curves": [[[0.2432, -0.0792], [0.39, 0.077], [0.5992, 0.0984]], [[0.7665, 0.1155], [0.9321, -0.0335], [0.9939, -0.1101]]]}], "extent": [0, -0.1101, 0.9939, 0.1155], "spanY": 0.2256}, {"arity": 1, "children": [{"anchor": [0.6625, 0.7491], "curves": [[[0.1503, 0.1045], [0.1822, 0.1908], [0.2893, 0.4346]], [[0.3749, 0.6296], [0.5541, 0.6978], [0.6625, 0.7491]]]}], "extent": [0, 0, 0.6625, 0.7491], "spanY": 0.7491}, {"arity": 1, "children": [{"anchor": [-0.8776, -0.4795], "curves": [[[-0.0877, -0.0028], [-0.6149, -0.2334], [-0.8776, -0.4795]]]}], "extent": [-0.8776, -0.4795, 0, 0], "spanY": 0.4795}, {"arity": 1, "children": [{"anchor": [-0.5549, -0.8319], "curves": [[[-0.1519, -0.0998], [-0.103, -0.2841], [-0.1216, -0.4168]], [[-0.1603, -0.6917], [-0.348, -0.6564], [-0.5549, -0.8319]]]}], "extent": [-0.5549, -0.8319, 0, 0], "spanY": 0.8319}, {"arity": 1, "children": [{"anchor": [0.6596, 0.7516], "curves": [[[0.1498, 0.1758], [0.7102, 0.3096], [0.6596, 0.7516]]]}], "extent": [0, 0, 0.7102, 0.7516], "spanY": 0.7516}, {"arity": 1, "children": [{"anchor": [0.7004, -0.7138], "curves": [[[0.0581, -0.0312], [0.2062, -0.1356], [0.2536, -0.257]], [[0.3128, -0.4088], [0.3455, -0.5488], [0.7004, -0.7138]]]}], "extent": [0, -0.7138, 0.7004, 0], "spanY": 0.7138}, {"arity": 1, "children": [{"anchor": [0.9684, -0.2494], "curves": [[[0.124, -0.0576], [0.2501, -0.1276], [0.3557, -0.161]], [[0.6274, -0.2468], [0.701, -0.13], [0.9684, -0.2494]]]}], "extent": [0, -0.2494, 0.9684, 0], "spanY": 0.2494}, {"arity": 1, "children": [{"anchor": [0.4495, -0.8933], "curves": [[[0.0792, -0.2695], [0.2834, -0.3074], [0.411, -0.4657]], [[0.513, -0.5923], [0.4792, -0.8035], [0.4495, -0.8933]]]}], "extent": [0, -0.8933, 0.513, 0], "spanY": 0.8933}, {"arity": 1, "children": [{"anchor": [0.9266, -0.376], "curves": [[[0.2175, -0.1373], [0.4027, -0.0295], [0.6089, -0.0676]], [[0.7739, -0.098], [0.8894, -0.286], [0.9266, -0.376]]]}], "extent": [0, -0.376, 0.9266, 0], "spanY": 0.376}];

interface PreparedChild extends ForkChild {
  angle: number;
  len: number;
  bend: number;
  /** tangente de salida en el extremo (radianes, marco local) */
  endAngle: number;
}

interface PreparedMotif extends ForkMotif {
  kids: PreparedChild[];
  maxAbsAngle: number;
  maxBend: number;
}

const prepare = (m: ForkMotif): PreparedMotif => {
  const kids = m.children.map((ch) => {
    const len = Math.hypot(ch.anchor[0], ch.anchor[1]) || 1;
    const angle = Math.atan2(ch.anchor[1], ch.anchor[0]);
    // desviación perpendicular máxima respecto a la cuerda junction->anchor
    const ux = ch.anchor[0] / len;
    const uy = ch.anchor[1] / len;
    let bend = 0;
    ch.curves.forEach((cv) =>
      cv.forEach((p) => {
        const perp = Math.abs(-p[0] * uy + p[1] * ux);
        if (perp > bend) bend = perp;
      }),
    );
    const last = ch.curves[ch.curves.length - 1];
    const endAngle = Math.atan2(ch.anchor[1] - last[1][1], ch.anchor[0] - last[1][0]);
    return { ...ch, len, angle, bend: bend / len, endAngle };
  });
  return {
    ...m,
    kids,
    maxAbsAngle: Math.max(...kids.map((k) => Math.abs(k.angle))),
    maxBend: Math.max(...kids.map((k) => k.bend)),
  };
};

const PREPARED = FORK_MOTIFS.map(prepare);
const BY_ARITY = new Map<number, PreparedMotif[]>();
PREPARED.forEach((m) => {
  const arr = BY_ARITY.get(m.arity);
  if (arr) arr.push(m);
  else BY_ARITY.set(m.arity, [m]);
});

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
 * Se usa para los tramos de tronco.
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
  /** motivo aplicado (solo tronco): permite re-dibujar el trazo al arrastrar */
  motif?: BranchMotif;
  mirror?: boolean;
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

const UP = -Math.PI / 2;

/** Elige el motivo de aridad `arity` que mejor cabe en el hueco angular disponible. */
const chooseFork = (
  arity: number,
  seed: string,
  leftRoom: number,
  rightRoom: number,
  bendLimit: number,
): { motif: PreparedMotif; mirror: boolean } => {
  const pool = BY_ARITY.get(arity) ?? [];
  const list = pool.length ? pool : (BY_ARITY.get(1) as PreparedMotif[]);
  let bestMotif: PreparedMotif = list[0];
  let bestMirror = false;
  let bestScore = Infinity;
  const h = hash(seed);
  list.forEach((m, i) => {
    [false, true].forEach((mirror) => {
      const sgn = mirror ? -1 : 1;
      let overflow = 0;
      m.kids.forEach((k) => {
        const a = k.angle * sgn;
        if (a > rightRoom) overflow += a - rightRoom;
        if (-a > leftRoom) overflow += -a - leftRoom;
      });
      const bendPenalty = Math.max(0, m.maxBend - bendLimit) * 2.5;
      // desempate determinista y estable por id
      const noise = ((h * 997 + i * 31 + (mirror ? 13 : 0)) % 100) / 1000;
      const score = overflow * 3 + bendPenalty + noise;
      if (score < bestScore) {
        bestScore = score;
        bestMotif = m;
        bestMirror = mirror;
      }
    });
  });
  return { motif: bestMotif, mirror: bestMirror };
};

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

  // --- Tronco ---
  const trunkStep = (compact ? 78 : 108) * (roots.length > 6 ? 0.92 : 1);
  let prev = rootJunction;
  const trunkPoints: TreeJunction[] = [rootJunction];

  roots.forEach((root, i) => {
    const wobble = (hash(`${root.id}-trunk`) - 0.5) * (compact ? 12 : 18);
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

  if (roots.length > 0) {
    const tipMotif = pickMotif("trunk-tip", 0.05);
    const tip: TreeJunction = {
      id: "trunk-tip",
      x: prev.x + (hash("tip") - 0.5) * 14,
      y: prev.y - trunkStep * 0.55,
      depth: 0,
      angle: UP,
    };
    junctions.push(tip);
    segments.push({
      id: "seg-trunk-tip",
      fromJunctionId: prev.id,
      toJunctionId: tip.id,
      d: motifPath(prev, tip, tipMotif, false),
      branchRootId: "trunk",
      depth: 0,
      kind: "trunk",
      motif: tipMotif,
      mirror: false,
    });
  }

  /* ---------------- Copa: bifurcaciones reales ---------------- */

  const MIN_LEN = compact ? 34 : 46;
  const DECAY = 0.72;

  /**
   * Coloca un grupo de hijas a partir de una junction, usando un motivo real de
   * bifurcación de la aridad exacta. Si no existe esa aridad, se compone con
   * varias bifurcaciones reales encadenadas por junctions intermedias invisibles.
   */
  const placeGroup = (
    from: TreeJunction,
    axis: number,
    leftRoom: number,
    rightRoom: number,
    kids: TreeNoteInput[],
    scale: number,
    depth: number,
    branchRootId: string,
    seed: string,
  ) => {
    if (kids.length === 0) return;

    // Aridades sin motivo propio: se componen encadenando bifurcaciones reales.
    let groups: TreeNoteInput[][];
    if (kids.length <= 3 && BY_ARITY.has(kids.length)) {
      groups = kids.map((k) => [k]);
    } else {
      const weights = kids.map((k) => weightOf(k.id));
      const total = weights.reduce((a, b) => a + b, 0);
      let acc = 0;
      let cut = 1;
      for (let i = 0; i < kids.length - 1; i++) {
        acc += weights[i];
        cut = i + 1;
        if (acc >= total / 2) break;
      }
      groups = [kids.slice(0, cut), kids.slice(cut)];
    }

    const { motif, mirror } = chooseFork(
      groups.length,
      seed,
      leftRoom,
      rightRoom,
      depth <= 1 ? 0.12 : 0.22,
    );
    const sgn = mirror ? -1 : 1;
    const ca = Math.cos(axis);
    const sa = Math.sin(axis);
    const toWorld = (p: number[]) => {
      const px = p[0] * scale;
      const py = p[1] * sgn * scale;
      return { x: from.x + px * ca - py * sa, y: from.y + px * sa + py * ca };
    };

    // Reparto de hijas por ángulo del motivo (orden estable de las salidas)
    const order = motif.kids
      .map((k, i) => ({ i, a: k.angle * sgn }))
      .sort((a, b) => a.a - b.a)
      .map((o) => o.i);

    order.forEach((mi, gi) => {
      const group = groups[gi];
      if (!group) return;
      const mk = motif.kids[mi];
      const end = toWorld(mk.anchor);
      const outAngle = axis + mk.endAngle * sgn;

      // Segmento: la madre termina aquí y la hija arranca exactamente en el mismo punto.
      let d = `M ${from.x.toFixed(2)} ${from.y.toFixed(2)}`;
      mk.curves.forEach((cv) => {
        const c1 = toWorld(cv[0]);
        const c2 = toWorld(cv[1]);
        const e = toWorld(cv[2]);
        d += ` C ${c1.x.toFixed(2)} ${c1.y.toFixed(2)}, ${c2.x.toFixed(2)} ${c2.y.toFixed(2)}, ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
      });

      // Sub-sector: mitad del hueco hacia las salidas vecinas
      const prevA = gi > 0 ? motif.kids[order[gi - 1]].angle * sgn : -leftRoom;
      const nextA = gi < order.length - 1 ? motif.kids[order[gi + 1]].angle * sgn : rightRoom;
      const myA = mk.angle * sgn;
      const subLeft = Math.max(0.12, Math.min(leftRoom, (myA - prevA) / 2));
      const subRight = Math.max(0.12, Math.min(rightRoom, (nextA - myA) / 2));

      const single = group.length === 1 ? group[0] : null;
      const jid = single ? `j-${single.id}` : `${from.id}-fk${gi}`;
      const j: TreeJunction = {
        id: jid,
        x: end.x,
        y: end.y,
        noteId: single?.id,
        branchRootId,
        depth,
        angle: outAngle,
      };
      junctions.push(j);
      if (single) {
        byNote.set(single.id, j);
        branchRootOf.set(single.id, branchRootId);
      }

      segments.push({
        id: `seg-${jid}`,
        fromJunctionId: from.id,
        toJunctionId: jid,
        d,
        branchRootId,
        depth,
        kind: "branch",
      });

      if (single) {
        if (collapsed.has(single.id)) return;
        const sub = childrenOf.get(single.id) ?? [];
        if (sub.length === 0) return;
        const w = weightOf(single.id);
        const nextScale = Math.max(
          MIN_LEN,
          scale * DECAY * (1 + Math.min(0.4, Math.sqrt(w) * 0.09)),
        );
        placeGroup(j, outAngle, subLeft, subRight, sub, nextScale, depth + 1, branchRootId, `${single.id}-f`);
      } else {
        // Junction intermedia invisible: sigue componiendo bifurcaciones reales.
        placeGroup(
          j,
          outAngle,
          subLeft,
          subRight,
          group,
          Math.max(MIN_LEN, scale * 0.82),
          depth,
          branchRootId,
          `${jid}-f`,
        );
      }
    });
  };

  // --- Sectores no solapados para las ramas raíz ---
  if (roots.length > 0) {
    const weights = roots.map((r) => weightOf(r.id));
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    const ARC = 2.35; // arco superior repartido entre las ramas raíz
    const start = UP - ARC / 2;

    // Cuñas consecutivas (no solapadas) de izquierda a derecha.
    const sectors: { a0: number; a1: number; mid: number; idx: number }[] = [];
    let acc = 0;
    roots.forEach((_, i) => {
      const a0 = start + (acc / total) * ARC;
      const a1 = start + ((acc + weights[i]) / total) * ARC;
      acc += weights[i];
      sectors.push({ a0, a1, mid: (a0 + a1) / 2, idx: i });
    });

    // Las cuñas más laterales salen de los puntos bajos del tronco y las
    // centrales de los altos: así ninguna rama cruza sobre otra.
    const order = sectors
      .slice()
      .sort((a, b) => Math.abs(b.mid - UP) - Math.abs(a.mid - UP));

    order.forEach((sec, k) => {
      const root = roots[sec.idx];
      const from = trunkPoints[k + 1] ?? trunkPoints[trunkPoints.length - 1] ?? rootJunction;
      const rootW = weights[sec.idx];
      const scale = (compact ? 88 : 124) * (1 + Math.min(0.6, Math.sqrt(rootW) * 0.12));
      placeGroup(
        from,
        sec.mid,
        Math.max(0.14, (sec.mid - sec.a0) * 0.92),
        Math.max(0.14, (sec.a1 - sec.mid) * 0.92),
        [root],
        scale,
        1,
        root.id,
        `${root.id}-root`,
      );
    });
  }


  return { junctions, segments, byNote, rootJunction, branchRootOf };
};

export const strokeForDepth = (depth: number, kind: "trunk" | "branch") => {
  if (kind === "trunk") return 1.7;
  if (depth <= 1) return 1.4;
  if (depth === 2) return 1.1;
  return Math.max(0.65, 0.95 - (depth - 3) * 0.08);
};

/** Paleta de ramas del prototipo oscuro. */
export const BRANCH_PALETTE = ["#7A6BFF", "#42E1C6", "#FFB06B", "#F57BC8", "#F3D75F", "#6BB8FF", "#B98BFF", "#7FE08A"];

export const paletteColorFor = (id: string, index: number) => BRANCH_PALETTE[index % BRANCH_PALETTE.length];
