// El archipiélago y por dónde se puede caminar (T-001-06, prototipo).
//
// Módulo puro: sin React y sin Three, para poder probar las reglas del mundo
// sin WebGL.
//
// Las medidas salen de las cajas contenedoras reales de los GLB, no de
// tantear: `island_large` mide 6,27 × 6,30 (radio ≈ 3,13) con el césped a
// y≈0,2, y `bridge_straight` mide 1,63 de ancho por 2,13 de largo.
//
// Hay tres islas porque hay un solo modelo de isla: se repite a distintas
// escalas. La lámina `isla-acuerdos-environment-sheet.png` tiene un
// archipiélago con más variedad; eso es trabajo de arte, no de código.

/** Zona caminable circular: una isla. */
export interface IslaDelMundo {
  readonly clave: string;
  readonly centro: readonly [number, number];
  /** Escala a la que se dibuja el modelo. */
  readonly escala: number;
  /** Radio por el que se puede andar, ya con margen respecto al borde. */
  readonly radioCaminable: number;
}

/** Zona caminable rectangular alineada a los ejes: un puente. */
export interface PuenteDelMundo {
  readonly clave: string;
  readonly centro: readonly [number, number];
  /** Mitad del ancho en x y en z de la zona por la que se puede pasar. */
  readonly medioAncho: number;
  readonly medioLargo: number;
  /** Giro con el que se dibuja el modelo, en radianes. */
  readonly rotacionY: number;
}

/** Altura del césped de una isla, medida en el GLB. */
export const ALTURA_DEL_SUELO = 0.2;

/**
 * Isla central: donde ocurre la conversación del episodio. Las otras dos
 * existen para que el mundo tenga a dónde ir, no porque el guion las use.
 */
export const ISLA_PRINCIPAL: IslaDelMundo = {
  clave: "isla-acuerdos",
  centro: [0, 0],
  escala: 1,
  radioCaminable: 2.6,
};

export const ISLAS: readonly IslaDelMundo[] = [
  ISLA_PRINCIPAL,
  { clave: "isla-faro", centro: [8.4, -0.4], escala: 0.85, radioCaminable: 2.1 },
  { clave: "isla-palmeras", centro: [-8.0, -0.6], escala: 0.8, radioCaminable: 2.0 },
];

/**
 * Los puentes están a la altura por la que se anda (z≈0,5, donde se paran los
 * personajes), no en la línea que une los centros de las islas: si no, había
 * que buscarlos, y caminar hacia la isla de al lado terminaba en el borde sin
 * explicación. `medioLargo` coincide con el ancho real del tablero (1,63 del
 * modelo por 1,15 de escala, la mitad) para que no se pueda andar por el
 * aire al lado del puente.
 */
export const PUENTES: readonly PuenteDelMundo[] = [
  {
    clave: "puente-este",
    centro: [4.4, 0.1],
    medioAncho: 2.15,
    medioLargo: 0.93,
    rotacionY: Math.PI / 2,
  },
  {
    clave: "puente-oeste",
    centro: [-4.3, 0.1],
    medioAncho: 1.9,
    medioLargo: 0.93,
    rotacionY: Math.PI / 2,
  },
];

/** Largo de un tablero de puente ya escalado, para repartir las piezas. */
export const LARGO_DE_TABLERO = 2.13 * 1.15;

interface Punto {
  readonly x: number;
  readonly z: number;
}

function distancia(a: Punto, b: Punto): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/**
 * Un pelo hacia dentro del borde. Proyectar justo sobre el radio deja el
 * punto fuera por el error de la coma flotante, y entonces el sitio al que se
 * acaba de mandar al personaje resulta no ser caminable. Lo cazaron los
 * tests, no una revisión.
 */
const MARGEN_DE_BORDE = 1e-6;

function puntoMasCercanoEnIsla(isla: IslaDelMundo, punto: Punto): Punto {
  const [cx, cz] = isla.centro;
  const dx = punto.x - cx;
  const dz = punto.z - cz;
  const largo = Math.hypot(dx, dz);
  if (largo <= isla.radioCaminable) return punto;
  const factor = (isla.radioCaminable - MARGEN_DE_BORDE) / largo;
  return { x: cx + dx * factor, z: cz + dz * factor };
}

function puntoMasCercanoEnPuente(puente: PuenteDelMundo, punto: Punto): Punto {
  const [cx, cz] = puente.centro;
  return {
    x: Math.min(Math.max(punto.x, cx - puente.medioAncho), cx + puente.medioAncho),
    z: Math.min(Math.max(punto.z, cz - puente.medioLargo), cz + puente.medioLargo),
  };
}

/** `true` si se puede estar de pie en ese punto: isla o puente. */
export function esCaminable(x: number, z: number): boolean {
  const punto = { x, z };
  const enIsla = ISLAS.some((isla) => distancia({ x: isla.centro[0], z: isla.centro[1] }, punto) <= isla.radioCaminable);
  if (enIsla) return true;
  return PUENTES.some(
    (puente) =>
      Math.abs(x - puente.centro[0]) <= puente.medioAncho &&
      Math.abs(z - puente.centro[1]) <= puente.medioLargo,
  );
}

/**
 * El punto caminable más cercano al pedido. Se usa en dos sitios: para que
 * tocar el agua lleve a la orilla en vez de no hacer nada, y para que el paso
 * de cada cuadro no termine en el mar.
 */
export function acercarAZonaCaminable(x: number, z: number): Punto {
  const punto = { x, z };
  if (esCaminable(x, z)) return punto;

  const candidatos: Punto[] = [
    ...ISLAS.map((isla) => puntoMasCercanoEnIsla(isla, punto)),
    ...PUENTES.map((puente) => puntoMasCercanoEnPuente(puente, punto)),
  ];

  let mejor = candidatos[0] ?? punto;
  for (const candidato of candidatos) {
    if (distancia(candidato, punto) < distancia(mejor, punto)) mejor = candidato;
  }
  return mejor;
}
