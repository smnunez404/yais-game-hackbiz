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

import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Group, WebGLRenderer } from "three";

import type { CharacterId } from "../../shared/assets";
import { Character } from "./Character";
import type { EstadoDeEscena } from "./estado-de-escena";
import { IslandScene } from "./IslandScene";
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

/**
 * Distancia de la cámara al personaje. Está lo bastante atrás y alto para que
 * se vean la isla donde se está y la siguiente, sin que el faro (4,65 de
 * alto) se salga por arriba.
 */
const DISTANCIA_DE_CAMARA: readonly [number, number, number] = [0, 4.2, 8.2];

/**
 * A qué altura del personaje mira la cámara. Baja a propósito: la cámara
 * apunta casi a sus pies, así que el personaje queda por encima del centro de
 * la pantalla y no lo tapa el panel de diálogo, que se apoya abajo.
 */
const ALTURA_DE_MIRA = 0.15;

/** Cuánto de la distancia pendiente recorre la cámara por segundo. */
const SUAVIDAD_DE_CAMARA = 3.5;

/**
 * Cámara que sigue al personaje. Va por detrás, sin girar nunca alrededor del
 * mundo: la orientación es siempre la misma, así que no hay vértigo ni
 * desorientación, y con `prefers-reduced-motion` no se mueve en absoluto
 * porque el personaje tampoco (AC-7).
 */
function CamaraQueSigue({
  objetivo,
  menosMovimiento,
}: {
  readonly objetivo: React.RefObject<Group | null>;
  readonly menosMovimiento: boolean;
}) {
  useFrame(({ camera }, delta) => {
    const seguido = objetivo.current;
    if (!seguido) return;

    const destinoX = seguido.position.x + DISTANCIA_DE_CAMARA[0];
    const destinoY = DISTANCIA_DE_CAMARA[1];
    const destinoZ = seguido.position.z + DISTANCIA_DE_CAMARA[2];

    if (menosMovimiento) {
      camera.position.set(destinoX, destinoY, destinoZ);
    } else {
      const avance = Math.min(1, SUAVIDAD_DE_CAMARA * delta);
      camera.position.x += (destinoX - camera.position.x) * avance;
      camera.position.y += (destinoY - camera.position.y) * avance;
      camera.position.z += (destinoZ - camera.position.z) * avance;
    }

    camera.lookAt(seguido.position.x, seguido.position.y + ALTURA_DE_MIRA, seguido.position.z);
  });

  return null;
}

export default function GameCanvas({
  escena,
  menosMovimiento,
  alPerderContexto,
}: GameCanvasProps) {
  const [enMovimiento, setEnMovimiento] = useState<readonly CharacterId[]>([]);
  /** El `Group` del personaje que se controla, para que la cámara lo siga. */
  const grupoDelJugador = useRef<Group | null>(null);
  const renderizador = useRef<WebGLRenderer | null>(null);

  // El aviso de contexto perdido se conecta en un efecto, no al crear el
  // lienzo, para poder desconectarlo al desmontar. React limpia los efectos
  // antes de quitar el nodo del DOM, así que el `webglcontextlost` que el
  // navegador dispara al destruir el lienzo ya no llega: sin esto, cualquier
  // desmontaje —o una recarga en caliente— retiraba la escena para siempre.
  useEffect(() => {
    const lienzo = renderizador.current?.domElement;
    if (!lienzo) return;

    function alPerder(evento: Event): void {
      // Sin `preventDefault` el navegador no intentaría restaurarlo; aquí no
      // se intenta restaurar nada, se retira la escena y la sesión continúa
      // en 2D, que es lo que protege AC-8.
      evento.preventDefault();
      alPerderContexto();
    }

    lienzo.addEventListener("webglcontextlost", alPerder);
    return () => {
      lienzo.removeEventListener("webglcontextlost", alPerder);
    };
  }, [alPerderContexto]);

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
      camera={{ position: [...DISTANCIA_DE_CAMARA], fov: 42, far: 80 }}
      onCreated={({ gl }) => {
        renderizador.current = gl;
      }}
      // `powerPreference: "low-power"` y sin antialias: el objetivo es una
      // laptop de aula, no una estación gráfica. Se medirá antes de subir.
      gl={{ antialias: false, powerPreference: "low-power" }}
      dpr={[1, 1.5]}
    >
      <hemisphereLight intensity={1.1} groundColor="#c8b89a" />
      <directionalLight position={[3, 5, 2]} intensity={1.4} />

      <CamaraQueSigue objetivo={grupoDelJugador} menosMovimiento={menosMovimiento} />

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
            <circleGeometry args={[40, 48]} />
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
            grupoCompartido={characterId === PERSONAJE_DEL_JUGADOR ? grupoDelJugador : undefined}
            alCambiarActividad={alCambiarActividad}
          />
        ))}
      </Suspense>
    </Canvas>
  );
}

