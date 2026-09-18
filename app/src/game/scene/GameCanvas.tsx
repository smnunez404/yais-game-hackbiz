// El lienzo 3D (T-001-06).
//
// Este módulo es el único que importa Three y React Three Fiber, y se carga
// con `import()` desde `EscenaDelEpisodio`: un equipo sin WebGL no descarga
// el motor 3D, y el fallback 2D no paga su peso (revisión de
// a11y-perf-reviewer, T-001-05).
//
// Bucle de render: `frameloop="demand"` mientras la escena está quieta, y
// `"always"` solo mientras algún personaje se mueve. Una laptop de aula no
// tiene que dibujar 60 veces por segundo un personaje que está esperando a
// que alguien pulse un botón (Constitución VI). Con `prefers-reduced-motion`
// el bucle no se enciende nunca.
//
// La escena es decorado: no recibe foco, no tiene controles y va
// `aria-hidden`. Todo lo que hay que leer, elegir o escuchar vive en la
// interfaz 2D, que es la ruta accesible y la que sigue funcionando sola
// (AC-8).

import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useMemo, useState } from "react";

import type { CharacterId } from "../../shared/assets";
import { Character } from "./Character";
import type { EstadoDeEscena } from "./estado-de-escena";
import { IslandScene } from "./IslandScene";

interface GameCanvasProps {
  readonly escena: EstadoDeEscena;
  readonly menosMovimiento: boolean;
}

/** Posiciones fijas del escenario. Sin movimiento de cámara (AC-7). */
const POSICION_POR_PERSONAJE: Readonly<Record<CharacterId, readonly [number, number, number]>> = {
  capi: [-0.7, 0, 0],
  tomi: [0.7, 0, 0],
  luna: [1.8, 0, 0],
  clara: [-1.8, 0, 0],
  beto: [2.6, 0, 0],
};

export default function GameCanvas({ escena, menosMovimiento }: GameCanvasProps) {
  const [enMovimiento, setEnMovimiento] = useState<readonly CharacterId[]>([]);

  const alCambiarActividad = useCallback((characterId: CharacterId, activo: boolean) => {
    setEnMovimiento((previos) => {
      const estaba = previos.includes(characterId);
      if (activo === estaba) return previos;
      return activo ? [...previos, characterId] : previos.filter((id) => id !== characterId);
    });
  }, []);

  const hayMovimiento = enMovimiento.length > 0 && !menosMovimiento;

  const personajes = useMemo(
    () =>
      escena.personajes.map((characterId) => ({
        characterId,
        position: POSICION_POR_PERSONAJE[characterId],
        // Solo actúa quien tiene el turno; el resto acompaña en reposo.
        gesto: characterId === escena.protagonista ? escena.gesto : ({ tipo: "reposo" } as const),
      })),
    [escena.personajes, escena.protagonista, escena.gesto],
  );

  return (
    <div className="escena" aria-hidden="true">
      <Canvas
        frameloop={hayMovimiento ? "always" : "demand"}
        camera={{ position: [0, 1.5, 4.2], fov: 40 }}
        // `powerPreference: "low-power"` y sin antialias: el objetivo es una
        // laptop de aula, no una estación gráfica. Se medirá antes de subir.
        gl={{ antialias: false, powerPreference: "low-power" }}
        dpr={[1, 1.5]}
      >
        <hemisphereLight intensity={1.1} groundColor="#c8b89a" />
        <directionalLight position={[3, 5, 2]} intensity={1.4} />

        <Suspense fallback={null}>
          <IslandScene />
          {personajes.map(({ characterId, position, gesto }) => (
            <Character
              key={characterId}
              characterId={characterId}
              position={position}
              gesto={gesto}
              sessionVars={escena.sessionVars}
              menosMovimiento={menosMovimiento}
              alCambiarActividad={alCambiarActividad}
            />
          ))}
        </Suspense>
      </Canvas>
    </div>
  );
}
