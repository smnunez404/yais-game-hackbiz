// Shell del juego (T-001-05, replanteado en T-001-06).
//
// Dos estados: contenido que no valida, y episodio en curso. Se entra directo
// al juego, sin pantalla de inicio. El distintivo de borrador se dibuja aquí,
// fuera del conmutador, para que esté en los dos (AC-10, Constitución IV).
//
// El modo de edad vive aquí porque decide qué nodos y opciones existen (AC-3).
// Lo elige quien acompaña desde la barra de abajo, y cambiarlo reinicia el
// episodio: alterar a media conversación qué opciones se ven sería peor que
// volver a empezar. No se guarda en ningún sitio, ni aquí ni en el
// dispositivo.

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
    <main className="shell shell--juego">
      {/* Encabezado flotante: ocupa lo mínimo para que el mundo se vea, pero
          el distintivo sigue en pantalla siempre (AC-10). */}
      <header className="shell__encabezado shell__encabezado--flotante">
        <DistintivoBorrador />
        <h1 className="shell__titulo shell__titulo--juego">{titulo}</h1>
      </header>

      <EpisodioEnCurso episodio={episodio} ageMode={ageMode} alCambiarEdad={setAgeMode} />
    </main>
  );
}

/** Control de quien acompaña: por qué grupo de edad se está jugando (AC-3). */
export function SelectorDeEdad({
  ageMode,
  alCambiarEdad,
}: {
  readonly ageMode: AgeMode;
  readonly alCambiarEdad: (modo: AgeMode) => void;
}) {
  return (
    <fieldset className="barra-adulto__edades">
      <legend className="visualmente-oculto">{TEXTOS_UI.inicio.leyendaEdad}</legend>
      {MODOS_DE_EDAD.map((modo) => (
        <label key={modo.id} className="objetivo-tactil barra-adulto__edad">
          <input
            type="radio"
            name="modo-de-edad"
            value={modo.id}
            checked={ageMode === modo.id}
            onChange={() => alCambiarEdad(modo.id)}
          />
          <span>{modo.etiqueta}</span>
        </label>
      ))}
    </fieldset>
  );
}
