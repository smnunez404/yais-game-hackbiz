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
| T-001-06 — Escena 3D con Capi y Tomi | hecho | `npm run verify` verde |
| T-001-07 — Verificación de extremo a extremo | pendiente | — |

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
- El contenido declara `reviewPolicy.blockProductionIfPending: true` y once
  marcas `review: "VALIDAR"`: diez nodos y una más dentro de la configuración
  del minijuego de `s02_brujula`, que se verá cuando exista SPEC-004. Nada de
  eso se aplica todavía: el único resguardo es el distintivo global.
- El material del debrief (`adultOnly: true`) se muestra en la misma pantalla
  proyectada que mira el curso. Es lo que pide SPEC-001, pero conviene
  confirmarlo con Arianna.
- La medida real de 44×44, el contraste en proyector y el comportamiento con
  lector de pantalla se revisan en T-001-07; los tests solo comprueban que
  ningún control se saltó la clase que aplica el objetivo táctil.

## T-001-06 — Escena 3D con Capi y Tomi

Hecho. `npm run verify` verde; 101 tests en 11 archivos. Capi y Tomi aparecen
desde sus GLB reales sobre la isla, encima del mismo diálogo 2D, que sigue
siendo la ruta accesible y la que manda.

**Cómo está armado**

- `scene/EscenaDelEpisodio.tsx` no importa Three. Comprueba WebGL y solo
  entonces carga `GameCanvas` con `import()`. Un equipo sin aceleración no
  descarga el motor 3D: el chunk `GameCanvas` pesa 973 kB (259 kB gzip) y el
  principal se queda en 353 kB (106 kB gzip), prácticamente lo mismo que antes
  de esta tarea.
- Un límite de error retira la escena si falla en marcha (contexto perdido, GLB
  roto) y la sesión continúa en 2D. Se comprobó sin querer: mientras el
  servidor de desarrollo tenía las dependencias sin optimizar, el `import()`
  falló, el límite hizo su trabajo y el episodio siguió jugándose.
- `scene/estado-de-escena.ts` es puro y traduce la vista del motor a quién está
  en escena y qué hace. Ahí vive la regla del hito: solo suben al escenario los
  personajes con GLB sincronizado (Capi y Tomi). Cuando habla Luna, Beto o
  Clara, el 3D se queda en reposo y quien identifica al personaje es el retrato
  2D del diálogo.
- `scene/useCharacterAnimation.ts` conduce el mixer a mano, como pide PLAN-001.
  Un gesto (`Wave`, `TalkGesture`) suena una vez y vuelve a `Idle` por el evento
  `finished`, no por un temporizador. Un estado sostenido (`Listen` mientras el
  niño decide) se mantiene en bucle.
- El bucle de render se apaga (`frameloop="demand"`) cuando la escena queda
  quieta, con un margen de 350 ms para que la mezcla de vuelta a `Idle`
  termine. Sin ese margen el personaje se congelaba a medio camino entre el
  gesto y el reposo; se detectó midiendo llamadas de dibujo en el navegador, no
  leyendo el código.
- Con `prefers-reduced-motion` no se reproduce ninguna animación ni caminata:
  el personaje aparece colocado en su sitio, en el primer cuadro de `Idle`, y
  el bucle no se enciende (AC-7). Comprobado en un navegador real, ver abajo.
- El retrato 2D se mantiene aunque el 3D funcione: es lo que dice quién habla, y
  es el único indicio cuando quien habla no tiene modelo.

**Comprobado en el navegador**

- Capi y Tomi se ven juntos en `s04_tomi`, cada uno desde su GLB.
- Recorriendo las siete escenas solo se descargan tres GLB: `island_large`,
  `mascot` (Capi) y `child_explorer` (Tomi). Luna, Clara y Beto no se descargan
  nunca, que es el criterio explícito de la tarea.
- Con la escena quieta, cero llamadas de dibujo en 1,5 s.

**Dependencias**

`three@0.186.0`, `@react-three/fiber@9.7.0`, `@react-three/drei@10.7.8` y
`@types/three`. React baja de 19.3.0 a 19.2.8 porque `@react-three/fiber@9.7.0`
declara `react: ">=19 <19.3"`: no es un descuido, es la restricción de la
librería. Si más adelante se quiere React 19.3, hay que esperar a que R3F lo
soporte.

**Lo que no está medido y no se promete**

