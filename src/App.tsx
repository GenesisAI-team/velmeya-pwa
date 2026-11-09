import './styles/global.css'

const EMULADORES = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'

export default function App() {
  return (
    <div className="app">
      <header className="cabecera">
        <h1 className="marca">Velmeya</h1>
        <nav aria-label="Principal">
          <a className="navEnlace" href="#horarios">
            Horarios
          </a>
          <a className="navEnlace" href="#reservas">
            Reservas
          </a>
        </nav>
      </header>

      <main className="principal">
        <section className="hero" aria-label="Estado del backend">
          <p className="heroTitulo">Reserva tu próxima clase de yoga</p>
          <p className="heroTexto">
            Consulta horarios, reserva plaza y gestiona tus reservas desde el
            móvil o el escritorio.
          </p>
          <p className="avisoEntorno" role="status">
            {EMULADORES
              ? 'Modo local: emuladores de Firebase activos (sin datos reales).'
              : 'Modo local sin backend: mantenemos la interfaz con datos estáticos.'}
          </p>
        </section>

        <section id="horarios" className="panel" aria-labelledby="tituloHorarios">
          <h2 id="tituloHorarios">Horarios</h2>
          <p className="estadoVacio">
            Pronto podrás ver aquí la oferta semanal de clases del estudio.
          </p>
        </section>

        <section id="reservas" className="panel" aria-labelledby="tituloReservas">
          <h2 id="tituloReservas">Reservas</h2>
          <p className="estadoVacio">
            Inicia sesión para ver y gestionar tus reservas.
          </p>
        </section>
      </main>

      <footer className="pie">
        <p>Velmeya PWA · v0.1.0 · bootstrap GEN-35</p>
      </footer>
    </div>
  )
}
