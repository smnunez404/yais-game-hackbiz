// Textos de interfaz (T-001-05).
//
// Aquí viven SOLO los rótulos de la interfaz que el contenido no declara:
// botones de navegación, encabezados de pantalla y avisos de desarrollo. Todo
// lo que es narrativa —líneas, opciones de saludo, cierre, preguntas del
// debrief— se lee de `localization` en `content/episodes/ep01-saludo.json` y
// no puede escribirse aquí (AGENTS.md).
//
// Están centralizados en un módulo, y no sueltos por los componentes, por la
// misma razón que las rutas de arte: cuando el contenido pase la revisión de
// Arianna, estos rótulos se moverán a `localization` de una sola vez y sin
// buscarlos por el árbol (Constitución IV).

export const TEXTOS_UI = {
  /** Distintivo obligatorio mientras el contenido no esté aprobado (AC-10). */
  distintivoBorrador: "Borrador no validado",

  inicio: {
    subtitulo: "Vertical slice del Episodio 1",
    prologo:
      "Prototipo para revisión en laptop o proyector. El contenido todavía no está validado con niñas y niños.",
    leyendaEdad: "¿Con qué grupo van a jugar?",
    edad68: "6 a 8 años",
    edad912: "9 a 12 años",
    empezar: "Empezar el episodio",
  },

  dialogo: {
    /** Región donde ocurre el diálogo, para quien navega por regiones. */
    regionEpisodio: "Episodio en curso",
    continuar: "Continuar",
    repetir: "Repetir lo que dijo",
    volverAlInicio: "Volver al inicio",
  },

  /**
   * Rótulos de los minijuegos. Son de interfaz, no narrativa: nombran lo que
   * hay que hacer, no lo que alguien dice. Todo lo demás —tarjetas,
   * respuestas, la reacción de Capi, el botón de parar— sale del contenido.
   * Cuando el contenido pase la revisión de Arianna, estos tres también
   * deberían mudarse a `localization`.
   */
  minijuegos: {
    chocar: "Chocar las manos",
    puente: "Arma el puente",
  },

  /** Controles de quien acompaña durante el juego. */
  adulto: {
    /* Rótulo propio y corto: usar aquí el mismo «Para la persona que
       acompaña» del cierre ponía el mismo texto en dos sitios con dos
       significados distintos. */
    grupoDeEdad: "Grupo de edad",
  },

  cierre: {
    paraLaPersonaAdulta: "Para la persona que acompaña",
    preguntas: "Preguntas para conversar",
    actividad: "Actividad",
    enFamilia: "En casa",
    volverAJugar: "Volver a jugar",
  },

  desarrollo: {
    /** Encabezado de todo lo que solo existe mientras se desarrolla. */
    etiqueta: "Solo desarrollo",
    selectorDeEscena: "Ir a una escena",
    /* Aviso técnico, no narrativa: se muestra igual dentro y fuera de
       desarrollo, porque una frase del mundo del juego («la isla...») sería
       contenido infantil escrito en código y tendría que validarla Arianna
       (revisión de content-guardian, T-001-05). Lo que sí cambia fuera de
       desarrollo es que no se muestran ni las rutas del JSON ni el botón de
       saltar. */
    nodoSinInterfaz: "Este paso del guion todavía no tiene interfaz.",
    continuarSaltando: "Saltar este paso (desarrollo)",
    errorDeContenido: "El contenido del episodio no se pudo cargar",
    errorDeNavegacion: "La navegación del episodio se detuvo",
  },
} as const;
