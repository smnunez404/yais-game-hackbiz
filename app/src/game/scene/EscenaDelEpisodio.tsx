// Puerta de entrada a la escena 3D (T-001-06).
//
// Este archivo NO importa Three ni React Three Fiber. Decide si la escena
// puede existir y, solo entonces, carga el lienzo con `import()`. Tres
// puertas, en orden:
//
// 1. ¿Hay WebGL? Si no, no se descarga nada del motor 3D (AC-8).
// 2. ¿Se pudo cargar el módulo? Si falla, la app sigue en 2D.
// 3. ¿Se rompió la escena en tiempo de ejecución? Hay dos formas distintas y
//    cada una necesita su mecanismo: un GLB corrupto lanza y lo atrapa el
//    límite de error; perder el contexto WebGL —una laptop vieja proyectando
//    durante horas— no lanza nada y llega por el evento
//    `webglcontextlost`. Las dos retiran la escena y dejan el 2D funcionando.
//
// En los tres casos el episodio se juega igual: el diálogo, las decisiones y
// el cierre viven en la interfaz 2D, que nunca depende de esto. La escena es
// una mejora progresiva, no la experiencia.

import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useMemo,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";

import type { RuntimeState, RuntimeView } from "../../engine";
import { estadoDeEscenaDesde } from "./estado-de-escena";
import { prefiereMenosMovimiento, soportaWebGL } from "./soporte-webgl";

const GameCanvas = lazy(() => import("./GameCanvas"));

interface EscenaDelEpisodioProps {
  readonly vista: RuntimeView;
  readonly estado: RuntimeState;
}

export function EscenaDelEpisodio({ vista, estado }: EscenaDelEpisodioProps) {
  // Ambas preguntas se hacen una vez por montaje: no cambian a mitad de
  // partida y preguntarlas en cada render solo gastaría trabajo.
  const hayWebGL = useMemo(() => soportaWebGL(), []);
  const menosMovimiento = useMemo(() => prefiereMenosMovimiento(), []);

  const escena = useMemo(() => estadoDeEscenaDesde(vista, estado), [vista, estado]);

  // Perder el contexto WebGL no lanza una excepción, así que el límite de
  // error no lo vería: se retira la escena desde aquí y no se vuelve a montar
  // en esta sesión.
  const [contextoPerdido, setContextoPerdido] = useState(false);
  const alPerderContexto = useCallback(() => {
    setContextoPerdido(true);
    if (import.meta.env.DEV) {
      console.warn("[escena] se perdió el contexto WebGL; la sesión continúa en 2D.");
    }
  }, []);

  if (!hayWebGL || contextoPerdido || escena.personajes.length === 0) return null;

  return (
    // El envoltorio lo pone esta capa y no `GameCanvas`: así el hueco de la
    // escena existe desde el primer render y la página no da un salto cuando
    // termina de llegar el lienzo. Si el límite de error lo retira, el
    // envoltorio se va con él y la interfaz 2D recupera su sitio sin dejar un
    // vacío (el estilo del diálogo se apoya en que `.escena` esté o no esté).
    <LimiteDeEscena>
      <div className="escena" aria-hidden="true">
        {/* Sin `fallback` visible: mientras el GLB baja, el episodio ya se
            puede jugar en 2D y un cartel de carga solo robaría atención. */}
        <Suspense fallback={null}>
          <GameCanvas
            escena={escena}
            menosMovimiento={menosMovimiento}
            alPerderContexto={alPerderContexto}
          />
        </Suspense>
      </div>
    </LimiteDeEscena>
  );
}

interface LimiteDeEscenaProps {
  readonly children: ReactNode;
}

interface LimiteDeEscenaState {
  readonly rota: boolean;
}

/**
 * Límite de error de la escena. Si el 3D falla —WebGL perdido, GLB que no
 * carga, memoria—, se retira en silencio y la sesión continúa en 2D (AC-8).
 * El error se registra solo en desarrollo: nunca se muestra en pantalla ni
 * sale del dispositivo (AC-9).
 */
class LimiteDeEscena extends Component<LimiteDeEscenaProps, LimiteDeEscenaState> {
  override state: LimiteDeEscenaState = { rota: false };

  static getDerivedStateFromError(): LimiteDeEscenaState {
    return { rota: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.warn("[escena] la escena 3D falló y se continúa en 2D:", error, info.componentStack);
    }
  }

  override render(): ReactNode {
    if (this.state.rota) return null;
    return this.props.children;
  }
}
