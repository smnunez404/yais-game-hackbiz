// Distintivo de contenido no validado (AC-10, Constitución IV).
//
// Se muestra en todas las pantallas, siempre, sin condición ni prop que lo
// apague: mientras Arianna no valide el contenido, nadie puede demostrar
// este prototipo como si estuviera aprobado. Si alguna vez debe dejar de
// verse, esa decisión se toma en la spec —hay una pregunta abierta sobre
// ello— y se refleja aquí, no en el lugar donde se usa.

import { TEXTOS_UI } from "./textos-ui";

export function DistintivoBorrador() {
  return <p className="distintivo-borrador">{TEXTOS_UI.distintivoBorrador}</p>;
}
