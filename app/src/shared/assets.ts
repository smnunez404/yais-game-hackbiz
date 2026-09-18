// Única fuente de rutas de arte del runtime (AGENTS.md, PLAN-001).
//
// Ningún componente debe escribir una ruta de GLB o poster como string
// literal: todas entran por este archivo. `scripts/sync-runtime-assets.mjs`
// copia el subconjunto allowlisted del primer hito hacia `app/public/assets/`
// (carpeta generada, ver `.gitignore`), que Vite sirve bajo `/assets/...`
// tanto en `npm run dev` como en el build.

/** Elenco de personajes del contenido. No todos se precargan en este hito. */
export type CharacterId = "capi" | "tomi" | "luna" | "clara" | "beto";

/**
 * Clips reales disponibles en los GLB v001 (PLAN-001: "el mapa de animaciones
 * nunca adivina por nombre en tiempo de ejecución"). Solo hay cinco por
 * personaje: `Idle`, locomoción (`Walk` o `Roll`), `Wave`, `Listen` y
 * `TalkGesture`.
 */
export type RuntimeClip = "Idle" | "Walk" | "Roll" | "Wave" | "Listen" | "TalkGesture";

/** Contrato de PLAN-001 para un personaje animado del runtime. */
export interface CharacterAsset {
  readonly modelUrl: string;
  readonly posterUrl: string;
  readonly locomotion: "Walk" | "Roll";
  readonly availableClips: readonly RuntimeClip[];
}

const CLIPS_DE_PIE: readonly RuntimeClip[] = ["Idle", "Walk", "Wave", "Listen", "TalkGesture"];
const CLIPS_EN_SILLA: readonly RuntimeClip[] = ["Idle", "Roll", "Wave", "Listen", "TalkGesture"];

/**
 * Registro de los cinco personajes. `modelUrl`/`posterUrl` son rutas
 * públicas del build (p. ej. `/assets/characters/capi/mascot.glb`), nunca
 * rutas de `assets/production/...`.
 */
export const CHARACTERS: Readonly<Record<CharacterId, CharacterAsset>> = {
  capi: {
    modelUrl: "/assets/characters/capi/mascot.glb",
    posterUrl: "/assets/characters/capi/poster.png",
    locomotion: "Walk",
    availableClips: CLIPS_DE_PIE,
  },
  tomi: {
    modelUrl: "/assets/characters/tomi/child_explorer.glb",
    posterUrl: "/assets/characters/tomi/poster.png",
    locomotion: "Walk",
    availableClips: CLIPS_DE_PIE,
  },
  luna: {
    modelUrl: "/assets/characters/luna/child_wheelchair.glb",
    posterUrl: "/assets/characters/luna/poster.png",
    locomotion: "Roll",
    availableClips: CLIPS_EN_SILLA,
  },
  clara: {
    modelUrl: "/assets/characters/clara/educator.glb",
    posterUrl: "/assets/characters/clara/poster.png",
    locomotion: "Walk",
    availableClips: CLIPS_DE_PIE,
  },
  beto: {
    modelUrl: "/assets/characters/beto/community_guide.glb",
    posterUrl: "/assets/characters/beto/poster.png",
    locomotion: "Walk",
    availableClips: CLIPS_DE_PIE,
  },
} as const;

/**
 * Personajes que `scripts/sync-runtime-assets.mjs` copia de verdad en este
 * hito (T-001-02). Los demás quedan registrados arriba —para que
 * `CharacterId` y sus tipos sean completos— pero sin GLB bajo
 * `app/public/assets/`: ningún componente debe cargarlos todavía
 * (PLAN-001: "no precargar" Luna, Clara ni Beto).
 */
export const PRELOADED_CHARACTER_IDS: readonly CharacterId[] = ["capi", "tomi"] as const;

/** Elementos del mundo mínimo del primer hito (isla, sendero, agua...). */
export type WorldAssetId =
  | "island_large"
  | "path_straight"
  | "water_tile"
  | "bridge_straight"
  | "bench"
  | "tree_round"
  | "palm"
  | "cloud"
  | "lighthouse";

export interface WorldAsset {
  readonly modelUrl: string;
}

