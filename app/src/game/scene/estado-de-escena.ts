// Qué tiene que mostrar la escena 3D, derivado del estado del motor
// (T-001-06).
//
// Este módulo es puro: no importa React ni Three. Vive fuera de
// `src/engine` porque es una decisión de presentación —quién está en el
// escenario y qué gesto le toca—, pero se mantiene sin dependencias para
// poder probarlo sin WebGL, que es exactamente lo que jsdom ofrece.
//
// Regla dura de este hito (PLAN-001, T-001-06): solo entran al escenario los
// personajes cuyo GLB está sincronizado, hoy Capi y Tomi. Luna, Clara y Beto
// quedan registrados en `shared/assets.ts` pero no se descargan: cuando hablan,
// lo que se ve es su retrato 2D y el diálogo, que es la experiencia completa.

import type { RuntimeState, RuntimeView } from "../../engine";
import { PRELOADED_CHARACTER_IDS, type CharacterId } from "../../shared/assets";

/**
 * Qué está haciendo un personaje. No es un `RuntimeClip`: la traducción a
 * clip real la hace `shared/animation-intents.ts`, que es el único lugar
 * autorizado a decidir qué clip representa qué (PLAN-001: "el mapa de
 * animaciones nunca adivina por nombre en tiempo de ejecución").
 */
export type GestoDeEscena =
  /** Intención escrita en el guion (`anim` del nodo), tal cual. */
  | { readonly tipo: "intencion"; readonly intent: string }
  /**
   * El personaje espera una decisión del niño. No viene del guion: es una
   * decisión de presentación explícita —quien pregunta, escucha— y por eso
   * se modela como un caso propio en vez de inventarse una intención.
   */
  | { readonly tipo: "escuchar" }
  /** Nada que representar: reposo. */
  | { readonly tipo: "reposo" };

export interface EstadoDeEscena {
  readonly sceneId: string;
  /** Personajes en el escenario: solo los que tienen GLB sincronizado. */
  readonly personajes: readonly CharacterId[];
  /** Quién habla o escucha ahora, si tiene GLB. */
  readonly protagonista: CharacterId | null;
  readonly gesto: GestoDeEscena;
  /** Necesarias para resolver `greet_from_session:*`. */
  readonly sessionVars: Readonly<Record<string, string | boolean>>;
}

function tieneModeloSincronizado(castId: string): castId is CharacterId {
  return (PRELOADED_CHARACTER_IDS as readonly string[]).includes(castId);
}

/** Personajes del reparto de la escena que sí se pueden mostrar en 3D. */
function personajesDe(vista: RuntimeView): readonly CharacterId[] {
  return vista.scene.cast.filter(tieneModeloSincronizado);
}

/**
 * Traduce la vista actual del motor a lo que la escena debe representar.
 *
 * - En una línea, habla quien la dice, con la intención del guion.
 * - En una decisión, escucha quien hizo la pregunta (la línea previa de la
 *   escena, que el motor entrega en `precedingLine`).
 * - En el cierre, en un nodo sin interfaz o en un error, nadie actúa: reposo.
 */
export function estadoDeEscenaDesde(vista: RuntimeView, estado: RuntimeState): EstadoDeEscena {
  const base = {
    sceneId: vista.scene.id,
    personajes: personajesDe(vista),
    sessionVars: estado.sessionVars,
  } as const;

  if (vista.kind === "line") {
    const hablante = tieneModeloSincronizado(vista.speaker) ? vista.speaker : null;
    return {
      ...base,
      protagonista: hablante,
      gesto: hablante ? { tipo: "intencion", intent: vista.node.anim } : { tipo: "reposo" },
    };
  }

  if (vista.kind === "choice") {
    const pregunta = vista.precedingLine;
    const quienPregunto =
      pregunta && tieneModeloSincronizado(pregunta.speaker) ? pregunta.speaker : null;
    return {
      ...base,
      protagonista: quienPregunto,
      gesto: quienPregunto ? { tipo: "escuchar" } : { tipo: "reposo" },
    };
  }

  return { ...base, protagonista: null, gesto: { tipo: "reposo" } };
}
