// Un personaje en la escena (T-001-06).
//
// Carga su GLB bajo demanda (solo se monta cuando su escena lo tiene en el
// reparto) y reproduce el clip que le corresponde. La ruta del modelo sale
// siempre de `shared/assets.ts`: aquí no hay ninguna ruta literal (AGENTS.md).
//
// El modelo se clona por instancia con `SkeletonUtils.clone`: dos personajes
// del mismo GLB no pueden compartir esqueleto, y `useGLTF` devuelve siempre
// la misma escena cacheada. Tampoco se copia el archivo por escena: el GLB se
// descarga una vez y se reutiliza (PLAN-001: "no copies el modelo por
// escena").

import { useAnimations, useGLTF } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
// Viene de `three`, que es dependencia directa; `three-stdlib` solo llega
// aquí de rebote a través de drei y no se importa a propósito.
import { clone as clonarConEsqueleto } from "three/examples/jsm/utils/SkeletonUtils.js";

import { resolveAnimationClip } from "../../shared/animation-intents";
import { CHARACTERS, type CharacterId, type RuntimeClip } from "../../shared/assets";
import type { GestoDeEscena } from "./estado-de-escena";
import { useCharacterAnimation } from "./useCharacterAnimation";

interface CharacterProps {
  readonly characterId: CharacterId;
  readonly position: readonly [number, number, number];
  readonly gesto: GestoDeEscena;
  readonly sessionVars: Readonly<Record<string, string | boolean>>;
  readonly menosMovimiento: boolean;
  readonly alCambiarActividad: (characterId: CharacterId, enMovimiento: boolean) => void;
}

/**
 * Traduce el gesto de la escena al clip real del personaje.
 *
 * `intencion` pasa por el mapa de `shared/animation-intents.ts`, que nunca
 * adivina por nombre y avisa en desarrollo cuando cae en un fallback.
 * `escuchar` es una decisión de presentación, no del guion, y por eso se
 * resuelve aquí de forma explícita: `Listen` si el personaje lo tiene.
 */
function clipDelGesto(
  gesto: GestoDeEscena,
  characterId: CharacterId,
  sessionVars: Readonly<Record<string, string | boolean>>,
): RuntimeClip {
  if (gesto.tipo === "intencion") {
    return resolveAnimationClip(gesto.intent, characterId, sessionVars);
  }
  if (gesto.tipo === "escuchar") {
    return CHARACTERS[characterId].availableClips.includes("Listen") ? "Listen" : "Idle";
  }
  return "Idle";
}

export function Character({
  characterId,
  position,
  gesto,
  sessionVars,
  menosMovimiento,
  alCambiarActividad,
}: CharacterProps) {
  const grupo = useRef<Group>(null);
  const { scene, animations } = useGLTF(CHARACTERS[characterId].modelUrl);

  const modelo = useMemo(() => clonarConEsqueleto(scene), [scene]);
  const { actions, mixer } = useAnimations(animations, grupo);

  const clip = clipDelGesto(gesto, characterId, sessionVars);

  // `alCambiarActividad` viene del canvas y lleva el id: se estabiliza aquí
  // para que el efecto de animación no se vuelva a montar en cada render.
  const avisar = useMemo(
    () => (enMovimiento: boolean) => alCambiarActividad(characterId, enMovimiento),
    [alCambiarActividad, characterId],
  );

  useCharacterAnimation({
    acciones: actions,
    mixer,
    clip,
    menosMovimiento,
    alCambiarActividad: avisar,
  });

  // Al desmontarse, el personaje deja de contar como movimiento: si no, el
  // canvas seguiría dibujando por alguien que ya no está en escena.
  useEffect(() => {
    return () => {
      alCambiarActividad(characterId, false);
    };
  }, [alCambiarActividad, characterId]);

  return (
    <group ref={grupo} position={[...position]} dispose={null}>
      <primitive object={modelo} />
    </group>
  );
}
