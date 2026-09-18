// Detección de capacidades del dispositivo (T-001-06).
//
// Dos preguntas, las dos sobre el navegador y ninguna sobre quien juega:
// si hay WebGL y si el sistema pide menos movimiento. Ninguna se guarda ni
// sale del dispositivo (AC-9).
//
// Se responden ANTES de importar Three: `EscenaDelEpisodio` solo carga el
// módulo de la escena cuando hay WebGL, así que un equipo sin aceleración no
// descarga el motor 3D ni un byte de GLB. La experiencia sigue siendo la 2D
// completa (AC-8).

/**
 * `true` si el navegador puede crear un contexto WebGL. Se comprueba creando
 * uno de verdad —no mirando `window.WebGLRenderingContext`—, porque un equipo
 * con la aceleración desactivada expone la clase y falla al crear el
 * contexto. El lienzo de prueba se descarta enseguida.
 */
export function soportaWebGL(): boolean {
  try {
    const lienzo = document.createElement("canvas");
    const contexto = lienzo.getContext("webgl2") ?? lienzo.getContext("webgl");
    return contexto !== null;
  } catch {
    return false;
  }
}

/** `true` si el sistema pide reducir el movimiento (AC-7). */
export function prefiereMenosMovimiento(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    // Un navegador sin `matchMedia` es tan viejo que la escena 3D no es su
    // problema principal; se asume la opción prudente.
    return true;
  }
}
