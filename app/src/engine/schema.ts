// Esquema Zod del episodio completo (T-001-03).
//
// Reglas de este directorio (AGENTS.md y PLAN-001):
// - TypeScript puro: sin React, sin DOM y sin Three. `zod` es una librería de
//   validación pura, no toca el navegador.
// - Nunca se lanza un `throw` opaco: la API pública devuelve un resultado
//   discriminado (`EpisodeValidationResult`) con mensajes legibles para
//   desarrollo (AC-1).
// - Este esquema valida el episodio completo, incluidos los tipos que el
//   primer runtime todavía no presenta (`minigame`, `branch`, `reward`;
//   spec.md «Aclaración de implementación, 2026-09-17»). Marcarlos como no
//   implementados es responsabilidad del runtime (T-001-04), no de este
//   archivo: aquí solo se comprueba que el contenido es válido.

import { z } from "zod";

import {
  ALL_AGE_MODES,
  type AgeMode,
  type ConditionAll,
  type ConditionAny,
  type ConditionExpression,
  type EpisodeContent,
  type EpisodeValidationResult,
  type FlagId,
  type PersistenceDiagnostics,
  type ValidationIssue,
  type ValidationWarning,
} from "./types";

// Todos los mensajes incorporados de zod (tipos, uniones, claves
// desconocidas, tamaños de arreglo…) salen en español. Es una llamada global
// de configuración; este módulo es el único punto del motor que usa `zod`,
// así que no compite con otra configuración.
z.config(z.locales.es());

/**
 * Allowlist de persistencia (AGENTS.md, SPEC-001 AC-5): en este vertical
 * slice solo puede sobrevivir a la sesión el flag `ep01.completed`. Es
 * literal a propósito: cualquier otro flag de `progressFlags`, aunque el
 * JSON lo declare con `persist: true`, se reporta como diagnóstico de
 * desarrollo y el runtime lo ignora.
 */
export const PERSISTENCE_ALLOWLIST: readonly FlagId[] = ["ep01.completed"];

/* ------------------------------------------------------------------------ */
/* Escalares y tipos compartidos                                            */
/* ------------------------------------------------------------------------ */

const ageModeSchema = z.enum(["6-8", "9-12"]);

const castIdSchema = z.enum(["capi", "tomi", "luna", "clara", "beto", "all"]);

const reviewMarkerSchema = z.literal("VALIDAR");

function ageModesOrDefault(ageModes: readonly AgeMode[] | undefined): readonly AgeMode[] {
  return ageModes && ageModes.length > 0 ? ageModes : ALL_AGE_MODES;
}

/**
 * Regla de visibilidad por edad (AC-3): sin `ageModes`, un nodo u opción es
 * visible en los dos modos. Se expone porque tanto la validación de este
 * archivo como el futuro runtime (T-001-04) necesitan la misma regla.
 */
export function isVisibleForAgeMode(ageModes: readonly AgeMode[] | undefined, age: AgeMode): boolean {
  return ageModesOrDefault(ageModes).includes(age);
}

/* ------------------------------------------------------------------------ */
/* Metadatos del episodio                                                   */
/* ------------------------------------------------------------------------ */

const reviewPolicySchema = z
  .object({
    requiredReviewers: z.array(z.string()),
    blockProductionIfPending: z.boolean(),
    note: z.string(),
  })
  .strict();

const privacyDeclarationSchema = z
  .object({
    persistChoices: z.boolean(),
    persistFlagsOnly: z.boolean(),
    freeTextInput: z.boolean(),
    telemetry: z.string(),
    note: z.string(),
  })
  .strict();

const estimatedPlayMinutesSchema = z
  .object({
    "6-8": z.number(),
    "9-12": z.number(),
  })
  .strict();

const castEntrySchema = z
  .object({
    model: z.string().nullable(),
    displayNameLocId: z.string(),
    nameStatus: z.string().optional(),
    voiceColor: z.string().optional(),
  })
  .strict();

