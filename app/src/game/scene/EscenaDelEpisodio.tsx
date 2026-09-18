// La escena 3D mientras hay un episodio en curso (T-001-06).
//
// Traduce la vista del motor a lo que hay que representar y se lo entrega a
// `LienzoDeEscena`, que es quien decide si el 3D puede existir. Aquí no se
// importa Three ni React Three Fiber.
//
// Si la escena no tiene a nadie con modelo sincronizado, no se monta nada: el
// episodio se juega igual con el retrato 2D y el diálogo, que es la ruta
// accesible y la que nunca depende de esto (AC-8).

import { useMemo } from "react";

import type { RuntimeState, RuntimeView } from "../../engine";
import { estadoDeEscenaDesde } from "./estado-de-escena";
import { LienzoDeEscena } from "./LienzoDeEscena";

interface EscenaDelEpisodioProps {
  readonly vista: RuntimeView;
  readonly estado: RuntimeState;
  /**
   * Se llama si la escena 3D deja de estar disponible en marcha. Quien está
   * arriba lo necesita para volver a mostrar el retrato 2D: si el personaje
   * ya no se ve en 3D, algo tiene que decir quién habla.
   */
  readonly alRetirarse?: (() => void) | undefined;
}

export function EscenaDelEpisodio({ vista, estado, alRetirarse }: EscenaDelEpisodioProps) {
  const escena = useMemo(() => estadoDeEscenaDesde(vista, estado), [vista, estado]);

  if (escena.personajes.length === 0) return null;

  return <LienzoDeEscena escena={escena} alRetirarse={alRetirarse} />;
}
