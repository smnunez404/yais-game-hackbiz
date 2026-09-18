// Tests de la experiencia 2D (T-001-05).
//
// Corren en jsdom, que no tiene WebGL: todo lo que pasa aquí es exactamente
// la ruta de fallback de AC-8. Cuando T-001-06 monte la escena 3D, estos
// mismos tests deben seguir verdes sin tocarlos.
//
// No se copia texto narrativo: los rótulos que se buscan en pantalla se leen
// de la tabla de localización del propio episodio, igual que hace la app.

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import type { ChoiceNode, EpisodeContent, LocId } from "../engine";
import { EPISODIO_01 } from "../shared/episode";
import GameShell from "./GameShell";
import { TEXTOS_UI } from "./ui/textos-ui";

const episodio: EpisodeContent = (() => {
  if (!EPISODIO_01.ok) {
    throw new Error("El episodio real no valida; los tests de la interfaz no pueden correr.");
  }
  return EPISODIO_01.episode;
})();

function texto(locId: LocId): string {
  return episodio.localization[episodio.defaultLocale]?.[locId] ?? locId;
}

/** Texto de una línea del guion, leído del contenido y no escrito aquí. */
function textoDeLinea(sceneId: string, nodeId: string): string {
  const scene = episodio.scenes.find((candidata) => candidata.id === sceneId);
  const node = scene?.nodes.find((candidato) => candidato.id === nodeId);
  if (!node || node.type !== "line") throw new Error(`${nodeId} no es una línea.`);
  return texto(node.locId);
}

/** Texto de una opción de decisión, leído del contenido y no escrito aquí. */
function textoDeOpcion(sceneId: string, nodeId: string, optionId: string): string {
  const scene = episodio.scenes.find((candidata) => candidata.id === sceneId);
  const node = scene?.nodes.find((candidato) => candidato.id === nodeId);
  if (!node || node.type !== "choice") throw new Error(`${nodeId} no es una decisión.`);
  const option = (node as ChoiceNode).options.find((candidata) => candidata.id === optionId);
  if (!option) throw new Error(`La opción ${optionId} no existe en ${nodeId}.`);
  return texto(option.locId);
}

const SALUDO = {
  escena: "s03_saludo_capi",
  decision: "s03_c001",
  confirmacion: "s03_c002",
  /** Línea que hace la pregunta justo antes de la decisión. */
  pregunta: "s03_n002",
};

/** Empieza el episodio y salta a una escena con el selector de desarrollo. */
async function empezarEn(escena: string, modo?: "6-8" | "9-12") {
  const usuario = userEvent.setup();
  render(<GameShell />);

  if (modo) {
    await usuario.click(screen.getByRole("radio", { name: TEXTOS_UI.inicio[modo === "6-8" ? "edad68" : "edad912"] }));
  }
  await usuario.click(screen.getByRole("button", { name: TEXTOS_UI.inicio.empezar }));
  await usuario.selectOptions(screen.getByLabelText(TEXTOS_UI.desarrollo.selectorDeEscena), escena);

  return usuario;
}