// Claves exhaustivas: `z.record` con una clave enum exige que las seis
// entradas de `cast` estén presentes, igual que el contenido real.
const castSchema = z.record(castIdSchema, castEntrySchema);

const progressFlagDeclarationSchema = z
  .object({
    id: z.string(),
    persist: z.boolean(),
    type: z.string().optional(),
  })
  .strict();

const sessionVarDeclarationSchema = z
  .object({
    id: z.string(),
    persist: z.boolean(),
  })
  .strict();

const globalUiPauseOptionSchema = z
  .object({
    id: z.string(),
    locId: z.string(),
  })
  .strict();

const globalUiPauseSchema = z
  .object({
    alwaysVisible: z.boolean(),
    promptLocId: z.string(),
    options: z.array(globalUiPauseOptionSchema),
  })
  .strict();

const bodyCompassHudSchema = z
  .object({
    unlockedBy: z.string(),
    states: z.array(z.string()),
  })
  .strict();

const globalUiSchema = z
  .object({
    pause: globalUiPauseSchema,
    replayLineButton: z.boolean(),
    bodyCompassHud: bodyCompassHudSchema,
  })
  .strict();

/* ------------------------------------------------------------------------ */
/* Efectos y eventos que disparan las líneas                                */
/* ------------------------------------------------------------------------ */

const uiEventSchema = z
  .object({
    compassPoint: z.string().optional(),
    unlockHud: z.string().optional(),
    hudPulse: z.string().optional(),
  })
  .strict();

const worldEventSchema = z
  .object({
    plankFliesTo: z.string().optional(),
    restore: z.array(z.string()).optional(),
  })
  .strict();

const preActionSchema = z
  .object({
    minigameExtraBeats: z.number().optional(),
  })
  .strict();

// Registro parcial: solo aparecen los personajes que reaccionan en ese punto
// del guion, por eso son seis campos opcionales y no un `z.record` exhaustivo.
const reactionSchema = z
  .object({
    capi: z.string().optional(),
    tomi: z.string().optional(),
    luna: z.string().optional(),
    clara: z.string().optional(),
    beto: z.string().optional(),
    all: z.string().optional(),
  })
  .strict();

/* ------------------------------------------------------------------------ */
/* Nodo `line`                                                              */
/* ------------------------------------------------------------------------ */

const lineNodeSchema = z
  .object({
    id: z.string(),
    type: z.literal("line"),
    speaker: castIdSchema,
    locId: z.string(),
    anim: z.string(),
    emotion: z.string(),
    next: z.string(),
    audio: z.string().optional(),
    camera: z.string().optional(),
    uiEvent: uiEventSchema.optional(),
    review: reviewMarkerSchema.optional(),
    reviewNote: z.string().optional(),
    reviewPriority: z.string().optional(),
    feedbackTone: z.string().optional(),
    ageModes: z.array(ageModeSchema).optional(),
    reaction: reactionSchema.optional(),
    worldEvent: worldEventSchema.optional(),
    preAction: preActionSchema.optional(),
  })
  .strict();

/* ------------------------------------------------------------------------ */
/* Nodo `choice`                                                            */
/* ------------------------------------------------------------------------ */

const choiceOptionSchema = z
  .object({
    id: z.string(),
    locId: z.string(),
    icon: z.string(),
    next: z.string(),
    ageModes: z.array(ageModeSchema).optional(),
    setSession: z.record(z.string(), z.union([z.string(), z.boolean()])).optional(),
  })
  .strict();

const retryPolicySchema = z
  .object({
    unlimited: z.boolean(),
    showAttemptCount: z.boolean(),
  })
  .strict();

const choiceNodeSchema = z
  .object({
    id: z.string(),
    type: z.literal("choice"),
    options: z.array(choiceOptionSchema).min(1, "Una decisión necesita al menos una opción."),
    layout: z.string().optional(),
    ageModes: z.array(ageModeSchema).optional(),
    retryPolicy: retryPolicySchema.optional(),
  })
  .strict();