- Ni un solo cuadro por segundo. La ventana del navegador de pruebas estaba en
  segundo plano y el navegador limita el bucle de animación en ese estado, así
  que cualquier medida de fluidez de esta sesión sería falsa. Se mide en
  T-001-07, con la ventana al frente y en la laptop real.
- El GLB de Capi pesa 16,4 MB y tiene 226 374 triángulos; el de Tomi, 2 MB. Es
  lo que hay hoy en `assets/production/animated/v001` y no se toca desde aquí
  (AGENTS.md). Con la conexión de una escuela eso es mucho: el episodio se puede
  jugar mientras baja —la escena entra cuando llega—, pero conviene medirlo
  antes de la demo.
- Las 61 intenciones del guion siguen cayendo en cinco clips. La escena usa el
  mapa de `shared/animation-intents.ts` y avisa en desarrollo cuando una
  intención cae en un `fallback`; varias escenas se ven aproximadas y eso no se
  disimula (`docs/MAPA-ANIMACIONES.md`).
- La vuelta a `Idle` deja al personaje congelado cuando la escena está quieta.
  Es deliberado, por el presupuesto de CPU de una laptop vieja, y está en un
  solo lugar por si en el aula se lee como que el juego se colgó.

### Revisión visual y movimiento (segunda pasada de T-001-06)

Tras comparar con las láminas de `assets/concepts` y con la revisión de
content-guardian, la escena cambió de forma:

- **La isla está poblada**: sendero, puente, banco, dos árboles, palmera, faro
  y tres nubes, todo del mundo mínimo ya sincronizado. Las posiciones no se
  adivinaron: se midió la caja contenedora real de cada GLB (la isla mide
  6,27 × 6,30 con el césped a y≈0,2; el faro, 4,65 de alto).
- **El lienzo ocupa la parte alta y el diálogo se apoya encima**, como en
  `isla-acuerdos-core-screens.png`. El panel sigue siendo opaco: el texto
  conserva sus 16,20:1 de contraste medido, no se apoya en transparencias.
- **Las decisiones son tarjetas** con el icono grande sobre un disco de color
  y el texto debajo, en vez de filas de lista. Los iconos siguen siendo SVG
  dibujados en código: las láminas son brief de arte y no se recortan
  (`assets/concepts/ASSET-INVENTORY.md`). El disco de color es decoración; la
  silueta, el texto y el orden dicen lo mismo sin él.
- **Los personajes caminan.** Al empezar cada escena entran desde el sendero
  hasta su sitio en vez de aparecer de golpe, y se desplazan al claro cuando el
  guion pide locomoción (las cinco intenciones mapeadas como `Locomotion`).
  Caminar manda sobre gesticular: mientras se desplaza suena `Walk` —o `Roll`
  en el caso de Luna— y el gesto se retoma al llegar. No hay control del
  jugador: la exploración libre es otra spec (SPEC-004, `free_look`).

**Medido en el navegador, con el movimiento activo**

- Escena asentada: **cero** llamadas de dibujo en 1,5 s.
- Al cambiar de escena: **1665** llamadas en 700 ms, mientras los dos
  personajes entran caminando; luego vuelve a cero.

**Hallazgo del entorno de prueba**

El navegador donde se probó tiene `prefers-reduced-motion: reduce` activo. Eso
verificó AC-7 en un navegador real —sin caminata, sin clips, bucle apagado, el
personaje colocado directamente en su sitio— y explica por qué las primeras
capturas se veían estáticas. Para ver el movimiento hubo que desactivar esa
preferencia en la página.

**Correcciones de la revisión de content-guardian**

- `resolveAnimationClip` ahora **sí** advierte en desarrollo cuando una
  intención cae en un clip de relleno (punto 3 de T-001-06). Antes el doc lo
  daba por hecho y el código no lo hacía: 40 intenciones marcadas `fallback` se
  reproducían en silencio.
- `useGLTF` se llama con el decodificador Draco desactivado. Los GLB de hoy no
  lo usan, pero `scripts/optimize-glb.ps1` comprime con Draco por defecto, y si
  alguien lo usara antes de la demo el aula sin Internet se quedaría sin
  personajes pidiendo el decodificador a un CDN de Google.
- La escena solo recibe las variables de sesión de saludo. `insistedLuna`
  —que registra que alguien pasó por encima de un «no»— ya no llega ahí, así
  que ningún gesto puede depender de ella ni por descuido (Constitución III).
- El distintivo de borrador es `sticky`: con la escena y el diálogo, la página
  se desplaza en una laptop de 768 px y AC-10 pide que esté en pantalla.

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