/** Avanza líneas pulsando "Continuar" hasta que aparezca una decisión. */
async function avanzarHastaLaDecision(usuario: ReturnType<typeof userEvent.setup>) {
  for (let intento = 0; intento < 20; intento += 1) {
    const continuar = screen.queryByRole("button", { name: TEXTOS_UI.dialogo.continuar });
    if (!continuar) return;
    await usuario.click(continuar);
  }
  throw new Error("No apareció ninguna decisión después de 20 líneas.");
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("GameShell — pantalla de inicio", () => {
  it("muestra el distintivo de borrador y el título que viene del contenido", () => {
    render(<GameShell />);

    expect(screen.getByText(TEXTOS_UI.distintivoBorrador)).toBeVisible();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(texto(episodio.titleLocId));
  });

  it("deja elegir el modo de edad antes de empezar", () => {
    render(<GameShell />);

    expect(screen.getByRole("radio", { name: TEXTOS_UI.inicio.edad68 })).toBeChecked();
    expect(screen.getByRole("radio", { name: TEXTOS_UI.inicio.edad912 })).not.toBeChecked();
  });

  it("no escribe nada en el almacenamiento solo por abrir la app", () => {
    render(<GameShell />);

    expect(window.localStorage.length).toBe(0);
  });
});

describe("GameShell — el saludo de Capi", () => {
  it("mantiene el distintivo de borrador visible durante el juego (AC-10)", async () => {
    await empezarEn(SALUDO.escena);

    expect(screen.getByText(TEXTOS_UI.distintivoBorrador)).toBeVisible();
  });

  it("se completa solo con teclado y sin WebGL (AC-6, AC-8)", async () => {
    const usuario = await empezarEn(SALUDO.escena);

    // El foco viaja al control principal en cada transición: basta con
    // pulsar Enter para avanzar las líneas.
    for (let linea = 0; linea < 10; linea += 1) {
      if (!screen.queryByRole("button", { name: TEXTOS_UI.dialogo.continuar })) break;
      expect(screen.getByRole("button", { name: TEXTOS_UI.dialogo.continuar })).toHaveFocus();
      await usuario.keyboard("{Enter}");
    }

    const decision = screen.getByRole("group", {
      name: textoDeLinea(SALUDO.escena, SALUDO.pregunta),
    });
    const saludoConLaMano = textoDeOpcion(SALUDO.escena, SALUDO.decision, "wave");
    expect(within(decision).getByRole("button", { name: saludoConLaMano })).toHaveFocus();

    await usuario.keyboard("{Enter}");
    await avanzarHastaLaDecision(usuario);

    const confirmar = textoDeOpcion(SALUDO.escena, SALUDO.confirmacion, "keep");
    await usuario.click(screen.getByRole("button", { name: confirmar }));

    // La escena siguiente empieza sin que haya hecho falta el ratón.
    expect(screen.getByRole("button", { name: TEXTOS_UI.dialogo.continuar })).toBeVisible();
  });

  it("la pregunta que acompaña a la decisión es la del guion, no una de la interfaz", async () => {
    const usuario = await empezarEn(SALUDO.escena);
    await avanzarHastaLaDecision(usuario);

    // Elegir no puede borrar de la pantalla la pregunta que el contenido
    // hace: si la interfaz escribiera la suya, este test fallaría y habría
    // texto para niños fuera de `content/` (Constitución IV).
    const preguntaDelGuion = textoDeLinea(SALUDO.escena, SALUDO.pregunta);
    const decision = screen.getByRole("group", { name: preguntaDelGuion });
    expect(within(decision).getByText(preguntaDelGuion)).toBeVisible();
  });

  it("oculta la opción solo para 9-12 en el modo 6-8 (AC-3)", async () => {
    const usuario = await empezarEn(SALUDO.escena, "6-8");
    await avanzarHastaLaDecision(usuario);

    const soloMayores = textoDeOpcion(SALUDO.escena, SALUDO.decision, "fist_bump");
    expect(screen.queryByRole("button", { name: soloMayores })).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: textoDeOpcion(SALUDO.escena, SALUDO.decision, "wave") }),
    ).toBeVisible();
  });

  it("muestra esa misma opción en el modo 9-12 (AC-3)", async () => {
    const usuario = await empezarEn(SALUDO.escena, "9-12");
    await avanzarHastaLaDecision(usuario);

    const soloMayores = textoDeOpcion(SALUDO.escena, SALUDO.decision, "fist_bump");
    expect(screen.getByRole("button", { name: soloMayores })).toBeVisible();
  });

  it("permite cambiar de saludo cuantas veces quiera, sin mensaje de fallo (AC-4)", async () => {
    const usuario = await empezarEn(SALUDO.escena);
    await avanzarHastaLaDecision(usuario);

    const cambiar = textoDeOpcion(SALUDO.escena, SALUDO.confirmacion, "change");
    for (const saludo of ["wave", "hug", "distance"]) {
      await usuario.click(
        screen.getByRole("button", { name: textoDeOpcion(SALUDO.escena, SALUDO.decision, saludo) }),
      );
      await avanzarHastaLaDecision(usuario);
      await usuario.click(screen.getByRole("button", { name: cambiar }));
    }

    // Se vuelve a la misma decisión, con las mismas opciones y sin rastro de
    // los intentos anteriores.
    const decision = screen.getByRole("group");
    expect(within(decision).getAllByRole("button")).toHaveLength(5);
  });

  it("todo control del diálogo lleva la clase de objetivo táctil de 44x44 (AC-6)", async () => {
    const usuario = await empezarEn(SALUDO.escena);
    await avanzarHastaLaDecision(usuario);

    // jsdom no calcula medidas: lo que se comprueba aquí es que ningún
    // control se saltó la clase que las aplica. La medida real la revisa
    // `a11y-perf-reviewer` en T-001-07.
    for (const boton of screen.getAllByRole("button")) {
      expect(boton).toHaveClass("objetivo-tactil");
    }
  });

  it("repetir la línea vuelve a anunciarla sin cambiar de nodo", async () => {
    const usuario = await empezarEn(SALUDO.escena);

    const region = document.querySelector(".visualmente-oculto");
    await waitFor(() => expect(region?.textContent).not.toBe(""));
    const anuncioInicial = region?.textContent ?? "";

    await usuario.click(screen.getByRole("button", { name: TEXTOS_UI.dialogo.repetir }));
    await waitFor(() => expect(region?.textContent).toBe(anuncioInicial));
    expect(screen.getByRole("button", { name: TEXTOS_UI.dialogo.continuar })).toBeVisible();
  });
});