/* ------------------------------------------------------------------------ */
/* Nodo `sceneChange`                                                       */
/* ------------------------------------------------------------------------ */

const sceneChangeNodeSchema = z
  .object({
    id: z.string(),
    type: z.literal("sceneChange"),
    scene: z.string(),
  })
  .strict();

/* ------------------------------------------------------------------------ */
/* Nodo `end`                                                               */
/* ------------------------------------------------------------------------ */

const debriefScreenSchema = z
  .object({
    titleLocId: z.string(),
    childLocId: z.string(),
    adultQuestionsLocIds: z.array(z.string()),
    adultQuestionsAgeModes: z.record(z.string(), z.array(ageModeSchema)).optional(),
    activityLocId: z.string(),
    familyLocIds: z.array(z.string()),
    adultOnly: z.boolean(),
  })
  .strict();

const endNodeSchema = z
  .object({
    id: z.string(),
    type: z.literal("end"),
    setFlags: z.array(z.string()),
    clearSessionVars: z.boolean().optional(),
    debriefScreen: debriefScreenSchema.optional(),
  })
  .strict();

/* ------------------------------------------------------------------------ */
/* Nodo `minigame` (sin UI todavía; se valida con el mismo rigor)           */
/* ------------------------------------------------------------------------ */

const freeLookConfigSchema = z
  .object({
    continueTrigger: z.string(),
    timeLimitSeconds: z.number().nullable(),
  })
  .strict();

const compassCardSchema = z
  .object({
    id: z.string(),
    locId: z.string(),
    art: z.string(),
  })
  .strict();

const compassAnswerSchema = z
  .object({
    id: z.string(),
    locId: z.string(),
    icon: z.string(),
  })
  .strict();

const compassFeedbackSchema = z
  .object({
    speaker: castIdSchema,
    locId: z.string(),
    anim: z.string(),
    review: reviewMarkerSchema.optional(),
  })
  .strict();

const compassFeedbackVariantSchema = z
  .object({
    speaker: castIdSchema,
    locId: z.string(),
    anim: z.string(),
    review: reviewMarkerSchema.optional(),
    cardIndexFrom: z.number(),
  })
  .strict();

const bodyCompassPracticeConfigSchema = z
  .object({
    anyAnswerValid: z.boolean(),
    storeAnswers: z.boolean(),
    cards: z.array(compassCardSchema),
    answers: z.array(compassAnswerSchema),
    feedbackAfterEachCard: compassFeedbackSchema,
    feedbackVariantAfterCard: compassFeedbackVariantSchema,
  })
  .strict();

const stopButtonSchema = z
  .object({
    locId: z.string(),
    alwaysVisible: z.boolean(),
    keyboard: z.string(),
    onPress: z.string(),
  })
  .strict();

const highFiveRhythmConfigSchema = z
  .object({
    beatsBeforeQuestion: z.number(),
    speedRequired: z.boolean(),
    stopButton: stopButtonSchema,
    questionNode: z.string(),
  })
  .strict();

const bridgePlankCardSchema = z
  .object({
    id: z.string(),
    locId: z.string(),
    prop: z.string(),
  })
  .strict();

const onPlaceEffectSchema = z
  .object({
    sfx: z.string(),
  })
  .strict();

const bridgePlanksConfigSchema = z
  .object({
    anyOrderValid: z.boolean(),
    inputModes: z.array(z.string()),
    cards: z.array(bridgePlankCardSchema),
    onPlace: onPlaceEffectSchema,
  })
  .strict();

const freeLookMinigameNodeSchema = z
  .object({
    id: z.string(),
    type: z.literal("minigame"),
    minigameId: z.literal("free_look"),
    config: freeLookConfigSchema,
    next: z.string(),
  })
  .strict();

