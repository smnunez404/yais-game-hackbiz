# Estado de implementación — SPEC-001

Bitácora de lo que existe de verdad en el repositorio. Se actualiza al cerrar cada
tarea `T-001-*`. Constitución IX: aquí no se declara terminado lo que no está
verificado, ni se llama producto a un prototipo.

Última actualización: 2026-09-17.

## Tablero

| Tarea | Estado | Compuerta |
| --- | --- | --- |
| T-001-01 — Scaffold y compuerta de calidad | hecho | `npm run verify` verde |
| T-001-02 — Sincroniza y registra los assets reales | hecho | `npm run verify` verde |
| T-001-03 — Valida el episodio completo | hecho | `npm run verify` verde |
| T-001-04 — Motor puro y persistencia mínima | hecho | `npm run verify` verde |
| T-001-05 — Experiencia 2D accesible | hecho | `npm run verify` verde |
| T-001-06 — Escena 3D con Capi y Tomi | parcial | — |
| T-001-07 — Verificación de extremo a extremo | pendiente | — |

«Parcial» es literal: de T-001-06 existe solo el mapa de intenciones de
animación. No hay escena 3D todavía.

## T-001-01 — Scaffold y compuerta de calidad

Hecho. `npm run verify` ejecuta, en orden, typecheck, lint, tests, `check:safety`
y build, y termina en verde.

**Decisiones**

- Workspace npm en la raíz; la app vive en `app/`.
- TypeScript 5.9.3 y no 7.0.2: `typescript-eslint@8.70` declara `typescript <6.1.0`.
  Se prefirió lint verde sobre versión nueva.
- `jsdom` fijado en 29.1.1 porque jsdom 30 exige Node `^22.22.2` y la máquina de
  desarrollo tiene Node 22.14.0.
- Versiones exactas (`save-exact=true` en `.npmrc`) y lockfile versionado.
- Sin Tailwind, sin backend y sin las dependencias 3D todavía: cada una entra con
  la tarea que la usa.

**Mecanismos de la regla «el motor es TypeScript puro»** (Constitución VIII)

La regla no depende de revisión manual. La sostienen tres compuertas independientes:

1. `app/tsconfig.engine.json` — typechea `src/engine/**` sin `lib: DOM`, así que
   `window`, `document` o `localStorage` rompen el typecheck.
2. `app/eslint.config.js` — bloque `src/engine/**` con `no-restricted-imports`
   (React, `react-dom`, Three, `@react-three/*`, `zustand`) y
   `no-restricted-globals` (APIs de navegador y red).
3. `scripts/check-safety.mjs` — reglas `engine-puro` y `engine-sin-dom`,
   verificación independiente del toolchain.

Probado con una prueba negativa: un archivo temporal en `engine/` que importaba
React y usaba `window.localStorage` produjo dos violaciones y salida 1.

**Comprobado en navegador**

Distintivo `Borrador no validado` visible, cero errores de consola, cero
peticiones fuera de `localhost`, y `localStorage`, `sessionStorage` y cookies
vacíos.

## T-001-04 — Motor puro y persistencia mínima

Hecho, en dos commits: `progress.ts` (persistencia) y `runtime.ts` (navegación).
`npm run verify` verde; 68 tests en 7 archivos.

**Qué presenta el runtime**

`line`, `choice`, `sceneChange` y `end`. Los `sceneChange` nunca se muestran:
se cruzan durante la transición y aplican el `onEnter` de la escena destino.
`minigame`, `branch` y `reward` están validados por el esquema pero todavía no
tienen interfaz: se presentan como vista `unimplemented` con su diagnóstico.

`saltarNodoNoImplementado()` es una salida **de desarrollo** para poder
recorrer el episodio de punta a punta antes de que existan los minijuegos;
sigue la continuación declarada del nodo (`next`, o `else` en `branch`). No
significa que el minijuego esté hecho.

**Decisiones**

- Una sola allowlist de persistencia en todo el proyecto. `FLAGS_PERSISTIBLES`
  vive en `progress.ts`, que además deriva de ella el tipo que `writeFlag`
  acepta; `schema.ts` la reexporta como `PERSISTENCE_ALLOWLIST` y el runtime la
  consulta con `esFlagDePersistencia`. Antes había dos literales que podían
  separarse en silencio.
- El runtime nunca lanza. Una llamada fuera de lugar (elegir sobre una línea),
  una opción que el modo de edad no muestra o un contenido con la navegación
  rota devuelven `false` o una vista `error` con diagnóstico legible, no una
  excepción ni una pantalla en blanco (AC-1).
- Los diagnósticos salen por un callback inyectado (`onDiagnostic`). El motor no
  puede mirar el entorno —no tiene DOM ni `import.meta.env`—, así que quien lo
  construye decide si los muestra en desarrollo o los descarta.
- Tope de 100 saltos encadenados por transición. El contenido válido no se
  acerca; existe para que un ciclo de `sceneChange` introducido más adelante dé
  un diagnóstico en vez de colgar el navegador. Hay un test con un episodio
  cíclico que el esquema acepta (la validación referencial no detecta ciclos).
