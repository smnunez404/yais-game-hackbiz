// Punto de entrada del motor de contenido.
//
// Reglas de este directorio (AGENTS.md y PLAN-001):
// - TypeScript puro: sin React, sin DOM y sin Three.
// - El almacenamiento se usa solo a través de la interfaz `ProgressStore`.
// - Las compuertas que lo verifican son `tsconfig.engine.json`, el bloque
//   `src/engine/**` de `eslint.config.js` y `npm run check:safety`.
//
// `runtime` (navegación por nodos) entra en la segunda mitad de T-001-04;
// este archivo reexporta lo que ya existe: `types` y `schema` de T-001-03 y
// `progress` de la primera mitad de T-001-04.

export type {
  AgeMode,
  BodyCompassHud,
  BranchNode,
  BridgePlankCard,
  BridgePlanksConfig,
  BridgePlanksMinigameNode,
  Cast,
  CastEntry,
  CastId,
  ChoiceNode,
  ChoiceOption,
  CompassAnswer,
  CompassCard,
  CompassFeedback,
  CompassFeedbackVariant,
  ConditionAll,
  ConditionAny,
  ConditionComparison,
  ConditionExpression,
  BodyCompassPracticeConfig,
  BodyCompassPracticeMinigameNode,
  BranchRule,
  DebriefScreen,
  EndNode,
  EnvironmentId,
  EpisodeContent,
  EpisodeNode,
  EpisodeValidationResult,
  EstimatedPlayMinutes,
  FlagId,
  FreeLookMinigameConfig,
  FreeLookMinigameNode,
  GlobalUi,
  GlobalUiPause,
  GlobalUiPauseOption,
  HighFiveRhythmConfig,
  HighFiveRhythmMinigameNode,
  IconId,
  LineNode,
  LocId,
  MinigameId,
  MinigameNode,
  NodeId,
  NodeType,
  OnPlaceEffect,
  PersistenceDiagnostics,
  PreAction,
  PrivacyDeclaration,
  ProgressFlagDeclaration,
  PropId,
  Reaction,
  RetryPolicy,
  ReviewPolicy,
  RewardCelebration,
  RewardNode,
  Scene,
  SceneChangeNode,
  SceneId,
  SceneOnEnter,
  SessionVarDeclaration,
  SessionVarId,
  StopButton,
  SupportedNodeType,
  UiEvent,
  UnimplementedNodeType,
  ValidationIssue,
  ValidationWarning,
  WorldEvent,
} from "./types";
export { ALL_AGE_MODES } from "./types";

export {
  PERSISTENCE_ALLOWLIST,
  episodeContentSchema,
  isVisibleForAgeMode,
  parseEpisodeContent,
  validateEpisodeContent,
} from "./schema";

export type { AdaptadorDeAlmacenamiento, FlagDePersistencia, ProgressStore } from "./progress";
export { crearAlmacenamientoEnMemoria, crearProgressStore } from "./progress";