const bodyCompassPracticeMinigameNodeSchema = z
  .object({
    id: z.string(),
    type: z.literal("minigame"),
    minigameId: z.literal("body_compass_practice"),
    config: bodyCompassPracticeConfigSchema,
    next: z.string(),
  })
  .strict();

const highFiveRhythmMinigameNodeSchema = z
  .object({
    id: z.string(),
    type: z.literal("minigame"),
    minigameId: z.literal("high_five_rhythm"),
    config: highFiveRhythmConfigSchema,
    next: z.string(),
  })
  .strict();

const bridgePlanksMinigameNodeSchema = z
  .object({
    id: z.string(),
    type: z.literal("minigame"),
    minigameId: z.literal("bridge_planks"),
    config: bridgePlanksConfigSchema,
    next: z.string(),
  })
  .strict();

// Unión discriminada anidada: cada variante comparte `type: "minigame"` y se
// distingue por `minigameId`. Zod resuelve la unión interna antes de la
// externa (probado contra esta versión exacta de la librería).
const minigameNodeSchema = z.discriminatedUnion("minigameId", [
  freeLookMinigameNodeSchema,
  bodyCompassPracticeMinigameNodeSchema,
  highFiveRhythmMinigameNodeSchema,
  bridgePlanksMinigameNodeSchema,
]);

/* ------------------------------------------------------------------------ */
/* Nodo `branch` (condiciones recursivas, sin UI todavía)                   */
/* ------------------------------------------------------------------------ */

const conditionComparisonSchema = z
  .object({
    var: z.string(),
    eq: z.string().optional(),
    neq: z.string().optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    const hasEq = value.eq !== undefined;
    const hasNeq = value.neq !== undefined;
    if (hasEq === hasNeq) {
      ctx.addIssue({
        code: "custom",
        message: 'Cada condición necesita exactamente una comparación: "eq" o "neq", no ambas ni ninguna.',
      });
    }
  });

// Esquema recursivo: `all`/`any` contienen más expresiones de condición. Los
// tres `const` se refieren entre sí dentro de callbacks de `z.lazy`, que solo
// se ejecutan cuando algo intenta parsear (para entonces los tres ya están
// asignados). Es el patrón que documenta la propia librería para tipos
// recursivos.
const conditionExpressionSchema: z.ZodType<ConditionExpression> = z.lazy(() =>
  z.union([conditionComparisonSchema, conditionAllSchema, conditionAnySchema]),
);

const conditionAllSchema: z.ZodType<ConditionAll> = z.lazy(() =>
  z
    .object({
      all: z.array(conditionExpressionSchema),
    })
    .strict(),
);

const conditionAnySchema: z.ZodType<ConditionAny> = z.lazy(() =>
  z
    .object({
      any: z.array(conditionExpressionSchema),
    })
    .strict(),
);

const branchRuleSchema = z
  .object({
    if: conditionExpressionSchema,
    next: z.string(),
  })
  .strict();

const branchNodeSchema = z
  .object({
    id: z.string(),
    type: z.literal("branch"),
    conditions: z.array(branchRuleSchema),
    else: z.string(),
    ageModes: z.array(ageModeSchema).optional(),
  })
  .strict();

/* ------------------------------------------------------------------------ */
/* Nodo `reward` (cosmético, nunca puntaje; Constitución V)                 */
/* ------------------------------------------------------------------------ */

const rewardCelebrationSchema = z
  .object({
    cast: z.array(castIdSchema),
    anim: z.string(),
  })
  .strict();

const rewardNodeSchema = z
  .object({
    id: z.string(),
    type: z.literal("reward"),
    restore: z.array(z.string()),
    cosmetic: z.array(z.string()),
    celebration: rewardCelebrationSchema,
    setFlags: z.array(z.string()),
    conditionalOnPerformance: z.boolean(),
    next: z.string(),
  })
  .strict();

