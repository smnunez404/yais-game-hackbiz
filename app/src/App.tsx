// Shell mínimo del scaffold (T-001-01). No contiene narrativa ni contenido
// dirigido a niños: el episodio se lee desde `content/` en tareas posteriores.

// Constitución IV y AC-10: mientras el contenido no esté aprobado, el distintivo
// se muestra siempre, en cualquier pantalla.
const DISTINTIVO_BORRADOR = "Borrador no validado";

export default function App() {
  return (
    <div className="shell">
      <header className="shell__encabezado">
        <p className="distintivo-borrador">{DISTINTIVO_BORRADOR}</p>
        <h1 className="shell__titulo">La Isla de los Acuerdos</h1>
      </header>

      <main className="shell__principal">
        <h2 className="shell__subtitulo">Andamiaje técnico</h2>
        <p>
          Esta pantalla solo comprueba que la aplicación compila, se verifica y se
          sirve. Todavía no hay episodio jugable: el motor, el diálogo accesible y
          la escena 3D se incorporan en las tareas siguientes.
        </p>
      </main>
    </div>
  );
}
