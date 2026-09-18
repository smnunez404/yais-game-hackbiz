// Tests del control del personaje (T-001-06, prototipo).
//
// Las reglas del movimiento se prueban sin WebGL: qué teclas cuentan, hacia
// dónde empujan y hasta dónde se puede llegar.

import { describe, expect, it } from "vitest";

import {
  dentroDeLaIsla,
  direccionDeTecla,
  direccionDeTeclas,
  RADIO_CAMINABLE,
} from "./control-del-jugador";

describe("direccionDeTecla", () => {
  it("mueve con W, A, S y D", () => {
    expect(direccionDeTecla("KeyW")).toEqual([0, -1]);
    expect(direccionDeTecla("KeyS")).toEqual([0, 1]);
    expect(direccionDeTecla("KeyA")).toEqual([-1, 0]);
    expect(direccionDeTecla("KeyD")).toEqual([1, 0]);
  });

  it("no toca las flechas ni las teclas del diálogo", () => {
    // Las flechas desplazan la página y mueven la selección de los controles;
    // Tab, Enter y espacio son la ruta accesible. Caminar no puede quitárselas
    // a quien juega sin ratón.
    for (const tecla of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab", "Enter", "Space"]) {
      expect(direccionDeTecla(tecla)).toBeNull();
    }
  });
});

describe("direccionDeTeclas", () => {
  it("sin teclas no pide nada", () => {
    expect(direccionDeTeclas([])).toBeNull();
    expect(direccionDeTeclas(["KeyQ"])).toBeNull();
  });

  it("dos teclas en diagonal no van más rápido que una sola", () => {
    const diagonal = direccionDeTeclas(["KeyW", "KeyD"]);

    expect(diagonal).not.toBeNull();
    expect(Math.hypot(diagonal!.x, diagonal!.z)).toBeCloseTo(1, 5);
  });

  it("dos teclas opuestas se anulan", () => {
    expect(direccionDeTeclas(["KeyA", "KeyD"])).toBeNull();
  });
});

describe("dentroDeLaIsla", () => {
  it("deja pasar cualquier punto que ya esté dentro", () => {
    expect(dentroDeLaIsla(1, 1)).toEqual({ x: 1, z: 1 });
  });

  it("no deja salirse de la isla ni señalando el agua", () => {
    const fuera = dentroDeLaIsla(10, -10);

    expect(Math.hypot(fuera.x, fuera.z)).toBeCloseTo(RADIO_CAMINABLE, 5);
    // Conserva la dirección: se queda en el borde más cercano a donde apuntó.
    expect(Math.sign(fuera.x)).toBe(1);
    expect(Math.sign(fuera.z)).toBe(-1);
  });

  it("el borde caminable está dentro de la isla, que llega a 3,13", () => {
    expect(RADIO_CAMINABLE).toBeLessThan(3.13);
  });
});
