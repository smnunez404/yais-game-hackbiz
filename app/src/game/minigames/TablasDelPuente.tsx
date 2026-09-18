// Reconstruir el puente (`bridge_planks`, escena s07).
//
// Cada tabla es un acuerdo del episodio, con su texto en el contenido. El
// orden da igual (`anyOrderValid: true`): se colocan pulsando, en el orden
// que sea, y cuando están todas el puente queda armado.
//
// No hay orden correcto que adivinar ni forma de equivocarse, así que no hay
// error que mostrar. Lo único que hace este minijuego es dejar releer, una
// por una, las cosas que se acordaron antes de cruzar.

import { useState } from "react";

import type { BridgePlanksConfig, LocId } from "../../engine";
import { ICONOS } from "../ui/icons";
import { TEXTOS_UI } from "../ui/textos-ui";

interface TablasDelPuenteProps {
  readonly config: BridgePlanksConfig;
  readonly texto: (locId: LocId) => string;
  readonly alTerminar: () => void;
}

export function TablasDelPuente({ config, texto, alTerminar }: TablasDelPuenteProps) {
  const [colocadas, setColocadas] = useState<readonly string[]>([]);
  const faltan = config.cards.filter((tabla) => !colocadas.includes(tabla.id));
  // La siguiente tabla por colocar es la que recibe el foco: si el control
  // principal fuera siempre la primera, al colocarla el teclado se quedaba
  // sin sitio a donde ir.
  const siguientePorColocar = faltan[0]?.id;
  const Marca = ICONOS.icon_check;

  return (
    <section className="minijuego" aria-labelledby="puente-titulo">
      <h2 className="dialogo__texto" id="puente-titulo">
        {TEXTOS_UI.minijuegos.puente}
      </h2>

      <ul className="decisiones__lista">
        {config.cards.map((tabla) => {
          const colocada = colocadas.includes(tabla.id);
          return (
            <li key={tabla.id}>
              <button
                type="button"
                className="objetivo-tactil boton boton--opcion"
                data-principal={tabla.id === siguientePorColocar ? "true" : undefined}
                // Una tabla ya colocada deja de ser un control: se queda como
                // texto para poder releerla.
                disabled={colocada}
                onClick={() => setColocadas((previas) => [...previas, tabla.id])}
              >
                {colocada ? (
                  <span className="opcion__icono" aria-hidden="true">
                    <Marca />
                  </span>
                ) : null}
                <span>{texto(tabla.locId)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {faltan.length === 0 ? (
        <button
          type="button"
          className="objetivo-tactil boton boton--primario"
          data-principal="true"
          onClick={alTerminar}
        >
          {TEXTOS_UI.dialogo.continuar}
        </button>
      ) : null}
    </section>
  );
}
