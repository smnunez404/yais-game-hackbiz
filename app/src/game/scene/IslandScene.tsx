// El mundo de la escena (T-001-06).
//
// La isla del primer hito, poblada con el mundo mínimo que ya está
// sincronizado: sendero, puente, banco, árboles, palmera, faro y nubes. Todas
// las rutas salen de `shared/assets.ts`; aquí no hay ninguna literal.
//
// Las posiciones no están adivinadas: se midieron las cajas contenedoras
// reales de cada GLB (la isla mide 6,27 × 6,30 y su césped está a y≈0,2; el
// faro mide 4,65 de alto; un árbol, 2,92). Por eso los números de abajo son
// concretos y no un "más o menos".
//
// Sin animación de cámara ni movimiento ambiental: AC-7 se cumple por no
// tener nada que apagar. Las nubes están quietas a propósito.

import { useGLTF } from "@react-three/drei";
import { useMemo } from "react";
import type { Object3D } from "three";

import { WORLD_ASSETS, type WorldAssetId } from "../../shared/assets";

type Posicion = readonly [number, number, number];

interface Pieza {
  readonly id: WorldAssetId;
  readonly clave: string;
  readonly position: Posicion;
  readonly rotationY?: number;
  readonly scale?: number;
}

/** Altura del césped de la isla, medida en su GLB. */
const CESPED = 0.2;

/**
 * Composición del escenario. Es una lista de datos, no código: mover un
 * árbol es cambiar tres números, y quien dirige arte puede leerla sin saber
 * React.
 */
const PIEZAS: readonly Pieza[] = [
  // Sendero que entra desde el frente, a un lado del claro donde conversan.
  { id: "path_straight", clave: "sendero-1", position: [-1.5, 0.06, 2.0] },
  { id: "path_straight", clave: "sendero-2", position: [-1.5, 0.06, 0.1] },

  // El puente que el episodio reconstruye al final, al borde de la isla.
  { id: "bridge_straight", clave: "puente", position: [0.2, 0.1, -3.0] },

  { id: "lighthouse", clave: "faro", position: [-2.1, CESPED, -2.0] },
  { id: "tree_round", clave: "arbol-1", position: [2.3, CESPED, -1.5] },
  { id: "tree_round", clave: "arbol-2", position: [-2.6, CESPED, 0.7], scale: 0.85 },
  { id: "palm", clave: "palmera", position: [1.9, CESPED, 1.6] },
  { id: "bench", clave: "banco", position: [-1.9, CESPED, 1.7], rotationY: 0.7 },

  // Nubes fuera de la isla, para dar aire y escala.
  { id: "cloud", clave: "nube-1", position: [-3.8, 2.4, -1.6] },
  { id: "cloud", clave: "nube-2", position: [3.4, 2.9, -0.8], scale: 1.2 },
  { id: "cloud", clave: "nube-3", position: [0.6, 3.2, -3.4], scale: 0.9 },
];

/**
 * Una pieza del mundo. Cada instancia clona la escena del GLB porque un
 * mismo `Object3D` no puede estar dos veces en el grafo; el archivo se
 * descarga una sola vez y `useGLTF` lo reutiliza (PLAN-001: "no copies el
 * modelo por escena").
 */
function PiezaDelMundo({ id, position, rotationY = 0, scale = 1 }: Omit<Pieza, "clave">) {
  // Sin decodificador Draco desde un CDN: ver `Character.tsx`.
  const { scene } = useGLTF(WORLD_ASSETS[id].modelUrl, false);
  const copia = useMemo<Object3D>(() => scene.clone(true), [scene]);

  return (
    <primitive
      object={copia}
      position={[...position]}
      rotation={[0, rotationY, 0]}
      scale={scale}
      dispose={null}
    />
  );
}

export function IslandScene() {
  const { scene } = useGLTF(WORLD_ASSETS.island_large.modelUrl, false);

  return (
    <group>
      <primitive object={scene} position={[0, 0, 0]} dispose={null} />
      {PIEZAS.map(({ clave, ...pieza }) => (
        <PiezaDelMundo key={clave} {...pieza} />
      ))}
    </group>
  );
}
