// El episodio en curso (T-001-05).
//
// Es la única pieza que conecta el motor con la pantalla: crea el runtime,
// se suscribe a sus transiciones y decide qué componente presenta cada vista.
// No contiene narrativa ni reglas de navegación; ambas viven, respectivamente,
// en `content/` y en `src/engine`.
//
// La escena 3D de T-001-06 se montará al lado de este mismo estado: por eso
// el runtime no sabe nada de React y esta capa no sabe nada de Three.
//
// Herramientas de desarrollo (selector de escena y salto de nodos sin
// interfaz) solo existen con `import.meta.env.DEV`. En un aula proyectada no
// pueden estar: dejarían cruzar los minijuegos y la escena de Don Beto
// (revisión de content-guardian, T-001-04).

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import {
  crearProgressStore,
  crearRuntime,
  type AgeMode,
  type CastId,
  type EpisodeContent,
  type RuntimeDiagnostic,
} from "../../engine";
import { PRELOADED_CHARACTER_IDS } from "../../shared/assets";
import { crearAlmacenamientoDelNavegador } from "../../shared/browser-storage";
import { SelectorDeEdad } from "../GameShell";
import { EscenaDelEpisodio } from "../scene/EscenaDelEpisodio";
import { soportaWebGL } from "../scene/soporte-webgl";
import { TEXTOS_UI } from "../ui/textos-ui";
import { Minijuego } from "../minigames";
import { AvisoDeDesarrollo } from "./AvisoDeDesarrollo";
import { Celebracion } from "./Celebracion";
import { Decisiones } from "./Decisiones";
import { LineaDeDialogo } from "./LineaDeDialogo";
import { PantallaDeCierre } from "./PantallaDeCierre";

interface EpisodioEnCursoProps {
  readonly episodio: EpisodeContent;
  readonly ageMode: AgeMode;
  /** Cambiarlo reinicia el episodio: ver el comentario de `GameShell`. */
  readonly alCambiarEdad: (modo: AgeMode) => void;
}

/** Los diagnósticos se quedan en el dispositivo y solo en desarrollo (AC-9). */
function registrarDiagnostico(diagnostico: RuntimeDiagnostic): void {
  if (import.meta.env.DEV) {
    console.warn(`[runtime] ${diagnostico.code} en ${diagnostico.path}: ${diagnostico.message}`);
  }
}

