// El mundo mínimo de la escena (T-001-06).
//
// Solo la isla del primer hito, cargada bajo demanda desde el registro de
// `shared/assets.ts`. El resto del mundo mínimo (sendero, puente, banco,
// árboles, faro) está sincronizado y registrado, pero no se monta todavía:
// cada pieza que se añada es descarga y triángulos sobre una laptop vieja, y
// este hito mide antes de poblar (PLAN-001, riesgo "Los GLB son pesados").
//
// Sin animación de cámara ni movimiento ambiental: AC-7 se cumple por no
// tener nada que apagar.

import { useGLTF } from "@react-three/drei";

import { WORLD_ASSETS } from "../../shared/assets";

export function IslandScene() {
  const { scene } = useGLTF(WORLD_ASSETS.island_large.modelUrl);

  return <primitive object={scene} position={[0, 0, 0]} dispose={null} />;
}