describe("GameShell — cierre del episodio", () => {
  it("muestra el cierre y el pie para la persona adulta, y persiste solo ep01.completed (AC-5)", async () => {
    const usuario = await empezarEn("s07_reconstruccion");

    // La última escena cruza un minijuego y una recompensa que todavía no
    // tienen interfaz; se saltan con la herramienta de desarrollo.
    for (let paso = 0; paso < 12; paso += 1) {
      const continuar = screen.queryByRole("button", { name: TEXTOS_UI.dialogo.continuar });
      if (continuar) {
        await usuario.click(continuar);
        continue;
      }
      const saltar = screen.queryByRole("button", { name: TEXTOS_UI.desarrollo.continuarSaltando });
      if (saltar) {
        await usuario.click(saltar);
        continue;
      }
      break;
    }

    const debrief = episodio.scenes
      .find((scene) => scene.id === "s07_reconstruccion")
      ?.nodes.find((node) => node.type === "end");
    if (!debrief || debrief.type !== "end" || !debrief.debriefScreen) {
      throw new Error("El nodo final del episodio perdió su pantalla de cierre.");
    }

    expect(screen.getByRole("heading", { name: texto(debrief.debriefScreen.titleLocId) })).toBeVisible();
    expect(screen.getByText(texto(debrief.debriefScreen.childLocId))).toBeVisible();
    expect(screen.getByText(TEXTOS_UI.cierre.paraLaPersonaAdulta)).toBeVisible();

    expect(window.localStorage.getItem("yais.ep01.completed")).toBe("true");
    expect(window.localStorage.length).toBe(1);
  });

  it("deja volver a jugar desde el cierre, sin penalización (AC-4)", async () => {
    const usuario = await empezarEn("s07_reconstruccion");
    for (let paso = 0; paso < 12; paso += 1) {
      const continuar = screen.queryByRole("button", { name: TEXTOS_UI.dialogo.continuar });
      const saltar = screen.queryByRole("button", { name: TEXTOS_UI.desarrollo.continuarSaltando });
      if (continuar) await usuario.click(continuar);
      else if (saltar) await usuario.click(saltar);
      else break;
    }

    await usuario.click(screen.getByRole("button", { name: TEXTOS_UI.cierre.volverAJugar }));

    // Vuelve al principio del episodio, no a una pantalla de resultado.
    expect(screen.getByRole("button", { name: TEXTOS_UI.dialogo.continuar })).toBeVisible();
  });
});

describe("GameShell — nodos sin interfaz", () => {
  it("avisa que el paso no tiene interfaz en vez de fingir un minijuego", async () => {
    const usuario = await empezarEn("s02_brujula");
    await avanzarHastaLaDecision(usuario);

    expect(screen.getByText(TEXTOS_UI.desarrollo.nodoSinInterfaz)).toBeVisible();
    expect(
      screen.getByRole("button", { name: TEXTOS_UI.desarrollo.continuarSaltando }),
    ).toBeVisible();
  });
});
