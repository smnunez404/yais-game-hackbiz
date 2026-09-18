// Entrada de quien juega (T-001-06, prototipo).
//
// Escucha el teclado y guarda lo que se pide en un ref: ni un render por
// pulsación, ni un render por cuadro. `useCharacterWalk` lo lee dentro del
// bucle y lo aplica al `Group` del personaje.
//
// Con `prefers-reduced-motion` no se escucha nada: la escena entera está
// quieta por AC-7, y un personaje que se desliza sin animación de caminar no
// sería "menos movimiento", sería un error.

import { useCallback, useEffect, useRef, type RefObject } from "react";

import { dentroDelMundo, direccionDeTeclas, type ComandoDeJugador } from "./control-del-jugador";

interface ControlDelJugador {
  /** Lo que se está pidiendo ahora mismo, o `null` si nadie toca nada. */
  readonly comando: RefObject<ComandoDeJugador | null>;
  /** Señalar un sitio de la isla al que caminar (toque o clic). */
  readonly irA: (x: number, z: number) => void;
}

interface OpcionesDeControl {
  readonly menosMovimiento: boolean;
  /** Se llama cuando entra una orden nueva, para reencender el bucle. */
  readonly alRecibirOrden: () => void;
}

export function useControlDelJugador({
  menosMovimiento,
  alRecibirOrden,
}: OpcionesDeControl): ControlDelJugador {
  const comando = useRef<ComandoDeJugador | null>(null);

  const irA = useCallback(
    (x: number, z: number) => {
      if (menosMovimiento) return;
      // Se acepta cualquier punto y se acerca al sitio alcanzable más
      // próximo: pedirle a un niño de seis años que acierte al suelo exacto
      // convierte el control en algo que "a veces no funciona".
      const sitio = dentroDelMundo(x, z);
      comando.current = { tipo: "destino", posicion: [sitio.x, 0, sitio.z] };
      alRecibirOrden();
    },
    [menosMovimiento, alRecibirOrden],
  );

  useEffect(() => {
    if (menosMovimiento) return;

    const teclasPulsadas = new Set<string>();

    function recalcular(): void {
      const direccion = direccionDeTeclas(teclasPulsadas);
      comando.current = direccion ? { tipo: "direccion", ...direccion } : null;
      if (direccion) alRecibirOrden();
    }

    function alPulsar(evento: KeyboardEvent): void {
      // Con un modificador pulsado esto es un atajo del navegador o del
      // sistema, no una orden de caminar.
      if (evento.ctrlKey || evento.altKey || evento.metaKey) return;
      if (!direccionDeTeclas([evento.code])) return;
      teclasPulsadas.add(evento.code);
      recalcular();
    }

    function alSoltar(evento: KeyboardEvent): void {
      if (!teclasPulsadas.delete(evento.code)) return;
      recalcular();
    }

    /** Si la ventana pierde el foco, nadie sigue apretando nada. */
    function alPerderFoco(): void {
      teclasPulsadas.clear();
      recalcular();
    }

    window.addEventListener("keydown", alPulsar);
    window.addEventListener("keyup", alSoltar);
    window.addEventListener("blur", alPerderFoco);
    return () => {
      window.removeEventListener("keydown", alPulsar);
      window.removeEventListener("keyup", alSoltar);
      window.removeEventListener("blur", alPerderFoco);
      comando.current = null;
    };
  }, [menosMovimiento, alRecibirOrden]);

  return { comando, irA };
}
