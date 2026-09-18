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
// La escena es decorado: no recibe foco, no tiene controles y el envoltorio
// que la contiene va `aria-hidden` (lo pone `EscenaDelEpisodio`). Todo lo que
// hay que leer, elegir o escuchar vive en la interfaz 2D, que es la ruta
// accesible y la que sigue funcionando sola (AC-8).

import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useMemo, useState } from "react";

import type { CharacterId } from "../../shared/assets";
import { Character } from "./Character";
import type { EstadoDeEscena } from "./estado-de-escena";
import { IslandScene } from "./IslandScene";
import { destinoDe } from "./posiciones";

interface GameCanvasProps {
  readonly escena: EstadoDeEscena;
  readonly menosMovimiento: boolean;
}

/** A dónde mira la cámara: al claro, no al horizonte. */
const PUNTO_DE_MIRA: readonly [number, number, number] = [0, 0.7, 0.2];

/**
 * Cámara fija. Está lo bastante atrás para que quepan la isla entera (6,3 de
 * ancho) y el faro (4,65 de alto) sin recortes, y lo bastante alta para que
 * se vea el suelo del claro donde conversan los personajes.
 */
const POSICION_DE_CAMARA: readonly [number, number, number] = [0, 3.4, 8.6];

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
      escena.personajes.map((characterId) => {
        // Solo actúa quien tiene el turno; el resto acompaña en reposo.
        const esProtagonista = characterId === escena.protagonista;
        const gesto = esProtagonista ? escena.gesto : ({ tipo: "reposo" } as const);
        return {
          characterId,
          gesto,
          destino: destinoDe(characterId, gesto, esProtagonista),
        };
      }),
    [escena.personajes, escena.protagonista, escena.gesto],
  );

  return (
    <Canvas
      frameloop={hayMovimiento ? "always" : "demand"}
      camera={{ position: [...POSICION_DE_CAMARA], fov: 38 }}
      onCreated={({ camera }) => camera.lookAt(...PUNTO_DE_MIRA)}
      // `powerPreference: "low-power"` y sin antialias: el objetivo es una
      // laptop de aula, no una estación gráfica. Se medirá antes de subir.
      gl={{ antialias: false, powerPreference: "low-power" }}
      dpr={[1, 1.5]}
    >
      <hemisphereLight intensity={1.1} groundColor="#c8b89a" />
      <directionalLight position={[3, 5, 2]} intensity={1.4} />

      <Suspense fallback={null}>
        <IslandScene />
        {personajes.map(({ characterId, destino, gesto }) => (
          <Character
            key={characterId}
            characterId={characterId}
            destino={destino}
            sceneId={escena.sceneId}
            gesto={gesto}
            sessionVars={escena.sessionVars}
            menosMovimiento={menosMovimiento}
            alCambiarActividad={alCambiarActividad}
          />
        ))}
      </Suspense>
    </Canvas>
  );
}