/* ------------------------------------------------------------------------ */
/* Unión de nodos y escena                                                  */
/* ------------------------------------------------------------------------ */

const episodeNodeSchema = z.discriminatedUnion("type", [
  lineNodeSchema,
  choiceNodeSchema,
  sceneChangeNodeSchema,
  endNodeSchema,
  minigameNodeSchema,
  branchNodeSchema,
  rewardNodeSchema,
]);

const sceneOnEnterSchema = z
  .object({
    setFlags: z.array(z.string()).optional(),
    setProgress: z.record(z.string(), z.string()).optional(),
  })
  .strict();

const sceneSchema = z
  .object({
    id: z.string(),
    // Subconjunto abierto de `environment`; se valida por referencia más
    // abajo, no aquí (los ids concretos los declara el propio documento).
    environment: z.record(z.string(), z.string()),
    camera: z.string(),
    cast: z.array(castIdSchema),
    onEnter: sceneOnEnterSchema,
    entryNode: z.string(),
    nodes: z.array(episodeNodeSchema).min(1, "Una escena necesita al menos un nodo."),
  })
  .strict();

/* ------------------------------------------------------------------------ */
/* Episodio completo                                                        */
/* ------------------------------------------------------------------------ */

export const episodeContentSchema = z
  .object({
    schemaVersion: z.string(),
    contentVersion: z.string(),
    episodeId: z.string(),
    slug: z.string(),
    titleLocId: z.string(),
    status: z.string(),
    updated: z.string(),
    source: z.string(),
    reviewPolicy: reviewPolicySchema,
    defaultLocale: z.string(),
    locales: z.array(z.string()),
    ageModes: z.array(ageModeSchema),
    estimatedPlayMinutes: estimatedPlayMinutesSchema,
    privacy: privacyDeclarationSchema,
    cast: castSchema,
    props: z.array(z.string()),
    environment: z.array(z.string()),
    globalUi: globalUiSchema,
    progressFlags: z.array(progressFlagDeclarationSchema),
    sessionVars: z.array(sessionVarDeclarationSchema),
    entryScene: z.string(),
    scenes: z.array(sceneSchema).min(1, "El episodio necesita al menos una escena."),
    localization: z.record(z.string(), z.record(z.string(), z.string())),
  })
  .strict();

/* ------------------------------------------------------------------------ */
/* Integridad referencial (lo que Zod solo no puede comprobar)              */
/* ------------------------------------------------------------------------ */

/** Convierte la ruta de un issue de zod en una cadena legible. */
function formatZodPath(path: readonly PropertyKey[]): string {
  let result = "";
  for (const segment of path) {
    if (typeof segment === "number") {
      result += `[${segment}]`;
    } else if (result.length === 0) {
      result += String(segment);
    } else {
      result += `.${String(segment)}`;
    }
  }
  return result.length > 0 ? result : "(raíz)";
}

/**
 * Recorre el episodio ya validado por forma (`episodeContentSchema`) y
 * comprueba las referencias cruzadas que Zod no puede expresar por sí solo:
 * IDs únicos, destinos de `next`/`scene` existentes, `locId`/`speaker`/
 * `icon` (sin registro, ver nota abajo)/`prop`/`environment` declarados, y
 * que ningún modo de edad deje una decisión sin opciones.
 *
 * Nota: el contenido no declara un registro de `icon` (solo `props` y
 * `environment`), así que los íconos se tipan pero no se validan por
 * referencia; ver el hallazgo documentado en el reporte de la tarea.
 */
