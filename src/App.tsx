import { useState } from 'react'
import './styles/global.css'
import type { PuertoAuth, RepositorioClases } from './domain/puertos'
import type { Clase } from './domain/tipos'
import { ProveedorSesion } from './ui/ProveedorSesion'
import { useSesion } from './ui/sesion'
import { useClases } from './ui/useClases'
import { FormularioInicioSesion } from './ui/FormularioInicioSesion'
import { ListaClases } from './ui/ListaClases'
import { DetalleClase } from './ui/DetalleClase'

const EMULADORES = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'

export interface PropiedadesApp {
  puertoAuth: PuertoAuth
  repositorioClases: RepositorioClases
}

/** Sección de horarios: listado y detalle desde Firestore (emuladores). */
function SeccionHorarios({ repositorioClases }: { repositorioClases: RepositorioClases }) {
  const { clases, estado } = useClases(repositorioClases)
  const [seleccionada, setSeleccionada] = useState<Clase | null>(null)

  return (
    <section id="horarios" className="panel" aria-labelledby="tituloHorarios">
      <h2 id="tituloHorarios">Horarios</h2>
      {estado === 'cargando' && <p className="estadoCarga">Cargando horarios…</p>}
      {estado === 'error' && (
        <p className="avisoError" role="alert">
          No se pudieron cargar los horarios. Comprueba que los emuladores están en marcha.
        </p>
      )}
      {estado === 'vacio' && (
        <p className="estadoVacio">No hay clases programadas ahora mismo.</p>
      )}
      {estado === 'listado' && (
        <>
          <ListaClases clases={clases} onSeleccionar={setSeleccionada} />
          {seleccionada && (
            <DetalleClase clase={seleccionada} onCerrar={() => setSeleccionada(null)} />
          )}
        </>
      )}
    </section>
  )
}

/** Sección protegida de reservas: exige sesión iniciada (móvil y escritorio). */
function SeccionReservas() {
  const { estado, sesion, iniciando, errorSesion, iniciarSesion, cerrarSesion } = useSesion()

  return (
    <section id="reservas" className="panel" aria-labelledby="tituloReservas">
      <h2 id="tituloReservas">Reservas</h2>
      {estado === 'cargando' && <p className="estadoCarga">Comprobando sesión…</p>}
      {estado === 'anonima' && (
        <>
          <p className="estadoVacio">Inicia sesión para ver y gestionar tus reservas.</p>
          <FormularioInicioSesion
            iniciando={iniciando}
            errorSesion={errorSesion}
            onSubmit={(email, contrasena) => {
              void iniciarSesion(email, contrasena)
            }}
          />
        </>
      )}
      {estado === 'autenticada' && (
        <>
          <p className="sesionActiva" role="status">
            Sesión iniciada como {sesion?.email}
          </p>
          <p className="estadoVacio">La gestión de reservas llega en próximas fases.</p>
          <button
            type="button"
            className="botonSecundario"
            onClick={() => {
              void cerrarSesion()
            }}
          >
            Cerrar sesión
          </button>
        </>
      )}
    </section>
  )
}

export default function App({ puertoAuth, repositorioClases }: PropiedadesApp) {
  return (
    <ProveedorSesion puertoAuth={puertoAuth}>
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

          <SeccionHorarios repositorioClases={repositorioClases} />
          <SeccionReservas />
        </main>

        <footer className="pie">
          <p>Velmeya PWA · v0.1.0 · bootstrap GEN-35 · fase 2 GEN-46</p>
        </footer>
      </div>
    </ProveedorSesion>
  )
}
