// La celebración del episodio (nodo `reward`, escena s07).
//
// Es cosmética y por completar, nunca por acertar: el contenido lo declara en
// sus propios datos (`conditionalOnPerformance: false`) y el motor lo
// sostiene ignorando todos sus flags, que no están en la allowlist de AC-5.
//
// Por eso esta pantalla no dice qué tan bien se hizo nada, no compara, no
// puntúa y no premia una elección sobre otra (Constitución V). Solo marca que
// el episodio llegó a su final y deja continuar.
//
// La celebración en 3D —quién celebra y con qué gesto— la lee la escena del
// mismo nodo; aquí solo está el control para seguir.

import type { CastId, RewardView } from "../../engine";
import { TEXTOS_UI } from "../ui/textos-ui";

interface CelebracionProps {
  readonly vista: RewardView;
  readonly nombreDe: (castId: CastId) => string;
  readonly alContinuar: () => void;
}

export function Celebracion({ vista, nombreDe, alContinuar }: CelebracionProps) {
  const quienes = vista.node.celebration.cast.map(nombreDe).join(", ");

  return (
    <section className="minijuego" aria-labelledby="celebracion-titulo">
      <h2 className="dialogo__texto" id="celebracion-titulo">
        {TEXTOS_UI.cierre.celebracion}
      </h2>
      {/* Quién celebra sale del contenido; no se nombra a nadie desde aquí. */}
      <p className="dialogo__hablante">{quienes}</p>

      <button
        type="button"
        className="objetivo-tactil boton boton--primario"
        data-principal="true"
        onClick={alContinuar}
      >
        {TEXTOS_UI.dialogo.continuar}
      </button>
    </section>
  );
}
