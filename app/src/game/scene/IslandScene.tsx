// El archipiélago (T-001-06, prototipo).
//
// Tres islas unidas por dos puentes, pobladas con el mundo mínimo que ya está
// sincronizado. Todas las rutas salen de `shared/assets.ts`; aquí no hay
// ninguna literal.
//
// Por dónde se puede caminar lo decide `mundo.ts`, que es puro y está
// probado; aquí solo se dibuja lo que ese módulo declara, para que el suelo
// que se ve y el suelo que se pisa no puedan separarse.
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
import { ALTURA_DEL_SUELO, ISLAS, LARGO_DE_TABLERO, PUENTES } from "./mundo";

type Posicion = readonly [number, number, number];

interface Pieza {
  readonly id: WorldAssetId;
  readonly clave: string;
  readonly position: Posicion;
  readonly rotationY?: number;
  readonly scale?: number;
  /**
   * Elemento de `environment` del que depende esta pieza. Si la escena lo
   * declara en un estado que no sabemos representar, la pieza no se monta:
   * mostrar un puente entero mientras el guion dice que está roto sería
   * contradecir el contenido con el decorado.
   */
  readonly dependeDe?: { readonly elemento: string; readonly estadosQueLoOcultan: readonly string[] };
}

/** Altura del césped de la isla, medida en su GLB. */
const CESPED = ALTURA_DEL_SUELO;

/**
 * Composición del escenario. Es una lista de datos, no código: mover un
 * árbol es cambiar tres números, y quien dirige arte puede leerla sin saber
 * React.
 */
const PIEZAS: readonly Pieza[] = [
  // --- Isla central: el claro donde ocurre la conversación ---
  { id: "path_straight", clave: "sendero-1", position: [-1.5, 0.06, 2.0] },
  { id: "path_straight", clave: "sendero-2", position: [-1.5, 0.06, 0.1] },
  { id: "lighthouse", clave: "faro-central", position: [-2.1, CESPED, -2.0] },
  { id: "tree_round", clave: "arbol-1", position: [2.3, CESPED, -1.5] },
  { id: "tree_round", clave: "arbol-2", position: [-2.6, CESPED, 0.7], scale: 0.85 },
  { id: "palm", clave: "palmera-central", position: [1.9, CESPED, 1.6] },
  { id: "bench", clave: "banco", position: [-1.9, CESPED, 1.7], rotationY: 0.7 },

  // --- Isla del faro (este) ---
  { id: "lighthouse", clave: "faro-este", position: [9.2, CESPED, -2.4], scale: 0.9 },
  { id: "tree_round", clave: "arbol-este", position: [7.4, CESPED, 0.2], scale: 0.8 },
  { id: "bench", clave: "banco-este", position: [8.9, CESPED, 0.3], rotationY: -0.5 },

  // --- Isla de las palmeras (oeste) ---
  { id: "palm", clave: "palmera-oeste-1", position: [-8.8, CESPED, -1.8], scale: 0.9 },
  { id: "palm", clave: "palmera-oeste-2", position: [-7.1, CESPED, 0.5], scale: 0.75 },
  { id: "tree_round", clave: "arbol-oeste", position: [-8.9, CESPED, 0.7], scale: 0.7 },

  // --- Cielo ---
  { id: "cloud", clave: "nube-1", position: [-3.8, 2.4, -1.6] },
  { id: "cloud", clave: "nube-2", position: [3.4, 2.9, -0.8], scale: 1.2 },
  { id: "cloud", clave: "nube-3", position: [0.6, 3.2, -3.4], scale: 0.9 },
  { id: "cloud", clave: "nube-4", position: [9.5, 3.1, -3.8], scale: 1.1 },
  { id: "cloud", clave: "nube-5", position: [-9.2, 2.7, -3.2] },
];

/**
 * Una pieza del mundo. Cada instancia clona la escena del GLB porque un
 * mismo `Object3D` no puede estar dos veces en el grafo; el archivo se
 * descarga una sola vez y `useGLTF` lo reutiliza (PLAN-001: "no copies el
 * modelo por escena").
 */
interface PiezaDelMundoProps {
  readonly id: WorldAssetId;
  readonly position: Posicion;
  readonly rotationY?: number | undefined;
  readonly scale?: number | undefined;
}

function PiezaDelMundo({ id, position, rotationY = 0, scale = 1 }: PiezaDelMundoProps) {
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

interface IslandSceneProps {
  /** `environment` de la escena actual, tal cual viene del contenido. */
  readonly environment: Readonly<Record<string, string>>;
}

function seMuestra(pieza: Pieza, environment: Readonly<Record<string, string>>): boolean {
  if (!pieza.dependeDe) return true;
  const estado = environment[pieza.dependeDe.elemento];
  return estado === undefined || !pieza.dependeDe.estadosQueLoOcultan.includes(estado);
}

export function IslandScene({ environment }: IslandSceneProps) {
  const { scene } = useGLTF(WORLD_ASSETS.island_large.modelUrl, false);
  // Una copia por isla: un mismo `Object3D` no puede estar dos veces en el
  // grafo, pero el archivo se descarga una sola vez.
  const islas = useMemo(() => ISLAS.map((isla) => ({ isla, copia: scene.clone(true) })), [scene]);

  return (
    <group>
      {islas.map(({ isla, copia }) => (
        <primitive
          key={isla.clave}
          object={copia}
          position={[isla.centro[0], 0, isla.centro[1]]}
          scale={isla.escala}
          dispose={null}
        />
      ))}

      {/* Los puentes se dibujan donde `mundo.ts` dice que se puede cruzar, no
          donde quede bonito: el tablero tiene que coincidir con la zona
          caminable o el personaje andaría sobre el agua.

          Cada cruce lleva dos tableros porque uno solo (2,45 ya escalado) no
          llega a cubrir el vano entre orillas. Se reparten a media distancia
          del centro, así que si el vano cambia en `mundo.ts` el dibujo lo
          sigue sin tocar nada aquí. */}
      {PUENTES.flatMap((puente) =>
        [-1, 1].map((lado) => (
          <PiezaDelMundo
            key={`${puente.clave}-${lado}`}
            id="bridge_straight"
            position={[
              puente.centro[0] + (lado * LARGO_DE_TABLERO) / 2.2,
              CESPED - 0.12,
              puente.centro[1],
            ]}
            rotationY={puente.rotacionY}
            scale={1.15}
          />
        )),
      )}

      {PIEZAS.filter((pieza) => seMuestra(pieza, environment)).map((pieza) => (
        <PiezaDelMundo
          key={pieza.clave}
          id={pieza.id}
          position={pieza.position}
          rotationY={pieza.rotationY}
          scale={pieza.scale}
        />
      ))}
    </group>
  );
}
