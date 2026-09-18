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

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import {
  crearProgressStore,
  crearRuntime,
  type AgeMode,
  type EpisodeContent,
  type RuntimeDiagnostic,
} from "../../engine";
import { crearAlmacenamientoDelNavegador } from "../../shared/browser-storage";
import { TEXTOS_UI } from "../ui/textos-ui";
import { AvisoDeDesarrollo } from "./AvisoDeDesarrollo";
import { Decisiones } from "./Decisiones";
import { LineaDeDialogo } from "./LineaDeDialogo";
import { PantallaDeCierre } from "./PantallaDeCierre";

interface EpisodioEnCursoProps {
  readonly episodio: EpisodeContent;
  readonly ageMode: AgeMode;
  readonly alVolverAlInicio: () => void;
}

/** Los diagnósticos se quedan en el dispositivo y solo en desarrollo (AC-9). */
function registrarDiagnostico(diagnostico: RuntimeDiagnostic): void {
  if (import.meta.env.DEV) {
    console.warn(`[runtime] ${diagnostico.code} en ${diagnostico.path}: ${diagnostico.message}`);
  }
}

export function EpisodioEnCurso({ episodio, ageMode, alVolverAlInicio }: EpisodioEnCursoProps) {
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

  const pausa = episodio.globalUi.pause;
  const opcionDeParar = pausa.options.find((opcion) => opcion.id === "quit");

  return (
    <section className="episodio" aria-label={TEXTOS_UI.dialogo.regionEpisodio}>
      <div className="episodio__contenido" ref={regionRef}>
        {vista.kind === "line" ? (
          <LineaDeDialogo
            vista={vista}
            permiteRepetir={episodio.globalUi.replayLineButton}
            alContinuar={avanzar}
          />
        ) : null}

        {vista.kind === "choice" ? (
          <Decisiones vista={vista} alElegir={elegir} />
        ) : null}

        {vista.kind === "end" ? (
          <PantallaDeCierre
            vista={vista}
            ageMode={ageMode}
            texto={runtime.texto}
            alVolverAJugar={runtime.reiniciar}
            alVolverAlInicio={alVolverAlInicio}
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

      {/* Parar es siempre posible y nunca cuesta nada (Constitución V).
          El rótulo viene del contenido, no de la interfaz. */}
      {pausa.alwaysVisible ? (
        <footer className="episodio__pie">
          <p className="episodio__pausa-texto">{runtime.texto(pausa.promptLocId)}</p>
          <button
            type="button"
            className="objetivo-tactil boton boton--secundario"
            onClick={alVolverAlInicio}
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
      <p className="herramientas-desarrollo__etiqueta">{TEXTOS_UI.desarrollo.etiqueta}</p>
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
    </aside>
  );
}
