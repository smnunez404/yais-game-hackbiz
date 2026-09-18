// Tipos de los minijuegos del episodio (T-001-03).
//
// Se validan con el mismo rigor que el resto del contenido aunque el primer
// runtime no los presente (spec.md, «Aclaración de implementación,
// 2026-09-17»). Viven aparte porque son un tercio de los tipos del contenido
// y ninguno se toca cuando se edita una línea de diálogo.
//
// Reglas de este directorio (AGENTS.md): TypeScript puro, sin React, sin DOM
// y sin Three. Los campos opcionales se declaran como `T | undefined` porque
// el proyecto compila con `exactOptionalPropertyTypes`.

import type { CastId, IconId, LocId, NodeId, PropId } from "./types";

/* --- Minijuegos: se validan con el mismo rigor que el resto del contenido
 * aunque el primer runtime todavía no los presenta (spec.md, «Aclaración de
 * implementación, 2026-09-17»; PLAN-001). --- */

export interface FreeLookMinigameConfig {
  readonly continueTrigger: string;
  readonly timeLimitSeconds: number | null;
}

export interface CompassCard {
  readonly id: string;
  readonly locId: LocId;
  readonly art: string;
}

export interface CompassAnswer {
  readonly id: string;
  readonly locId: LocId;
  readonly icon: IconId;
}

export interface CompassFeedback {
  readonly speaker: CastId;
  readonly locId: LocId;
  readonly anim: string;
  readonly review?: "VALIDAR" | undefined;
}

export interface CompassFeedbackVariant extends CompassFeedback {
  readonly cardIndexFrom: number;
}

export interface BodyCompassPracticeConfig {
  readonly anyAnswerValid: boolean;
  readonly storeAnswers: boolean;
  readonly cards: readonly CompassCard[];
  readonly answers: readonly CompassAnswer[];
  readonly feedbackAfterEachCard: CompassFeedback;
  readonly feedbackVariantAfterCard: CompassFeedbackVariant;
}

export interface StopButton {
  readonly locId: LocId;
  readonly alwaysVisible: boolean;
  readonly keyboard: string;
  readonly onPress: NodeId;
}

export interface HighFiveRhythmConfig {
  readonly beatsBeforeQuestion: number;
  readonly speedRequired: boolean;
  readonly stopButton: StopButton;
  readonly questionNode: NodeId;
}

export interface BridgePlankCard {
  readonly id: string;
  readonly locId: LocId;
  readonly prop: PropId;
}

export interface OnPlaceEffect {
  readonly sfx: string;
}

export interface BridgePlanksConfig {
  readonly anyOrderValid: boolean;
  readonly inputModes: readonly string[];
  readonly cards: readonly BridgePlankCard[];
  readonly onPlace: OnPlaceEffect;
}

export interface FreeLookMinigameNode {
  readonly id: NodeId;
  readonly type: "minigame";
  readonly minigameId: "free_look";
  readonly config: FreeLookMinigameConfig;
  readonly next: NodeId;
}

export interface BodyCompassPracticeMinigameNode {
  readonly id: NodeId;
  readonly type: "minigame";
  readonly minigameId: "body_compass_practice";
  readonly config: BodyCompassPracticeConfig;
  readonly next: NodeId;
}

export interface HighFiveRhythmMinigameNode {
  readonly id: NodeId;
  readonly type: "minigame";
  readonly minigameId: "high_five_rhythm";
  readonly config: HighFiveRhythmConfig;
  readonly next: NodeId;
}

export interface BridgePlanksMinigameNode {
  readonly id: NodeId;
  readonly type: "minigame";
  readonly minigameId: "bridge_planks";
  readonly config: BridgePlanksConfig;
  readonly next: NodeId;
}

export type MinigameNode =
  | FreeLookMinigameNode
  | BodyCompassPracticeMinigameNode
  | HighFiveRhythmMinigameNode
  | BridgePlanksMinigameNode;