export function EpisodioEnCurso({ episodio, ageMode, alCambiarEdad }: EpisodioEnCursoProps) {
  // Un runtime por sesión de juego. Cambiar el modo de edad empieza una
  // sesión nueva: no se puede cambiar a mitad de episodio.
  const runtime = useMemo(
    () =>
      crearRuntime(episodio, {
        ageMode,
        progress: crearProgressStore(crearAlmacenamientoDelNavegador()),
        onDiagnostic: registrarDiagnostico,
      }),
    [episodio, ageMode],
  );

  const vista = useSyncExternalStore(runtime.suscribir, runtime.vista);
  const estado = useSyncExternalStore(runtime.suscribir, runtime.estado);

  // Si el personaje que habla ya está en la escena 3D, el retrato 2D sobra:
  // sería el mismo personaje dos veces en la misma pantalla. Vuelve en cuanto
  // la escena se retira, porque entonces hace falta algo que lo muestre.
  const [escena3DViva, setEscena3DViva] = useState(() => soportaWebGL());
  const retirarEscena = useCallback(() => setEscena3DViva(false), []);
  const hablanteEnEscena =
    escena3DViva &&
    vista.kind === "line" &&
    (PRELOADED_CHARACTER_IDS as readonly string[]).includes(vista.speaker);

  // El foco sigue al contenido: al cambiar de nodo se lleva al control
  // principal de la pantalla nueva, para que quien navega con teclado no
  // tenga que buscarlo (Constitución VII).
  const regionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const region = regionRef.current;
    if (!region) return;
    const principal =
      region.querySelector<HTMLElement>("[data-principal='true']") ??
      region.querySelector<HTMLElement>("button");
    principal?.focus();
  }, [estado.nodeId]);

  const avanzar = useCallback(() => {
    runtime.avanzar();
  }, [runtime]);
  const elegir = useCallback(
    (optionId: string) => {
      runtime.elegir(optionId);
    },
    [runtime],
  );
  const saltar = useCallback(() => {
    runtime.saltarNodoNoImplementado();
  }, [runtime]);
  const terminarMinijuego = useCallback(
    (nodeId?: string) => {
      runtime.terminarMinijuego(nodeId);
    },
    [runtime],
  );

  /** Nombre de un personaje, resuelto desde el contenido. */
  const nombreDe = useCallback(
    (castId: CastId) => {
      const entrada = episodio.cast[castId];
      return entrada ? runtime.texto(entrada.displayNameLocId) : castId;
    },
    [episodio, runtime],
  );

  const pausa = episodio.globalUi.pause;
  const opcionDeParar = pausa.options.find((opcion) => opcion.id === "quit");

  return (
    <section className="episodio" aria-label={TEXTOS_UI.dialogo.regionEpisodio}>
      {/* Mejora progresiva: si no hay WebGL o el 3D falla, esto no renderiza
          nada y el episodio se juega igual en 2D (AC-8). */}
      <EscenaDelEpisodio vista={vista} estado={estado} alRetirarse={retirarEscena} />

      <div className="episodio__contenido" ref={regionRef}>
        {vista.kind === "line" ? (
          <LineaDeDialogo
            vista={vista}
            permiteRepetir={episodio.globalUi.replayLineButton}
            mostrarRetrato={!hablanteEnEscena}
            alContinuar={avanzar}
          />
        ) : null}

        {vista.kind === "choice" ? (
          <Decisiones vista={vista} alElegir={elegir} />
        ) : null}

        {vista.kind === "minigame" ? (
          <Minijuego
            vista={vista}
            texto={runtime.texto}
            nombreDe={nombreDe}
            alTerminar={terminarMinijuego}
          />
        ) : null}

        {vista.kind === "reward" ? (
          <Celebracion
            vista={vista}
            nombreDe={nombreDe}
            alContinuar={runtime.terminarRecompensa}
          />
        ) : null}

        {vista.kind === "end" ? (
          <PantallaDeCierre
            vista={vista}
            ageMode={ageMode}
            texto={runtime.texto}
            alVolverAJugar={runtime.reiniciar}
          />
        ) : null}

        {vista.kind === "unimplemented" ? (
          <AvisoDeDesarrollo
            titulo={TEXTOS_UI.desarrollo.nodoSinInterfaz}
            diagnosticos={[vista.diagnostic]}
            alSaltar={vista.puedeSaltarse ? saltar : undefined}
          />
        ) : null}

        {vista.kind === "error" ? (
          <AvisoDeDesarrollo
            titulo={TEXTOS_UI.desarrollo.errorDeNavegacion}
            diagnosticos={[vista.diagnostic]}
          />
        ) : null}
      </div>

      {/* Barra de quien acompaña. Parar es siempre posible y nunca cuesta
          nada (Constitución V); el rótulo viene del contenido, no de la
          interfaz. El grupo de edad vive aquí porque es decisión del adulto,
          no del niño, y cambiarlo reinicia el episodio.

          Durante una decisión se queda solo el botón de parar: ahí la pantalla
          ya está pidiendo al niño que elija entre cinco cosas y los controles
          del adulto son ruido. Lo que NO se retira es parar, aunque se pidiera
          quitar la barra entera: el momento de una decisión difícil es
          justamente cuando hace falta poder irse, y el contenido declara
          `pause.alwaysVisible: true` (Constitución V). */}
      {pausa.alwaysVisible ? (
        <footer
          className={
            vista.kind === "choice" ? "episodio__pie barra-adulto barra-adulto--minima" : "episodio__pie barra-adulto"
          }
        >
          {vista.kind === "choice" ? null : (
            <>
              <p className="episodio__pausa-texto">{runtime.texto(pausa.promptLocId)}</p>

              {/* El grupo de edad se toca una vez por sesión: plegado, deja de
                  competir por atención con lo que sí se usa en cada línea. */}
              <details className="barra-adulto__ajustes">
                <summary className="objetivo-tactil barra-adulto__resumen">
                  {TEXTOS_UI.adulto.grupoDeEdad}
                </summary>
                <SelectorDeEdad ageMode={ageMode} alCambiarEdad={alCambiarEdad} />
              </details>
            </>
          )}

          <button
            type="button"
            className="objetivo-tactil boton boton--secundario"
            onClick={runtime.reiniciar}
          >
            {opcionDeParar ? runtime.texto(opcionDeParar.locId) : TEXTOS_UI.dialogo.volverAlInicio}
          </button>
        </footer>
      ) : null}

      {import.meta.env.DEV ? (
        <SelectorDeEscenaDeDesarrollo
          episodio={episodio}
          sceneIdActual={estado.sceneId}
          alIrAEscena={(sceneId) => runtime.irAEscena(sceneId)}
        />
      ) : null}
    </section>
  );
}

interface SelectorDeEscenaProps {
  readonly episodio: EpisodeContent;
  readonly sceneIdActual: string;
  readonly alIrAEscena: (sceneId: string) => void;
}

/**
 * Selector de escena. Existe solo en desarrollo porque el saludo de Capi
 * queda detrás de dos minijuegos que todavía no tienen interfaz; no forma
 * parte de la experiencia publicada (spec.md, «Aclaración de implementación»).
 */
function SelectorDeEscenaDeDesarrollo({
  episodio,
  sceneIdActual,
  alIrAEscena,
}: SelectorDeEscenaProps) {
  return (
    <aside className="herramientas-desarrollo">
      {/* Plegado: en desarrollo hace falta a mano, pero abierto se come una
          esquina del mundo en cada captura y en cada demo. */}
      <details>
        <summary className="herramientas-desarrollo__etiqueta">
          {TEXTOS_UI.desarrollo.etiqueta}
        </summary>
        {/* Etiqueta y control como hermanos, no anidados: una `<label>` que
            envuelve un `<select>` arrastra el texto de las opciones al nombre
            accesible del control en algunos navegadores. */}
        <div className="herramientas-desarrollo__campo">
          <label htmlFor="selector-de-escena">{TEXTOS_UI.desarrollo.selectorDeEscena}</label>
          <select
            id="selector-de-escena"
            value={sceneIdActual}
            onChange={(evento) => alIrAEscena(evento.target.value)}
          >
            {episodio.scenes.map((scene) => (
              <option key={scene.id} value={scene.id}>
                {scene.id}
              </option>
            ))}
          </select>
        </div>
      </details>
    </aside>
  );
}
