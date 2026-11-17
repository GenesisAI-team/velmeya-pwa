import { useState } from 'react'
import './styles/global.css'
import type { PuertoAuth, PuertoReservas, RepositorioClases, SesionUsuario } from './domain/puertos'
import type { Clase } from './domain/tipos'
import { ProveedorSesion } from './ui/ProveedorSesion'
import { useSesion } from './ui/sesion'
import { useClases } from './ui/useClases'
import { useGestionReservas, type GestionReservas } from './ui/useReservas'
import { FormularioInicioSesion } from './ui/FormularioInicioSesion'
import { ListaClases } from './ui/ListaClases'
import { DetalleClase } from './ui/DetalleClase'

const EMULADORES = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true'

export interface PropiedadesApp {
  puertoAuth: PuertoAuth
  repositorioClases: RepositorioClases
  puertoReservas: PuertoReservas
}

interface PropiedadesSeccionHorarios {
  clases: Clase[]
  estado: ReturnType<typeof useClases>['estado']
  gestion: GestionReservas
  sesion: SesionUsuario | null
}

/** Sección de horarios: listado, plazas libres y detalle con reserva. */
function SeccionHorarios({ clases, estado, gestion, sesion }: PropiedadesSeccionHorarios) {
  const [seleccionadaId, setSeleccionadaId] = useState<string | null>(null)
  // Derivada del listado: tras una reserva el contador fresco llega con la
  // recarga de clases, y el detalle se actualiza solo.
  const seleccionada = clases.find((clase) => clase.id === seleccionadaId) ?? null

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
          <ListaClases clases={clases} onSeleccionar={(clase) => setSeleccionadaId(clase.id)} />
          {seleccionada && (
            <DetalleClase
              clase={seleccionada}
              onCerrar={() => setSeleccionadaId(null)}
              sesionActivada={sesion !== null}
              reservada={gestion.reservas.some(
                (reserva) =>
                  reserva.estado === 'confirmada' && reserva.claseId === seleccionada.id,
              )}
              enCurso={gestion.enCurso}
              resultado={gestion.tipoResultado === 'reserva' ? gestion.resultado : null}
              onReservar={() => {
                void gestion.reservar(seleccionada.id)
              }}
            />
          )}
        </>
      )}
    </section>
  )
}

interface PropiedadesSeccionReservas {
  gestion: GestionReservas
  clases: Clase[]
}

/** Sección protegida de reservas: exige sesión iniciada (móvil y escritorio). */
function SeccionReservas({ gestion, clases }: PropiedadesSeccionReservas) {
  const { estado, sesion, iniciando, errorSesion, iniciarSesion, cerrarSesion } = useSesion()
  const tituloDeClase = new Map(clases.map((clase) => [clase.id, clase.titulo]))

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
          <h3>Mis reservas</h3>
          {gestion.estadoReservas === 'cargando' && (
            <p className="estadoCarga">Cargando tus reservas…</p>
          )}
          {gestion.estadoReservas === 'error' && (
            <p className="avisoError" role="alert">
              No se pudieron cargar tus reservas.
            </p>
          )}
          {gestion.estadoReservas === 'vacio' && (
            <p className="estadoVacio">No tienes reservas todavía.</p>
          )}
          {gestion.estadoReservas === 'listado' && (
            <ul className="listaReservas">
              {gestion.reservas.map((reserva) => {
                const titulo = tituloDeClase.get(reserva.claseId) ?? reserva.claseId
                return (
                  <li key={reserva.id}>
                    <span className="tituloReserva">{titulo}</span>
                    <span className="metaReserva">
                      {reserva.estado === 'confirmada' ? 'Confirmada' : 'Cancelada'}
                    </span>
                    {reserva.estado === 'confirmada' && (
                      <button
                        type="button"
                        className="botonSecundario"
                        disabled={gestion.enCurso}
                        onClick={() => {
                          void gestion.cancelar(reserva.id)
                        }}
                      >
                        Cancelar reserva
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
          {gestion.tipoResultado === 'cancelacion' && gestion.resultado && (
            gestion.resultado.ok ? (
              <p className="estadoExito" role="status">
                Reserva cancelada.
              </p>
            ) : (
              <p className="avisoError" role="alert">
                {gestion.resultado.errores.join(', ')}
              </p>
            )
          )}
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

/** Shell de la aplicación, dentro del proveedor de sesión. */
function Velmeya({ repositorioClases, puertoReservas }: Omit<PropiedadesApp, 'puertoAuth'>) {
  const { sesion } = useSesion()
  const { clases, estado, recargar } = useClases(repositorioClases)
  const gestion = useGestionReservas(puertoReservas, sesion?.uid ?? null, recargar)

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

        <SeccionHorarios clases={clases} estado={estado} gestion={gestion} sesion={sesion} />
        <SeccionReservas gestion={gestion} clases={clases} />
      </main>

      <footer className="pie">
        <p>Velmeya PWA · v0.1.0 · bootstrap GEN-35 · fase 3 GEN-51</p>
      </footer>
    </div>
  )
}

export default function App({ puertoAuth, ...resto }: PropiedadesApp) {
  return (
    <ProveedorSesion puertoAuth={puertoAuth}>
      <Velmeya repositorioClases={resto.repositorioClases} puertoReservas={resto.puertoReservas} />
    </ProveedorSesion>
  )
}
