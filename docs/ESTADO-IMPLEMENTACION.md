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
| T-001-05 — Experiencia 2D accesible | parcial | — |
| T-001-06 — Escena 3D con Capi y Tomi | parcial | — |
| T-001-07 — Verificación de extremo a extremo | pendiente | — |

«Parcial» es literal: de T-001-05 existen solo la base visual (19 iconos SVG y
los tokens de color con contraste medido) y de T-001-06 solo el mapa de
intenciones de animación. No hay pantalla de juego ni escena 3D todavía.

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