function checkReferentialIntegrity(episode: EpisodeContent): {
  readonly issues: readonly ValidationIssue[];
  readonly warnings: readonly ValidationWarning[];
} {
  const issues: ValidationIssue[] = [];
  const warnings: ValidationWarning[] = [];

  const sceneIds = new Set(episode.scenes.map((scene) => scene.id));
  const castIds = new Set(Object.keys(episode.cast));
  const propIds = new Set(episode.props);
  const environmentIds = new Set(episode.environment);
  const sessionVarIds = new Set(episode.sessionVars.map((sessionVar) => sessionVar.id));
  const defaultLocaleTable = episode.localization[episode.defaultLocale] ?? {};
  const locIds = new Set(Object.keys(defaultLocaleTable));
  const usedLocIds = new Set<string>();

  function checkLocId(path: string, locId: string): void {
    usedLocIds.add(locId);
    if (!locIds.has(locId)) {
      issues.push({
        path,
        message: `El locId "${locId}" no existe en localization["${episode.defaultLocale}"].`,
      });
    }
  }

  if (sceneIds.size !== episode.scenes.length) {
    issues.push({ path: "scenes", message: "Hay identificadores de escena repetidos." });
  }

  // Unicidad global de nodos, además de la unicidad por escena de más abajo:
  // en el contenido real cada id de nodo ya lleva el prefijo de su escena
  // (`s01_n001`), pero nada en el esquema lo obliga; lo comprobamos aquí para
  // que dos escenas nunca puedan compartir un id por accidente de copiado.
  const globalNodeIdCounts = new Map<string, number>();
  for (const scene of episode.scenes) {
    for (const node of scene.nodes) {
      globalNodeIdCounts.set(node.id, (globalNodeIdCounts.get(node.id) ?? 0) + 1);
    }
  }
  for (const [nodeId, count] of globalNodeIdCounts) {
    if (count > 1) {
      issues.push({
        path: "scenes",
        message: `El id de nodo "${nodeId}" se repite en ${count} escenas o nodos del episodio.`,
      });
    }
  }

  if (!sceneIds.has(episode.entryScene)) {
    issues.push({
      path: "entryScene",
      message: `entryScene apunta a una escena que no existe: "${episode.entryScene}".`,
    });
  }

  checkLocId("titleLocId", episode.titleLocId);
  for (const [castId, entry] of Object.entries(episode.cast)) {
    checkLocId(`cast.${castId}.displayNameLocId`, entry.displayNameLocId);
  }
  checkLocId("globalUi.pause.promptLocId", episode.globalUi.pause.promptLocId);
  for (const option of episode.globalUi.pause.options) {
    checkLocId(`globalUi.pause.options.${option.id}.locId`, option.locId);
  }

  for (const scene of episode.scenes) {
    const scenePath = `scenes.${scene.id}`;
    const nodeIds = new Set(scene.nodes.map((node) => node.id));

    if (nodeIds.size !== scene.nodes.length) {
      issues.push({
        path: `${scenePath}.nodes`,
        message: "Hay identificadores de nodo repetidos en esta escena.",
      });
    }
    if (!nodeIds.has(scene.entryNode)) {
      issues.push({
        path: `${scenePath}.entryNode`,
        message: `entryNode apunta a un nodo que no existe en la escena: "${scene.entryNode}".`,
      });
    }
    for (const castId of scene.cast) {
      if (!castIds.has(castId)) {
        issues.push({ path: `${scenePath}.cast`, message: `"${castId}" no está declarado en cast.` });
      }
    }
    for (const environmentId of Object.keys(scene.environment)) {
      if (!environmentIds.has(environmentId)) {
        issues.push({
          path: `${scenePath}.environment`,
          message: `"${environmentId}" no está declarado en la lista environment del episodio.`,
        });
      }
    }

    function checkNodeRef(path: string, targetNodeId: string): void {
      if (!nodeIds.has(targetNodeId)) {
        issues.push({
          path,
          message: `Apunta a un nodo que no existe en esta escena: "${targetNodeId}".`,
        });
      }
    }

    for (const node of scene.nodes) {
      const nodePath = `${scenePath}.nodes.${node.id}`;

      switch (node.type) {
        case "line": {
          checkLocId(`${nodePath}.locId`, node.locId);
          if (!castIds.has(node.speaker)) {
            issues.push({
              path: `${nodePath}.speaker`,
              message: `"${node.speaker}" no está declarado en cast.`,
            });
          }
          checkNodeRef(`${nodePath}.next`, node.next);
          break;
        }
        case "choice": {
          for (const age of ageModesOrDefault(node.ageModes)) {
            const visible = node.options.filter((option) => isVisibleForAgeMode(option.ageModes, age));
            if (visible.length === 0) {
              issues.push({
                path: `${nodePath}.options`,
                message: `Esta decisión no deja ninguna opción visible para el modo de edad "${age}".`,
              });
            }
          }
          for (const option of node.options) {
            const optionPath = `${nodePath}.options.${option.id}`;
            checkLocId(`${optionPath}.locId`, option.locId);
            checkNodeRef(`${optionPath}.next`, option.next);
            if (option.setSession) {
              for (const sessionVarId of Object.keys(option.setSession)) {
                if (!sessionVarIds.has(sessionVarId)) {
                  issues.push({
                    path: `${optionPath}.setSession`,
                    message: `"${sessionVarId}" no está declarado en sessionVars.`,
                  });
                }
              }
            }
          }
          break;
        }
        case "sceneChange": {
          if (!sceneIds.has(node.scene)) {
            issues.push({
              path: `${nodePath}.scene`,
              message: `sceneChange apunta a una escena que no existe: "${node.scene}".`,
            });
          }
          break;
        }
        case "end": {
          if (node.debriefScreen) {
            const debrief = node.debriefScreen;
            checkLocId(`${nodePath}.debriefScreen.titleLocId`, debrief.titleLocId);
            checkLocId(`${nodePath}.debriefScreen.childLocId`, debrief.childLocId);
            checkLocId(`${nodePath}.debriefScreen.activityLocId`, debrief.activityLocId);
            for (const locId of debrief.adultQuestionsLocIds) {
              checkLocId(`${nodePath}.debriefScreen.adultQuestionsLocIds`, locId);
            }
            for (const locId of debrief.familyLocIds) {
              checkLocId(`${nodePath}.debriefScreen.familyLocIds`, locId);
            }
            if (debrief.adultQuestionsAgeModes) {
              for (const locId of Object.keys(debrief.adultQuestionsAgeModes)) {
                checkLocId(`${nodePath}.debriefScreen.adultQuestionsAgeModes`, locId);
                if (!debrief.adultQuestionsLocIds.includes(locId)) {
                  issues.push({
                    path: `${nodePath}.debriefScreen.adultQuestionsAgeModes`,
                    message: `"${locId}" no está en adultQuestionsLocIds.`,
                  });
                }
              }
            }
          }
          break;
        }
        case "minigame": {
          checkNodeRef(`${nodePath}.next`, node.next);
          if (node.minigameId === "body_compass_practice") {
            for (const card of node.config.cards) {
              checkLocId(`${nodePath}.config.cards`, card.locId);
            }
            for (const answer of node.config.answers) {
              checkLocId(`${nodePath}.config.answers`, answer.locId);
            }
            const feedback = node.config.feedbackAfterEachCard;
            checkLocId(`${nodePath}.config.feedbackAfterEachCard.locId`, feedback.locId);
            if (!castIds.has(feedback.speaker)) {
              issues.push({
                path: `${nodePath}.config.feedbackAfterEachCard.speaker`,
                message: `"${feedback.speaker}" no está declarado en cast.`,
              });
            }
            const variant = node.config.feedbackVariantAfterCard;
            checkLocId(`${nodePath}.config.feedbackVariantAfterCard.locId`, variant.locId);
            if (!castIds.has(variant.speaker)) {
              issues.push({
                path: `${nodePath}.config.feedbackVariantAfterCard.speaker`,
                message: `"${variant.speaker}" no está declarado en cast.`,
              });
            }
          }
          if (node.minigameId === "bridge_planks") {
            for (const card of node.config.cards) {
              checkLocId(`${nodePath}.config.cards`, card.locId);
              if (!propIds.has(card.prop)) {
                issues.push({
                  path: `${nodePath}.config.cards`,
                  message: `"${card.prop}" no está declarado en props.`,
                });
              }
            }
          }
          if (node.minigameId === "high_five_rhythm") {
            checkLocId(`${nodePath}.config.stopButton.locId`, node.config.stopButton.locId);
            checkNodeRef(`${nodePath}.config.stopButton.onPress`, node.config.stopButton.onPress);
            checkNodeRef(`${nodePath}.config.questionNode`, node.config.questionNode);
          }
          break;
        }
        case "branch": {
          for (const rule of node.conditions) {
            checkNodeRef(`${nodePath}.conditions`, rule.next);
          }
          checkNodeRef(`${nodePath}.else`, node.else);
          break;
        }
        case "reward": {
          checkNodeRef(`${nodePath}.next`, node.next);
          for (const environmentId of node.restore) {
            if (!environmentIds.has(environmentId)) {
              issues.push({
                path: `${nodePath}.restore`,
                message: `"${environmentId}" no está declarado en la lista environment del episodio.`,
              });
            }
          }
          for (const castId of node.celebration.cast) {
            if (!castIds.has(castId)) {
              issues.push({
                path: `${nodePath}.celebration.cast`,
                message: `"${castId}" no está declarado en cast.`,
              });
            }
          }
          break;
        }
      }
    }
  }

  for (const locId of locIds) {
    if (!usedLocIds.has(locId)) {
      warnings.push({
        path: `localization.${episode.defaultLocale}.${locId}`,
        message: "Este locId está definido pero ningún nodo lo referencia todavía.",
      });
    }
  }

  return { issues, warnings };
}

