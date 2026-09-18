// Tests del archipiélago (T-001-06, prototipo).
//
// Lo que se comprueba es que no se pueda caminar sobre el agua y que las
// islas estén de verdad conectadas: sin eso, "caminar entre islas" sería una
// promesa que el mundo no cumple.

import { describe, expect, it } from "vitest";

import { acercarAZonaCaminable, esCaminable, ISLAS, ISLA_PRINCIPAL, PUENTES } from "./mundo";

describe("esCaminable", () => {
  it("se puede estar en el centro de cada isla", () => {
    for (const isla of ISLAS) {
      expect(esCaminable(isla.centro[0], isla.centro[1])).toBe(true);
    }
  });

  it("no se puede estar en el agua", () => {
    // Bien lejos de todo, y también en el hueco entre la isla central y el
    // borde sur, por donde no pasa ningún puente.
    expect(esCaminable(40, 40)).toBe(false);
    expect(esCaminable(0, 9)).toBe(false);
  });

  it("se puede cruzar cada puente", () => {
    for (const puente of PUENTES) {
      expect(esCaminable(puente.centro[0], puente.centro[1])).toBe(true);
    }
  });

  it("cada puente toca de verdad las dos orillas que une", () => {
    // Si un puente no llegara a la isla, quedaría un salto de agua en medio y
    // el personaje se detendría en el aire.
    for (const puente of PUENTES) {
      const [cx, cz] = puente.centro;
      const extremoA = { x: cx - puente.medioAncho, z: cz };
      const extremoB = { x: cx + puente.medioAncho, z: cz };

      const tocaIslaEnA = ISLAS.some(
        (isla) => Math.hypot(extremoA.x - isla.centro[0], extremoA.z - isla.centro[1]) <= isla.radioCaminable,
      );
      const tocaIslaEnB = ISLAS.some(
        (isla) => Math.hypot(extremoB.x - isla.centro[0], extremoB.z - isla.centro[1]) <= isla.radioCaminable,
      );

      expect(tocaIslaEnA, `${puente.clave} no llega a ninguna isla por un extremo`).toBe(true);
      expect(tocaIslaEnB, `${puente.clave} no llega a ninguna isla por el otro`).toBe(true);
    }
  });

  it("se puede ir de una isla a otra sin pisar agua", () => {
    // Recorrido en línea recta desde la isla del oeste hasta la del este,
    // muestreado cada 10 cm: ningún punto puede caer fuera.
    const oeste = ISLAS.find((isla) => isla.clave === "isla-palmeras");
    const este = ISLAS.find((isla) => isla.clave === "isla-faro");
    if (!oeste || !este) throw new Error("Faltan islas del archipiélago.");

    const pasos = 200;
    let fueraDelCamino = 0;
    for (let paso = 0; paso <= pasos; paso += 1) {
      const t = paso / pasos;
      const x = oeste.centro[0] + (este.centro[0] - oeste.centro[0]) * t;
      const z = oeste.centro[1] + (este.centro[1] - oeste.centro[1]) * t;
      if (!esCaminable(x, z)) fueraDelCamino += 1;
    }

    expect(fueraDelCamino).toBe(0);
  });
});

describe("acercarAZonaCaminable", () => {
  it("deja igual un punto que ya es caminable", () => {
    expect(acercarAZonaCaminable(0, 0)).toEqual({ x: 0, z: 0 });
  });

  it("lleva a la orilla el punto de agua que se señale", () => {
    const orilla = acercarAZonaCaminable(0, 12);

    expect(esCaminable(orilla.x, orilla.z)).toBe(true);
    // Se queda en la isla principal, que es la que tiene enfrente.
    expect(Math.hypot(orilla.x, orilla.z)).toBeCloseTo(ISLA_PRINCIPAL.radioCaminable, 5);
  });

  it("elige la orilla más cercana, no siempre la isla central", () => {
    const cercaDelFaro = acercarAZonaCaminable(14, -1.2);

    expect(esCaminable(cercaDelFaro.x, cercaDelFaro.z)).toBe(true);
    expect(cercaDelFaro.x).toBeGreaterThan(5);
  });
});