export const WORLD_ASSETS: Readonly<Record<WorldAssetId, WorldAsset>> = {
  island_large: { modelUrl: "/assets/world/island_large/island_large.glb" },
  path_straight: { modelUrl: "/assets/world/path_straight/path_straight.glb" },
  water_tile: { modelUrl: "/assets/world/water_tile/water_tile.glb" },
  bridge_straight: { modelUrl: "/assets/world/bridge_straight/bridge_straight.glb" },
  bench: { modelUrl: "/assets/world/bench/bench.glb" },
  tree_round: { modelUrl: "/assets/world/tree_round/tree_round.glb" },
  palm: { modelUrl: "/assets/world/palm/palm.glb" },
  cloud: { modelUrl: "/assets/world/cloud/cloud.glb" },
  lighthouse: { modelUrl: "/assets/world/lighthouse/lighthouse.glb" },
} as const;

/** Props mínimos del primer hito (brújula, burbuja de diálogo, tarjetas...). */
export type PropAssetId =
  | "compass"
  | "speech_bubble"
  | "card_sun"
  | "card_leaf"
  | "card_cloud"
  | "pause_button"
  | "sound_button";

export interface PropAsset {
  readonly modelUrl: string;
}

export const PROP_ASSETS: Readonly<Record<PropAssetId, PropAsset>> = {
  compass: { modelUrl: "/assets/props/compass/compass.glb" },
  speech_bubble: { modelUrl: "/assets/props/speech_bubble/speech_bubble.glb" },
  card_sun: { modelUrl: "/assets/props/card_sun/card_sun.glb" },
  card_leaf: { modelUrl: "/assets/props/card_leaf/card_leaf.glb" },
  card_cloud: { modelUrl: "/assets/props/card_cloud/card_cloud.glb" },
  pause_button: { modelUrl: "/assets/props/pause_button/pause_button.glb" },
  sound_button: { modelUrl: "/assets/props/sound_button/sound_button.glb" },
} as const;

/**
 * Origen real de cada archivo dentro de `assets/`, relativo a la raíz del
 * repositorio. Solo lo usa `assets.test.ts` para comprobar que el registro
 * de arriba apunta a archivos que existen de verdad; el runtime nunca
 * importa ni sirve esta ruta por HTTP (esa es la carpeta fuente, no el
 * build). Debe reflejar la allowlist de `scripts/sync-runtime-assets.mjs`.
 */
export const CHARACTER_SOURCE_FILES: Readonly<
  Record<CharacterId, { readonly model: string; readonly poster: string }>
> = {
  capi: {
    model: "assets/production/animated/v001/mascot/mascot.glb",
    poster: "assets/production/mascot/v005/three-quarter.png",
  },
  tomi: {
    model: "assets/production/animated/v001/child_explorer/child_explorer.glb",
    poster: "assets/production/npc/v001/child_explorer/three-quarter.png",
  },
  luna: {
    model: "assets/production/animated/v001/child_wheelchair/child_wheelchair.glb",
    poster: "assets/production/npc/v002/child_wheelchair/three-quarter.png",
  },
  clara: {
    model: "assets/production/animated/v001/educator/educator.glb",
    poster: "assets/production/npc/v002/educator/three-quarter.png",
  },
  beto: {
    model: "assets/production/animated/v001/community_guide/community_guide.glb",
    poster: "assets/production/npc/v002/community_guide/three-quarter.png",
  },
} as const;

export const WORLD_SOURCE_FILES: Readonly<Record<WorldAssetId, string>> = {
  island_large: "assets/production/world/v001/island_large/island_large.glb",
  path_straight: "assets/production/world/v001/path_straight/path_straight.glb",
  water_tile: "assets/production/world/v001/water_tile/water_tile.glb",
  bridge_straight: "assets/production/world/v001/bridge_straight/bridge_straight.glb",
  bench: "assets/production/world/v001/bench/bench.glb",
  tree_round: "assets/production/world/v001/tree_round/tree_round.glb",
  palm: "assets/production/world/v001/palm/palm.glb",
  cloud: "assets/production/world/v001/cloud/cloud.glb",
  lighthouse: "assets/production/world/v001/lighthouse/lighthouse.glb",
} as const;

export const PROP_SOURCE_FILES: Readonly<Record<PropAssetId, string>> = {
  compass: "assets/production/props/v001/compass/compass.glb",
  speech_bubble: "assets/production/props/v001/speech_bubble/speech_bubble.glb",
  card_sun: "assets/production/props/v001/card_sun/card_sun.glb",
  card_leaf: "assets/production/props/v001/card_leaf/card_leaf.glb",
  card_cloud: "assets/production/props/v001/card_cloud/card_cloud.glb",
  pause_button: "assets/production/props/v001/pause_button/pause_button.glb",
  sound_button: "assets/production/props/v001/sound_button/sound_button.glb",
} as const;