/**
 * Diagnóstico de desarrollo sobre `progressFlags` (T-001-03, punto 3 de la
 * tarea): compara los flags con `persist: true` del contenido contra
 * `PERSISTENCE_ALLOWLIST` y enumera los que el runtime va a ignorar. Nunca
 * bloquea la carga: es información para quien desarrolla, no un error.
 */
function buildPersistenceDiagnostics(episode: EpisodeContent): PersistenceDiagnostics {
  const ignoredFlags = episode.progressFlags
    .filter((flag) => flag.persist && !PERSISTENCE_ALLOWLIST.includes(flag.id))
    .map((flag) => flag.id);

  return { allowlist: PERSISTENCE_ALLOWLIST, ignoredFlags };
}

/* ------------------------------------------------------------------------ */
/* API pública                                                              */
/* ------------------------------------------------------------------------ */

/**
 * Valida un valor ya interpretado (por ejemplo, el resultado de
 * `JSON.parse`) contra el esquema del episodio y sus reglas de integridad
 * referencial. Nunca lanza: siempre devuelve un resultado discriminado
 * (AC-1).
 */
export function validateEpisodeContent(data: unknown): EpisodeValidationResult {
  const parsed = episodeContentSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((issue) => ({
        path: formatZodPath(issue.path),
        message: `${issue.message} (código: ${issue.code}).`,
      })),
    };
  }

  const episode: EpisodeContent = parsed.data;
  const { issues, warnings } = checkReferentialIntegrity(episode);
  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return {
    ok: true,
    episode,
    warnings,
    persistence: buildPersistenceDiagnostics(episode),
  };
}

/**
 * Punto de entrada de más alto nivel: recibe el texto crudo de un archivo de
 * episodio, lo interpreta como JSON y lo valida. Un JSON corrupto o mal
 * formado produce un `issue` legible en vez de una excepción (AC-1).
 */
export function parseEpisodeContent(raw: string): EpisodeValidationResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      issues: [{ path: "(raíz)", message: `El contenido no es JSON válido: ${reason}` }],
    };
  }

  return validateEpisodeContent(data);
}
