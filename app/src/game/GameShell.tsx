// Shell del juego (T-001-05).
//
// Tres estados y nada más: contenido que no valida, pantalla de inicio y
// episodio en curso. El distintivo de borrador se dibuja aquí, fuera del
// conmutador, para que esté en las tres (AC-10, Constitución IV).
//
// El modo de edad se elige antes de empezar y no se puede cambiar a mitad de
// episodio: cambiarlo alteraría qué nodos y opciones son visibles en medio de
// una conversación (AC-3). Quien acompaña lo elige por el grupo; no se guarda
// nada, ni aquí ni en el dispositivo.

import { useState } from "react";

import type { AgeMode } from "../engine";
import { EPISODIO_01 } from "../shared/episode";
import { AvisoDeDesarrollo } from "./dialogue/AvisoDeDesarrollo";
import { EpisodioEnCurso } from "./dialogue/EpisodioEnCurso";
import { DistintivoBorrador } from "./ui/DistintivoBorrador";
import { TEXTOS_UI } from "./ui/textos-ui";

const MODOS_DE_EDAD: readonly { readonly id: AgeMode; readonly etiqueta: string }[] = [
  { id: "6-8", etiqueta: TEXTOS_UI.inicio.edad68 },
  { id: "9-12", etiqueta: TEXTOS_UI.inicio.edad912 },
];

export default function GameShell() {
  const [ageMode, setAgeMode] = useState<AgeMode>("6-8");
  const [jugando, setJugando] = useState(false);

  // AC-1: si el contenido no valida, un error de desarrollo legible en vez de
  // una pantalla en blanco. La app no arranca el episodio en ese caso.
  if (!EPISODIO_01.ok) {
    return (
      <main className="shell">
        <DistintivoBorrador />
        <AvisoDeDesarrollo
          titulo={TEXTOS_UI.desarrollo.errorDeContenido}
          diagnosticos={EPISODIO_01.issues.map((issue) => ({
            code: "navegacion-rota" as const,
            path: issue.path,
            message: issue.message,
          }))}
        />
      </main>
    );
  }

  const episodio = EPISODIO_01.episode;
  const titulo = episodio.localization[episodio.defaultLocale]?.[episodio.titleLocId] ?? episodio.slug;

  return (
    <main className="shell">
      <header className="shell__encabezado">
        <DistintivoBorrador />
        <h1 className="shell__titulo">{titulo}</h1>
      </header>

      {jugando ? (
        <EpisodioEnCurso
          episodio={episodio}
          ageMode={ageMode}
          alVolverAlInicio={() => setJugando(false)}
        />
      ) : (
        <section className="inicio" aria-labelledby="inicio-titulo">
          <h2 className="inicio__titulo" id="inicio-titulo">
            {TEXTOS_UI.inicio.subtitulo}
          </h2>
          <p className="inicio__prologo">{TEXTOS_UI.inicio.prologo}</p>

          <fieldset className="inicio__edades">
            <legend>{TEXTOS_UI.inicio.leyendaEdad}</legend>
            {MODOS_DE_EDAD.map((modo) => (
              <label key={modo.id} className="objetivo-tactil inicio__edad">
                <input
                  type="radio"
                  name="modo-de-edad"
                  value={modo.id}
                  checked={ageMode === modo.id}
                  onChange={() => setAgeMode(modo.id)}
                />
                <span>{modo.etiqueta}</span>
              </label>
            ))}
          </fieldset>

          <button
            type="button"
            className="objetivo-tactil boton boton--primario"
            onClick={() => setJugando(true)}
          >
            {TEXTOS_UI.inicio.empezar}
          </button>
        </section>
      )}
    </main>
  );
}