- `suscribir()` para que la UI de T-001-05 pueda re-renderizar sin que el motor
  sepa nada de React.
- `startSceneId` e `irAEscena()` existen para el selector de escena de
  desarrollo de T-001-05: el saludo de Capi (s03) queda detrás de dos
  minijuegos en el recorrido normal.

**Privacidad, comprobada por test (AC-5, AC-9, Constitución I y V)**

- Las cuatro variables de sesión (`greetCapi`, `greetTomi`, `greetBeto`,
  `insistedLuna`) viven en memoria y se van al recargar. `sessionVars` se expone
  congelada: modificarla desde fuera lanza y no altera el estado del motor.
- Tras recorrer el episodio completo, el almacenamiento contiene exactamente
  una clave: `yais.ep01.completed=true`. Ningún valor de saludo, ningún id de
  escena, ninguna elección.
- Los otros seis flags con `persist: true` del contenido se ignoran con
  diagnóstico, igual que `onEnter.setProgress` (que guardaría la última escena).
- Reintento ilimitado y sin costo: no hay contador de intentos, ni estado de
  acierto o error, ni transición que se bloquee por haber pasado antes. Un test
  cambia de saludo cinco veces seguidas y comprueba que lo único que queda es la
  última elección.
- Filtrado por edad (AC-3): en `6-8` la decisión del saludo de Capi ofrece cinco
  opciones y en `9-12` seis (`fist_bump`). Pedir una opción que el modo no
  muestra no cambia el estado.

**Lo que este motor todavía no hace**

- No evalúa las condiciones de `branch`: el guion las necesita para la escena de
  Don Beto (s06), que hoy cae siempre a la rama `else`.
- No ejecuta ningún minijuego.
- No existe interfaz: nada de esto se ha visto en pantalla todavía (T-001-05).

## T-001-05 — Experiencia 2D accesible

Hecho. `npm run verify` verde; 84 tests en 8 archivos. La ruta 2D es la
experiencia base, no un placeholder del 3D: hoy es la única que existe y es la
que queda si WebGL falla (AC-8).

**Qué se puede hacer en pantalla**

Elegir modo de edad, empezar, avanzar líneas, repetir una línea, elegir un
saludo, volver a elegirlo cuantas veces se quiera, parar en cualquier momento
y llegar al cierre con el pie de debrief para la persona adulta.

**Decisiones**

- El contenido se importa como módulo (`shared/episode.ts`) y se valida una vez
  al cargar. La demo no hace ninguna petición de red: comprobado en el
  navegador, cero recursos fuera de `localhost`.
- Ningún texto que un niño lee está escrito en código. La pregunta que encabeza
  una decisión es la línea del guion que la precede (`s03_n002`, «¿Cómo quieres
  saludarme?»), que el motor entrega en `ChoiceView.precedingLine` y la interfaz
  mantiene en pantalla mientras se elige. La primera versión ponía un rótulo
  propio ahí y la revisión de content-guardian lo bloqueó: es contenido infantil
  fuera de `content/` (Constitución IV).
- `game/ui/textos-ui.ts` concentra los rótulos de interfaz que el contenido no
  declara («Continuar», «Volver a jugar»). Cuando el contenido pase la revisión
  de Arianna, se mueven a `localization` de una vez.
- El foco viaja al control principal de cada pantalla (`data-principal`) en cada
  transición: con teclado basta Enter para recorrer el saludo entero.
- La línea vive en una región `aria-live`; «Repetir lo que dijo» la vacía y la
  vuelve a llenar para que un lector de pantalla la relea. Todavía no hay audio
  locutado (SPEC-001 lo deja fuera), así que eso es literalmente lo que
  «repetir» puede hacer hoy; en T-001-06 volverá a disparar el gesto.
- Cero animaciones y cero transiciones en el 2D: AC-7 se cumple por
  construcción, no por una excepción de `prefers-reduced-motion`.
- Selector de escena y botón de saltar nodos sin interfaz existen solo con
  `import.meta.env.DEV`. Comprobado sobre el bundle de producción: sus clases y
  los diagnósticos con rutas del JSON no aparecen en `dist/`.

**Comprobado en el navegador (Chromium, laptop)**

- El episodio corre de punta a punta usando el selector de escena; el saludo de
  Capi ofrece cinco opciones en 6-8 y seis en 9-12.
- Al terminar, `localStorage` contiene exactamente `yais.ep01.completed=true`;
  `sessionStorage` y las cookies quedan vacías, también a mitad de episodio.
- Cero peticiones fuera de `localhost`. El poster de Capi se sirve local.
- A 375 px la retícula pasa a una columna, sin desbordes.
- Bundle: 349 kB (104 kB gzip) frente a los 191 kB (60 kB) de solo React, en un
  único chunk sin code-splitting. Desglose medido por `a11y-perf-reviewer`:
  `zod` completo 110 kB (27 kB gzip) y el JSON del episodio 42 kB (9 kB gzip).
  Con `zod/mini` el validador baja a 19 kB (5.5 kB gzip); validarlo en build y
  publicar el JSON ya validado lo quitaría del navegador por completo. Medido,
  no optimizado todavía.

