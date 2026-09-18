import { describe, expect, it } from "vitest";

import {
  estorbaAlgunaZona,
  puntoLibreMasCercano,
  zonaDeClaro,
  zonaDePersonajeEsperando,
  zonaDePuente,
  zonaEstorba,
  zonasBaseDelMundo,
  zonasDeBocaDePuente,
  type ZonaProhibida,
} from "./colocacion";
import type { PuenteDelMundo } from "./mundo";

const PUENTE: PuenteDelMundo = {
  clave: "puente-prueba",
  centro: [4.4, 0.1],
  medioAncho: 2.15,
  medioLargo: 0.93,
  rotacionY: Math.PI / 2,
  alturaInicio: 0.2,
  alturaFin: 0.2,
};

describe("zonaEstorba", () => {
  it("detecta un banco en mitad del tablero del puente", () => {
    const zona = zonaDePuente(PUENTE);
    expect(zonaEstorba({ x: 4.4, z: 0.1 }, 0.3, zona)).toBe(true);
  });

  it("no marca un banco a un lado, fuera del tablero", () => {
    const zona = zonaDePuente(PUENTE);
    expect(zonaEstorba({ x: 4.4, z: 5.0 }, 0.3, zona)).toBe(false);
  });

  it("considera el bulto de la pieza, no solo su centro", () => {
    const zona = zonaDePuente(PUENTE);
    // Justo al borde del tablero: con radio 0 no estorba, con radio grande sí.
    const puntoAlBorde = { x: 4.4, z: 0.1 + PUENTE.medioLargo + 0.05 };
    expect(zonaEstorba(puntoAlBorde, 0, zona)).toBe(false);
    expect(zonaEstorba(puntoAlBorde, 0.5, zona)).toBe(true);
  });

  it("no lanza con coordenadas no finitas", () => {
    const zona = zonaDePuente(PUENTE);
    expect(() => zonaEstorba({ x: NaN, z: 0 }, 0.3, zona)).not.toThrow();
    expect(zonaEstorba({ x: NaN, z: 0 }, 0.3, zona)).toBe(false);
    expect(() => zonaEstorba({ x: 0, z: Infinity }, 0.3, zona)).not.toThrow();
  });

  it("no lanza con radios negativos ni zonas con medidas negativas", () => {
    const zonaRota: ZonaProhibida = {
      tipo: "rectangulo",
      centro: { x: 0, z: 0 },
      medioAncho: -1,
      medioLargo: -1,
    };
    expect(() => zonaEstorba({ x: 0, z: 0 }, -5, zonaRota)).not.toThrow();
  });
});

describe("zonasDeBocaDePuente", () => {
  it("cubre la franja justo donde termina el tablero y empieza la isla", () => {
    const bocas = zonasDeBocaDePuente(PUENTE, 1.2);
    const bocaIzquierda = bocas[0];
    expect(bocaIzquierda).toBeDefined();
    // El extremo oeste del puente está en x = centro - medioAncho.
    const puntoEnLaBoca = { x: PUENTE.centro[0] - PUENTE.medioAncho - 0.3, z: PUENTE.centro[1] };
    expect(zonaEstorba(puntoEnLaBoca, 0.3, bocaIzquierda as ZonaProhibida)).toBe(true);
  });

  it("no bloquea nada si el largo de boca es cero", () => {
    expect(zonasDeBocaDePuente(PUENTE, 0)).toHaveLength(0);
  });
});

describe("zonaDeClaro y zonaDePersonajeEsperando", () => {
  it("marca el centro del claro como ocupado", () => {
    const zona = zonaDeClaro({ clave: "x", episodioId: "ep01", posicion: [10, 10] }, 1.6);
    expect(zonaEstorba({ x: 10, z: 10 }, 0.3, zona)).toBe(true);
    expect(zonaEstorba({ x: 20, z: 20 }, 0.3, zona)).toBe(false);
  });

  it("marca dónde espera un personaje", () => {
    const zona = zonaDePersonajeEsperando([2, 3], 0.9);
    expect(zonaEstorba({ x: 2.2, z: 3.1 }, 0.3, zona)).toBe(true);
  });
});

describe("estorbaAlgunaZona", () => {
  it("es true si cualquiera de varias zonas estorba", () => {
    const zonas = zonasBaseDelMundo([PUENTE], []);
    expect(estorbaAlgunaZona({ x: 4.4, z: 0.1 }, 0.3, zonas)).toBe(true);
    expect(estorbaAlgunaZona({ x: 100, z: 100 }, 0.3, zonas)).toBe(false);
  });

  it("no lanza con una lista de zonas vacía", () => {
    expect(estorbaAlgunaZona({ x: 0, z: 0 }, 0.3, [])).toBe(false);
  });
});

describe("puntoLibreMasCercano", () => {
  it("devuelve el mismo punto si ya está libre", () => {
    const libre = puntoLibreMasCercano({ x: 100, z: 100 }, 0.3, [zonaDePuente(PUENTE)]);
    expect(libre).toEqual({ x: 100, z: 100 });
  });

  it("mueve una silla que cae en mitad del puente a un sitio que ya no estorba", () => {
    const zonas = [zonaDePuente(PUENTE)];
    const resultado = puntoLibreMasCercano({ x: 4.4, z: 0.1 }, 0.3, zonas, { radioMaximo: 3 });
    expect(estorbaAlgunaZona(resultado, 0.3, zonas)).toBe(false);
  });

  it("no lanza y devuelve el punto original si no hay sitio libre cerca", () => {
    // Una zona enorme que no deja escapatoria dentro del radio de búsqueda.
    const zonaEnorme: ZonaProhibida = {
      tipo: "circulo",
      centro: { x: 0, z: 0 },
      radio: 50,
    };
    const resultado = puntoLibreMasCercano({ x: 0, z: 0 }, 0.3, [zonaEnorme], { radioMaximo: 1 });
    expect(resultado).toEqual({ x: 0, z: 0 });
  });

  it("no lanza con entradas no finitas", () => {
    expect(() =>
      puntoLibreMasCercano({ x: NaN, z: 0 }, 0.3, [zonaDePuente(PUENTE)]),
    ).not.toThrow();
  });
});
