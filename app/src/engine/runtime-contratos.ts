// Contratos del runtime (T-001-04).
//
// Solo tipos: qué observa quien lo usa y qué puede pedirle. Están aparte de
// la implementación porque es lo que leen la interfaz y la escena 3D para
// saber qué esperar, y porque una capa que solo necesita el contrato no
// tiene por qué arrastrar el motor entero.
//
// Reglas de este directorio (AGENTS.md): TypeScript puro, sin React, sin DOM
// y sin Three.

import type { ProgressStore } from "./progress";
import type {
  AgeMode,
  BranchNode,
  CastId,
  ChoiceNode,
  ChoiceOption,
  EndNode,
  EpisodeContent,
  LineNode,
  LocId,
  MinigameNode,
  NodeId,
  RewardNode,
  Scene,
  SceneId,
  SessionVarId,
  UnimplementedNodeType,
} from "./types";

/** Estado observable del runtime (PLAN-001, contrato literal). */
export interface RuntimeState {
  readonly episodeId: string;
  readonly sceneId: SceneId;
  readonly nodeId: NodeId;
  readonly ageMode: AgeMode;
  /** Elecciones de la sesión. Solo memoria: nunca llegan al `ProgressStore`. */
  readonly sessionVars: Readonly<Record<SessionVarId, string | boolean>>;
  readonly completed: boolean;
}

/** Motivo de un diagnóstico de desarrollo. Nunca es visible para un niño. */
export type RuntimeDiagnosticCode =
  /** Se alcanzó `minigame`, `branch` o `reward`: validados, todavía sin interfaz. */
  | "nodo-no-implementado"
  /** El contenido pidió persistir un flag fuera de la allowlist de AC-5. */
  | "flag-ignorado"
  /** `onEnter.setProgress` guarda valores que este slice no persiste (AC-5). */
  | "progreso-ignorado"
  /** Un nodo quedó fuera del modo de edad activo y se saltó a su `next` (AC-3). */
  | "nodo-omitido-por-edad"
  /** La UI pidió una opción que no existe o no es visible en este modo de edad. */
  | "opcion-invalida"
  /** La UI llamó a una acción que la vista actual no admite. */
  | "accion-fuera-de-lugar"
  /** Falta el texto de un `locId` en el idioma por defecto. */
  | "texto-faltante"
  /** El contenido dejó la navegación en un estado del que no se puede salir. */
  | "navegacion-rota";

export interface RuntimeDiagnostic {
  readonly code: RuntimeDiagnosticCode;
  /** Ruta legible del contenido implicado, p. ej. `scenes.s03_saludo_capi.nodes.s03_c001`. */
  readonly path: string;
  readonly message: string;
}

/** Línea de diálogo lista para presentarse: el texto ya resuelto, no el `locId`. */
export interface LineView {
  readonly kind: "line";
  readonly scene: Scene;
  readonly node: LineNode;
  readonly speaker: CastId;
  /** Nombre del personaje según `cast[...].displayNameLocId`. */
  readonly speakerName: string;
  readonly text: string;
}

export interface ChoiceOptionView {
  readonly option: ChoiceOption;
  readonly text: string;
}

export interface ChoiceView {
  readonly kind: "choice";
  readonly scene: Scene;
  readonly node: ChoiceNode;
  /** Solo las opciones visibles en el modo de edad activo (AC-3). */
  readonly options: readonly ChoiceOptionView[];
  /**
   * La pregunta que el guion hace para esta decisión (por ejemplo `s03_n002`,
   * «¿Cómo quieres saludarme?»), o `null` si no hay ninguna. Viaja con la
   * decisión para que la UI pueda mantenerla en pantalla mientras el niño
   * elige: si no, la interfaz tendría que escribir una pregunta propia, y eso
   * sería contenido infantil fuera de `content/` (AGENTS.md, Constitución IV).
   *
   * Es la última línea mostrada cuando esa línea lleva a esta decisión, y si
   * no —al volver por un camino de reintento— la línea que el guion pone
   * delante de ella. Nunca arrastra la pregunta de otra escena.
   */
  readonly precedingLine: LineView | null;
}

