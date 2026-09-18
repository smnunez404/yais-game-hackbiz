# QA del vertical slice — SPEC-001 (T-001-07)

Fecha: 2026-09-17.

Qué es este documento: el registro de qué se probó, cómo, y qué salió. Qué no
es: un certificado de que el prototipo está listo para un aula. No hay ni una
sola sesión con niños detrás de estas líneas, ni una medida tomada en la laptop
o el proyector reales. Constitución IX: lo que no se midió se dice que no se
midió.

## Cómo se probó

- Navegador Chromium del panel de desarrollo, sobre `npm run dev`.
- Suite automática: `npm run verify` (typecheck, lint, 109 tests, `check:safety`
  y build).
- Dos recorridos completos del episodio, uno por modo de edad, hasta la
  pantalla de cierre.
- Inspección directa de almacenamiento, cookies y peticiones de red desde la
  propia página.

Hallazgo del entorno que conviene saber al leer el resto: **el navegador de
pruebas tiene `prefers-reduced-motion: reduce` activo**. Eso verificó AC-7 en un
navegador real sin proponérselo, y obligó a desactivar esa preferencia dentro de
la página para poder observar el movimiento.

## Criterios de aceptación

| Criterio | Resultado | Cómo se comprobó |
| --- | --- | --- |
| AC-1 — error de desarrollo legible si el JSON no valida | cumple | Tests del esquema con JSON corrupto y referencias rotas; el runtime devuelve diagnóstico en vez de lanzar, y un episodio con ciclo de escenas termina en un aviso, no en un cuelgue. |
| AC-2 — avanzar sin sonido de error, sin puntaje, sin bloquear | cumple | Recorridos completos: no existe estado de acierto ni de error en el motor ni en la interfaz; `check:safety` lo vigila por nombre. |
| AC-3 — ocultar lo que no es del modo de edad | cumple | El saludo de Capi ofrece cinco opciones en 6-8 y seis en 9-12; las preguntas del debrief se filtran igual. Elegir una opción que el modo no muestra no cambia el estado. |
| AC-4 — reintentar sin penalización | cumple | Cambiar de saludo cinco veces seguidas deja exactamente la última elección y ninguna marca de intento. Desde el cierre se vuelve a jugar. |
| AC-5 — cierre con acuerdo del día y solo `ep01.completed` | cumple | Al terminar, `localStorage` contiene una sola clave, `yais.ep01.completed=true`; `sessionStorage` y cookies vacíos, también a mitad de partida. |
| AC-6 — un puntero y objetivos de 44×44 | parcial | Todo control lleva la clase que aplica el mínimo y un test comprueba que ninguno se la saltó. **La medida en píxeles reales no se tomó**: jsdom no calcula diseño. |
| AC-7 — sin animaciones con `prefers-reduced-motion` | cumple | Comprobado en navegador real: sin caminata, sin clips, el personaje colocado en su sitio y el bucle de render apagado. En 2D no hay ninguna animación que apagar. |
| AC-8 — caer a 2D sin WebGL | cumple | Sin WebGL no se descarga ni el motor 3D ni un GLB. Además ocurrió de verdad: con el servidor de desarrollo en mal estado, el `import()` de la escena falló y el episodio siguió jugándose en 2D. |
| AC-9 — ninguna petición con datos del jugador | cumple | Cero peticiones fuera de `localhost` en los dos recorridos. El contenido viaja en el paquete y los diagnósticos se quedan en consola, solo en desarrollo. |
| AC-10 — distintivo de borrador visible | cumple | Está en las cuatro pantallas, sin prop que lo apague, y es `sticky` para que no se escape con el scroll. |

## Medidas tomadas

| Qué | Valor |
| --- | --- |
| Recorrido 9-12, escritorio | 67 pasos hasta el cierre |
| Recorrido 6-8, 375 px de ancho | 66 pasos hasta el cierre, **cero** desbordes horizontales |
| Almacenamiento al terminar | `yais.ep01.completed=true`, y nada más |
| Peticiones fuera de `localhost` | 0 |
| GLB descargados en todo el episodio | 3: isla, Capi y Tomi. Luna, Clara y Beto nunca |
| Paquete principal | 353 kB (106 kB gzip) |
| Chunk de la escena 3D | 974 kB (260 kB gzip), solo si hay WebGL |
| Bucle de render, escena asentada | 0 llamadas de dibujo en 1,5 s, también con dos personajes |
| Bucle de render, cambio de escena | 1665 llamadas en 700 ms mientras entran caminando |
| Presupuesto de arte del aula | 23,91 MiB de 25 MiB (95,6 %), con `mascot.glb` como el 65 % |

