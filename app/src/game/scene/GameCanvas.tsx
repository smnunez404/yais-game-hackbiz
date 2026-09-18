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

import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useCallback, useMemo, useState } from "react";

import type { CharacterId } from "../../shared/assets";
import { Character } from "./Character";
import type { EstadoDeEscena } from "./estado-de-escena";
import { IslandScene } from "./IslandScene";
import { RADIO_CAMINABLE } from "./control-del-jugador";
import { destinoDe } from "./posiciones";
import { useControlDelJugador } from "./useControlDelJugador";

interface GameCanvasProps {
  readonly escena: EstadoDeEscena;
  readonly menosMovimiento: boolean;
  /**
   * Se llama si el navegador pierde el contexto WebGL: una laptop vieja
   * sosteniendo un proyector varias horas puede llegar ahí. No es una
   * excepción de JavaScript, así que un límite de error no la atrapa; hay que
   * escuchar el evento (revisión de a11y-perf-reviewer).
   */
  readonly alPerderContexto: () => void;
}

/**
 * Personaje que mueve quien juega. Es la mascota: acompaña al niño en todo el
 * episodio y está en el reparto de las siete escenas. Mover a Capi no dispara
 * ninguna línea ni cambia de escena —el guion no tiene coordenadas—, así que
 * el episodio se juega igual sin tocarlo (AC-8).
 */
const PERSONAJE_DEL_JUGADOR: CharacterId = "capi";

/** A dónde mira la cámara: al claro, no al horizonte. */
const PUNTO_DE_MIRA: readonly [number, number, number] = [0, 0.7, 0.2];

/**
 * Cámara fija. Está lo bastante atrás para que quepan la isla entera (6,3 de
 * ancho) y el faro (4,65 de alto) sin recortes, y lo bastante alta para que
 * se vea el suelo del claro donde conversan los personajes.
 */
const POSICION_DE_CAMARA: readonly [number, number, number] = [0, 3.4, 8.6];

export default function GameCanvas({
  escena,
  menosMovimiento,
  alPerderContexto,
}: GameCanvasProps) {
  const [enMovimiento, setEnMovimiento] = useState<readonly CharacterId[]>([]);

  const alCambiarActividad = useCallback((characterId: CharacterId, activo: boolean) => {
    setEnMovimiento((previos) => {
      const estaba = previos.includes(characterId);
      if (activo === estaba) return previos;
      return activo ? [...previos, characterId] : previos.filter((id) => id !== characterId);
    });
  }, []);

  // Una orden nueva tiene que reencender el bucle: si la escena estaba
  // quieta, nadie estaría dibujando para ver el primer paso.
  const alRecibirOrden = useCallback(() => {
    alCambiarActividad(PERSONAJE_DEL_JUGADOR, true);
  }, [alCambiarActividad]);

  const { comando, irA } = useControlDelJugador({ menosMovimiento, alRecibirOrden });

  const alTocarElSuelo = useCallback(
    (evento: ThreeEvent<PointerEvent>) => {
      evento.stopPropagation();
      irA(evento.point.x, evento.point.z);
    },
    [irA],
  );

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
      onCreated={({ camera, gl }) => {
        camera.lookAt(...PUNTO_DE_MIRA);
        gl.domElement.addEventListener("webglcontextlost", (evento) => {
          // Sin `preventDefault` el navegador no intentará restaurarlo; aquí
          // no se intenta restaurar nada, se retira la escena y la sesión
          // continúa en 2D, que es lo que protege AC-8.
          evento.preventDefault();
          alPerderContexto();
        });
      }}
      // `powerPreference: "low-power"` y sin antialias: el objetivo es una
      // laptop de aula, no una estación gráfica. Se medirá antes de subir.
      gl={{ antialias: false, powerPreference: "low-power" }}
      dpr={[1, 1.5]}
    >
      <hemisphereLight intensity={1.1} groundColor="#c8b89a" />
      <directionalLight position={[3, 5, 2]} intensity={1.4} />

      <Suspense fallback={null}>
        <IslandScene environment={escena.environment} />

        {/* Suelo invisible para señalar a dónde caminar con un toque o un
            clic: es lo que permite mover al personaje con un solo puntero,
            sin depender del teclado (AC-6).

            Es mucho más grande que la isla a propósito. Quien toca el agua no
            se queda sin respuesta: `irA` acerca el punto al sitio alcanzable
            más cercano, así que el control nunca parece roto. */}
        {menosMovimiento ? null : (
          <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} onPointerDown={alTocarElSuelo}>
            <circleGeometry args={[RADIO_CAMINABLE * 5, 48]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        )}

        {personajes.map(({ characterId, destino, gesto }) => (
          <Character
            key={characterId}
            characterId={characterId}
            destino={destino}
            sceneId={escena.sceneId}
            gesto={gesto}
            sessionVars={escena.sessionVars}
            menosMovimiento={menosMovimiento}
            comandoDelJugador={characterId === PERSONAJE_DEL_JUGADOR ? comando : undefined}
            alCambiarActividad={alCambiarActividad}
          />
        ))}
      </Suspense>
    </Canvas>
  );
}