**Revisión de accesibilidad y rendimiento (a11y-perf-reviewer)**

Corregido aquí:

- Bloqueante de contraste: el borde en reposo de una opción daba 1.50:1 contra
  el panel blanco que la contiene (mínimo 3:1 para el límite de un control,
  WCAG 1.4.11). Ahora usa `--color-acento`, 7.80:1, y el hover cambia el fondo
  en vez del borde.
- Al quitar el rótulo inventado de las decisiones, la pantalla se quedó sin
  ningún encabezado y quien navega con la tecla H perdía el tramo central del
  episodio. La pregunta del guion es ahora además el `h2`: se marca el texto
  que ya estaba, sin escribir texto nuevo.
- La etiqueta «Solo desarrollo» del aviso de nodo sin interfaz ya no se
  renderiza fuera de desarrollo: proyectarla en un aula sería jerga interna en
  pantalla.

Pendiente, medido pero no resuelto:

- Los retratos pesan 1.3 MB entre los dos y se muestran a 128 px:
  `capi/poster.png` es 768×864 (820 kB) y `tomi/poster.png` 640×768 (540 kB).
  Reexportarlos a ~320 px ahorra más que todo el aumento de JS, pero toca la
  tubería de assets aprobada y va en su propia tarea.
- Riesgo verificable y no confirmado: en la primera línea de cada escena el
  foco se mueve al botón antes de que la región `aria-live` se llene, así que
  un lector de pantalla podría decir «Continuar, botón» antes que la línea del
  personaje. Hace falta NVDA/JAWS/VoiceOver reales; jsdom no simula colas de
  voz.
- Cuando entre Three.js en T-001-06 debe ir en un chunk aparte cargado bajo
  demanda, o el fallback 2D pagará su peso aunque el proyector nunca vea el
  Canvas.
- Sin medir todavía: 44×44 en píxeles reales, zoom de solo texto al 200 %,
  legibilidad proyectada y tiempo de carga en la conexión real de una escuela.

**Lo que no hace y hay que decidir**

- En un build de producción el episodio se detiene en el minijuego de
  `s02_brujula`: el recorrido obligatorio del contenido pasa por cuatro
  minijuegos que SPEC-001 deja fuera del alcance (van en SPEC-004). Hoy el
  saludo de Capi y el nodo `end` solo se alcanzan en `npm run dev` con el
  selector de escena. Es una contradicción entre el contenido y el alcance de la
  spec, no un olvido de implementación, y la decisión es del equipo: demostrar
  en modo desarrollo, hacer opcionales los minijuegos en el contenido, o
  adelantar SPEC-004.
- El contenido declara `reviewPolicy.blockProductionIfPending: true` y diez
  nodos con `review: "VALIDAR"`. Nada de eso se aplica todavía: el único
  resguardo es el distintivo global.
- El material del debrief (`adultOnly: true`) se muestra en la misma pantalla
  proyectada que mira el curso. Es lo que pide SPEC-001, pero conviene
  confirmarlo con Arianna.
- La medida real de 44×44, el contraste en proyector y el comportamiento con
  lector de pantalla se revisan en T-001-07; los tests solo comprueban que
  ningún control se saltó la clase que aplica el objetivo táctil.

## Pendientes y riesgos abiertos

- Assets versionados en git normal (222 MB). Cada versión futura de un GLB de
  16 MB engorda el historial de forma permanente. Decisión tomada por el equipo.
- Lint sin reglas `type-aware`: el rigor de tipos lo cubre `tsc` estricto.
- Bundle base de 220 kB (69 kB gzip) que es solo React. Es la línea base contra la
  que se medirán los GLB.
- Preguntas abiertas de SPEC-001 sin respuesta: escena de Don Beto (decide
  Arianna) y si el distintivo de borrador incomoda en la demo (decide el equipo).
- Nada de esto está validado con niños, ni pedagógicamente, ni en móvil.
- Guardarraíl para tareas futuras (revisión de content-guardian, T-001-04): la
  variable de sesión `insistedLuna` registra que el jugador pasó por encima de
  un «no». Hoy vive en memoria, se borra al cerrar el episodio y ningún nodo la
  lee. No debe persistirse, ni mostrarse al docente, ni usarse para cambiar
  cómo el juego trata a quien juega (Constitución III).
- Cuando se implemente `branch`, la rama verdadera de `s06_b001` lleva a
  `s06_n003`, marcada `[VALIDAR]`: es el punto más delicado del guion y decide
  Arianna, no el equipo de desarrollo. Mientras tanto el runtime cae siempre a
  la rama `else`, que es la que no insiste.
- Los `setFlags` del nodo `reward` (`s07_rw001`) todavía no se ejecutan. Cuando
  se implementen deben pasar por la misma función que el resto
  (`aplicarFlags`), o la allowlist deja de ser el único paso hacia el
  almacenamiento.