## Revisiones independientes

**content-guardian** — tres pasadas. Aprobó el motor sin bloqueantes. Rechazó
la primera versión de la interfaz por dos textos infantiles escritos en código
(corregidos: la pregunta de cada decisión es ahora la línea del guion). Rechazó
el slice completo porque la bitácora daba por hecho un aviso de animación que el
código no emitía; se implementó el aviso en vez de rebajar el texto. Sin
bloqueantes abiertos.

**a11y-perf-reviewer** — dos pasadas. Accesibilidad: **pasa**, tras corregir el
contraste del borde de las tarjetas (1,50:1, por debajo del mínimo de 3:1) y
devolverle un encabezado a la pantalla de decisión. Rendimiento: **no pasa**, y
lo que queda no es de código:

- El presupuesto de arte está al 95,6 % y `mascot.glb` son 16,4 MB y 226 374
  triángulos para un personaje que en pantalla mide 288 px de alto. Comprimir y
  decimar ese modelo es la palanca grande, y es trabajo de arte con versión
  nueva: no se sobrescribe la fuente (AGENTS.md).
- Los retratos 2D pesan 1,3 MB entre los dos y se muestran a 128 px.

## Lo que falta medir, y necesita personas o el equipo real

- Cuadros por segundo en la laptop y el proyector del aula, con la ventana al
  frente. Ninguna medida de esta sesión sirve: el navegador limita el bucle de
  animación cuando su ventana está detrás.
- Lector de pantalla real (NVDA, JAWS, VoiceOver). Hay un riesgo concreto
  identificado y sin confirmar: en la primera línea de cada escena el foco se
  mueve al botón antes de que se llene la región que anuncia la línea, así que
  podría oírse «Continuar, botón» antes que lo que dice el personaje.
- Objetivos táctiles medidos en píxeles sobre el dispositivo real.
- Zoom de solo texto al 200 %, con la escena 3D ocupando su franja.
- Descarga con la conexión real de una escuela: cuánto tarda en aparecer el
  primer personaje y si el «pop-in» se percibe como fallo.
- Memoria de vídeo tras una jornada completa y pérdida de contexto WebGL por
  sobrecalentamiento.
- Legibilidad proyectada a varios metros.
- **Nada de esto se ha probado con niñas y niños, ni pedagógicamente.**

## Decisiones abiertas que no son técnicas

1. **En un build de producción el episodio se detiene en el minijuego de
   `s02_brujula`.** El recorrido obligatorio del contenido pasa por cuatro
   minijuegos que SPEC-001 deja fuera de alcance. Hoy el saludo y el cierre solo
   se alcanzan en desarrollo con el selector de escena. Decide el equipo:
   demostrar en modo desarrollo, hacer opcionales los minijuegos en el
   contenido, o adelantar SPEC-004.
2. **`reviewPolicy.blockProductionIfPending: true` no está implementado** y hay
   once marcas `review: "VALIDAR"` en el contenido. El único resguardo es el
   distintivo global.
3. **El material del debrief (`adultOnly`) se proyecta** en la misma pantalla
   que mira el curso. Es lo que pide SPEC-001; conviene confirmarlo.
4. **Cuando un niño elige «hoy no»**, el personaje se queda en reposo, mientras
   que cualquier otro saludo recibe un gesto. Ejercer el límite es la única
   opción sin respuesta corporal. Es juicio clínico, no de implementación.
5. **La escena de Don Beto** sigue sin decidirse (pregunta abierta de la spec) y
   hoy es inalcanzable porque las ramas condicionales aún no se evalúan.

## Veredicto

El vertical slice cumple los diez criterios de aceptación en lo que puede
comprobarse sin hardware de aula ni personas, y las dos revisiones
independientes quedan sin bloqueantes de código. **No está listo para llevarlo a
un aula**: falta la aprobación de contenido de Arianna, falta medir en el equipo
real y falta decidir los cinco puntos de arriba. Es lo que se lleva a revisión
humana, que es exactamente lo que T-001-07 pide.