export interface EndView {
  readonly kind: "end";
  readonly scene: Scene;
  readonly node: EndNode;
}

/**
 * Nodo validado que este runtime todavía no sabe presentar. La UI muestra un
 * aviso de desarrollo, nunca contenido jugable.
 */
export interface UnimplementedView {
  readonly kind: "unimplemented";
  readonly scene: Scene;
  readonly node: MinigameNode | BranchNode | RewardNode;
  readonly nodeType: UnimplementedNodeType;
  /**
   * Diagnóstico de desarrollo: su `message` está escrito para quien
   * programa, no para un niño. La UI debe presentar a partir de `code` con
   * texto propio y mostrar `message` solo en desarrollo (Constitución IV).
   */
  readonly diagnostic: RuntimeDiagnostic;
  /**
   * `true` si el nodo declara una continuación (`next` en `minigame` y
   * `reward`, `else` en `branch`) y `saltarNodoNoImplementado()` puede
   * seguir el recorrido. Es una salida de desarrollo para poder revisar el
   * episodio completo, no una forma de dar el minijuego por hecho.
   */
  readonly puedeSaltarse: boolean;
}

/** El contenido dejó la navegación sin salida. Es un error de desarrollo (AC-1). */
export interface ErrorView {
  readonly kind: "error";
  readonly scene: Scene;
  /** Como en `UnimplementedView`: `message` es prosa de desarrollo. */
  readonly diagnostic: RuntimeDiagnostic;
}

export type RuntimeView = LineView | ChoiceView | EndView | UnimplementedView | ErrorView;

export interface RuntimeOptions {
  readonly ageMode: AgeMode;
  readonly progress: ProgressStore;
  /**
   * Escena por la que empezar. Por defecto, `episode.entryScene`. El selector
   * de escena de desarrollo (T-001-05) lo usa para entrar directo al saludo,
   * que en el recorrido normal queda detrás de dos minijuegos.
   */
  readonly startSceneId?: SceneId | undefined;
  /**
   * Receptor de diagnósticos. El motor no sabe si corre en desarrollo o en
   * producción —no puede mirar el entorno—, así que quien lo construye decide
   * si los muestra, los registra o los descarta.
   *
   * Lo que entra aquí se queda en el dispositivo. Los mensajes citan ids del
   * contenido y, en el caso de `opcion-invalida`, la opción que se pulsó: es
   * información de desarrollo, no telemetría, y no puede salir por red
   * (SPEC-001 AC-9). Un `onDiagnostic` que enviara esto a un servidor
   * rompería la regla aunque el motor siga siendo puro.
   */
  readonly onDiagnostic?: ((diagnostic: RuntimeDiagnostic) => void) | undefined;
}

export interface Runtime {
  readonly episode: EpisodeContent;
  /** Instantánea inmutable del estado. Cambia de identidad en cada transición. */
  estado(): RuntimeState;
  /** Qué debe presentarse ahora. Cambia de identidad en cada transición. */
  vista(): RuntimeView;
  /** Avanza una línea. `false` si la vista actual no es una línea. */
  avanzar(): boolean;
  /** Elige una opción de la decisión actual. `false` si no aplica. */
  elegir(optionId: string): boolean;
  /**
   * Salida de desarrollo para cruzar un nodo sin interfaz todavía. Junto con
   * `irAEscena` y `startSceneId`, forma el juego de herramientas que la UI
   * solo puede exponer en desarrollo: en un aula, cablearlo a un botón
   * normal dejaría cruzar los minijuegos y la escena de Don Beto.
   */
  saltarNodoNoImplementado(): boolean;
  /** Selector de escena de desarrollo. `false` si la escena no existe. */
  irAEscena(sceneId: SceneId): boolean;
  /** Reintento sin costo: vuelve al inicio con la sesión limpia (AC-4). */
  reiniciar(): void;
  /** Texto del idioma por defecto para un `locId` del contenido. */
  texto(locId: LocId): string;
  /** Notifica cada transición. Devuelve la función para dejar de escuchar. */
  suscribir(listener: () => void): () => void;
}
