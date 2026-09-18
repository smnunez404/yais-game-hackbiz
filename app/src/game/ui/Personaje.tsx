// Retrato 2D de quien habla (T-001-05).
//
// Es la ruta base de la experiencia, no un placeholder del 3D: si WebGL
// falla o el dispositivo no lo soporta, esto es lo que se ve (AC-8). La
// escena R3F de T-001-06 se monta al lado consumiendo el mismo estado.
//
// Solo Capi y Tomi tienen arte sincronizado en este hito
// (`PRELOADED_CHARACTER_IDS`): el resto del elenco aparece con su silueta y
// su nombre, nunca con una imagen rota ni con un GLB que no debe
// descargarse todavía (PLAN-001).

import { CHARACTERS, PRELOADED_CHARACTER_IDS, type CharacterId } from "../../shared/assets";

interface PersonajeProps {
  /** Quién habla. `all` (el elenco completo) no tiene retrato propio. */
  readonly castId: CharacterId | "all";
  /** Nombre ya resuelto desde `localization`; nunca un rótulo escrito en código. */
  readonly nombre: string;
}

function tieneArteSincronizado(castId: CharacterId | "all"): castId is CharacterId {
  return castId !== "all" && PRELOADED_CHARACTER_IDS.includes(castId);
}

export function Personaje({ castId, nombre }: PersonajeProps) {
  return (
    <figure className="personaje">
      {tieneArteSincronizado(castId) ? (
        <img
          className="personaje__retrato"
          src={CHARACTERS[castId].posterUrl}
          // El nombre ya se lee como texto en el pie de la figura: repetirlo
          // en el `alt` obligaría a escucharlo dos veces con lector de
          // pantalla. La imagen es decorativa respecto de ese texto.
          alt=""
          width={160}
          height={160}
          decoding="async"
        />
      ) : (
        <span className="personaje__retrato personaje__retrato--sin-arte" aria-hidden="true">
          {nombre.slice(0, 1)}
        </span>
      )}
      <figcaption className="personaje__nombre">{nombre}</figcaption>
    </figure>
  );
}
