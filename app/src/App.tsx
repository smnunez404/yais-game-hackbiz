// Raíz de la aplicación (T-001-05).
//
// No contiene narrativa ni lógica: el episodio, su validación y el estado
// viven bajo `src/game` y `src/engine`. Este archivo existe para que el
// punto de montaje (`main.tsx`) no conozca la estructura del juego.

import GameShell from "./game/GameShell";

export default function App() {
  return <GameShell />;
}
