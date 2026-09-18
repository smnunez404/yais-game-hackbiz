/* eslint-disable react-hooks/immutability --
   Igual que en `useCharacterAnimation`: lo que se muta aquí es el `Group` de
   Three que representa al personaje (`position`, `rotation`), no estado de
   React. Moverlo por estado de React sería un render por cuadro, que es
   justamente lo que PLAN-001 prohíbe para T-001-06. */

// Caminata de un personaje por la isla (T-001-06).
//
// Mueve el `Group` del personaje hacia su destino a velocidad constante y lo
// gira hacia donde camina. Cuando llega, lo devuelve a mirar a la cámara.
//
// El hook no re-renderiza por cuadro: avisa dos veces por trayecto —empieza y
// termina— mediante `alCambiarMovimiento`. Ese mismo aviso es el que mantiene
// encendido el bucle de render mientras hay movimiento y lo apaga al llegar,
// así que caminar no deja la GPU trabajando de más (Constitución VI).
//
// Con `prefers-reduced-motion` no hay caminata: el personaje aparece ya
// colocado en su destino, sin desplazamiento ni giro (AC-7).

import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, type RefObject } from "react";
import type { Group } from "three";

import { dentroDelMundo, type ComandoDeJugador } from "./control-del-jugador";
import type { Posicion } from "./posiciones";

/** Unidades por segundo. La isla mide 6,3: cruzarla lleva unos 4 segundos. */
const VELOCIDAD = 1.6;

/** Radianes por segundo al girar. */
const VELOCIDAD_DE_GIRO = 6;

/** Distancia a partir de la cual se considera que ya llegó. */
const UMBRAL_DE_LLEGADA = 0.05;

/** Diferencia de ángulo que ya no vale la pena corregir. */
const UMBRAL_DE_GIRO = 0.02;

interface OpcionesDeCaminata {
  readonly grupo: RefObject<Group | null>;
  readonly destino: Posicion;
  /**
   * Lo que pide quien juega, si es el personaje que controla. Manda sobre el
   * destino del guion: en cuanto alguien toma el control en una escena, el
   * personaje deja de volver solo a su sitio —si no, caminar sería pelearse
   * con el juego—. Se suelta al cambiar de escena.
   */
  readonly comandoDelJugador?: RefObject<ComandoDeJugador | null> | undefined;
  /** Desde dónde entra al empezar una escena. */
  readonly entrada: Posicion;
  /** Cambia cuando empieza una escena nueva: dispara la entrada caminando. */
  readonly sceneId: string;
  readonly menosMovimiento: boolean;
  readonly alCambiarMovimiento: (enMovimiento: boolean) => void;
}

/** Acerca `actual` a `objetivo` por el camino corto del círculo. */
function girarHacia(actual: number, objetivo: number, maximo: number): number {
  let diferencia = (objetivo - actual) % (Math.PI * 2);
  if (diferencia > Math.PI) diferencia -= Math.PI * 2;
  if (diferencia < -Math.PI) diferencia += Math.PI * 2;
  if (Math.abs(diferencia) <= maximo) return objetivo;
  return actual + Math.sign(diferencia) * maximo;
}

export function useCharacterWalk({
  grupo,
  destino,
  entrada,
  sceneId,
  menosMovimiento,
  comandoDelJugador,
  alCambiarMovimiento,
}: OpcionesDeCaminata): void {
  // El destino se lee cuadro a cuadro desde un ref para no re-suscribir el
  // bucle en cada render; se sincroniza en el efecto de más abajo, nunca
  // durante el render.
  const destinoRef = useRef(destino);
  const enMovimientoRef = useRef(false);
  const jugadorTomoElControlRef = useRef(false);

  function marcar(enMovimiento: boolean): void {
    if (enMovimientoRef.current === enMovimiento) return;
    enMovimientoRef.current = enMovimiento;
    alCambiarMovimiento(enMovimiento);
  }

  // Empezar una escena: se entra caminando desde el sendero. Con menos
  // movimiento, se aparece ya colocado.
  useEffect(() => {
    const objeto = grupo.current;
    if (!objeto) return;
    const inicio = menosMovimiento ? destinoRef.current : entrada;
    objeto.position.set(inicio[0], inicio[1], inicio[2]);
    objeto.rotation.y = 0;
    jugadorTomoElControlRef.current = false;
    if (!menosMovimiento) marcar(true);
    // `sceneId` es la única dependencia real: se reposiciona al cambiar de
    // escena, no cada vez que cambia el destino dentro de la misma.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId, menosMovimiento]);

  // Cualquier destino nuevo dentro de la escena también pone a caminar.
  useEffect(() => {
    destinoRef.current = destino;
    if (menosMovimiento) return;
    marcar(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destino, menosMovimiento]);

  useFrame((_, delta) => {
    const objeto = grupo.current;
    if (!objeto || menosMovimiento) return;

    const orden = comandoDelJugador?.current ?? null;
    if (orden) jugadorTomoElControlRef.current = true;

    if (orden?.tipo === "direccion") {
      const paso = VELOCIDAD * delta;
      const sitio = dentroDelMundo(
        objeto.position.x + orden.x * paso,
        objeto.position.z + orden.z * paso,
      );
      objeto.position.x = sitio.x;
      objeto.position.z = sitio.z;
      objeto.rotation.y = girarHacia(
        objeto.rotation.y,
        Math.atan2(orden.x, orden.z),
        VELOCIDAD_DE_GIRO * delta,
      );
      marcar(true);
      return;
    }

    // Un sitio señalado con el dedo o el ratón manda sobre el del guion; al
    // llegar se suelta para que el guion pueda volver a decidir.
    const senalado = orden?.tipo === "destino" ? orden.posicion : null;
    const objetivo = senalado ?? (jugadorTomoElControlRef.current ? null : destinoRef.current);

    if (!objetivo) {
      // Quien juega tiene el control y no está pidiendo nada: el personaje se
      // queda donde lo dejaron, mirando a la cámara.
      if (Math.abs(objeto.rotation.y) > UMBRAL_DE_GIRO) {
        objeto.rotation.y = girarHacia(objeto.rotation.y, 0, VELOCIDAD_DE_GIRO * delta);
        marcar(true);
        return;
      }
      marcar(false);
      return;
    }
    const dx = objetivo[0] - objeto.position.x;
    const dz = objetivo[2] - objeto.position.z;
    const distancia = Math.hypot(dx, dz);

    if (distancia > UMBRAL_DE_LLEGADA) {
      const paso = Math.min(distancia, VELOCIDAD * delta);
      objeto.position.x += (dx / distancia) * paso;
      objeto.position.z += (dz / distancia) * paso;
      objeto.rotation.y = girarHacia(
        objeto.rotation.y,
        Math.atan2(dx, dz),
        VELOCIDAD_DE_GIRO * delta,
      );
      marcar(true);
      return;
    }

    // Ya llegó: se acomoda mirando a la cámara antes de declararse quieto.
    objeto.position.x = objetivo[0];
    objeto.position.z = objetivo[2];
    if (senalado && comandoDelJugador) comandoDelJugador.current = null;
    if (Math.abs(objeto.rotation.y) > UMBRAL_DE_GIRO) {
      objeto.rotation.y = girarHacia(objeto.rotation.y, 0, VELOCIDAD_DE_GIRO * delta);
      marcar(true);
      return;
    }
    objeto.rotation.y = 0;
    marcar(false);
  });
}
