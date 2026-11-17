import type {
  PuertoAuth,
  PuertoReservas,
  RepositorioClases,
  SesionUsuario,
} from '../domain/puertos'
import type { Clase, Reserva, Validacion } from '../domain/tipos'

/**
 * Duplicados de prueba para la UI: implementan los puertos del dominio sin
 * Firebase, con control manual del momento de las emisiones (ver AGENTS.md).
 */
export class AuthFalso implements PuertoAuth {
  private suscriptores = new Set<(sesion: SesionUsuario | null) => void>()

  sesionActual: SesionUsuario | null = null
  /** false simula un adaptador que aún no ha resuelto la sesión (estado 'cargando'). */
  emitirAlSuscribir = true
  /** true hace que iniciarSesion no resuelva hasta llamar a resolverInicioSesion. */
  respuestaDiferida = false
  respuestaInicioSesion: Validacion<SesionUsuario> = {
    ok: true,
    valor: { uid: 'usuario-1', email: 'alumno@demo.local' },
  }

  llamadasIniciarSesion: Array<{ email: string; contrasena: string }> = []
  llamadasCerrarSesion = 0
  suscripciones = 0
  bajas = 0

  private resolverRespuesta: ((resultado: Validacion<SesionUsuario>) => void) | undefined

  suscribirseSesion(callback: (sesion: SesionUsuario | null) => void): () => void {
    this.suscriptores.add(callback)
    this.suscripciones += 1
    if (this.emitirAlSuscribir) callback(this.sesionActual)
    return () => {
      this.suscriptores.delete(callback)
      this.bajas += 1
    }
  }

  async iniciarSesion(email: string, contrasena: string): Promise<Validacion<SesionUsuario>> {
    this.llamadasIniciarSesion.push({ email, contrasena })
    if (this.respuestaDiferida) {
      return new Promise<Validacion<SesionUsuario>>((resolver) => {
        this.resolverRespuesta = resolver
      })
    }
    return this.respuestaInicioSesion
  }

  resolverInicioSesion(resultado: Validacion<SesionUsuario>): void {
    const resolver = this.resolverRespuesta
    this.resolverRespuesta = undefined
    resolver?.(resultado)
  }

  async cerrarSesion(): Promise<void> {
    this.llamadasCerrarSesion += 1
    this.definirSesion(null)
  }

  /** Simula el aviso del SDK de Auth (p. ej. onAuthStateChanged). */
  definirSesion(sesion: SesionUsuario | null): void {
    this.sesionActual = sesion
    for (const callback of [...this.suscriptores]) callback(sesion)
  }
}

export class RepositorioClasesFalso implements RepositorioClases {
  clases: Clase[] = []
  /**
   * Si se define, la i-ésima llamada a listarClases devuelve
   * clasesPorLlamada[i-1] (cíclico): útil para simular que una transacción
   * actualizó el contador de plazas entre cargas (GEN-51).
   */
  clasesPorLlamada: Clase[][] | null = null
  error: Error | null = null
  /** true simula una consulta que nunca resuelve (estado 'cargando' observable). */
  pendiente = false
  llamadasListar = 0

  async listarClases(): Promise<Clase[]> {
    this.llamadasListar += 1
    if (this.pendiente) return new Promise<Clase[]>(() => {})
    if (this.error) throw this.error
    if (this.clasesPorLlamada) {
      const lista = this.clasesPorLlamada[(this.llamadasListar - 1) % this.clasesPorLlamada.length]
      return [...lista]
    }
    return [...this.clases]
  }
}

export function reservaEjemplo(sobrescritura: Partial<Reserva> = {}): Reserva {
  return {
    id: 'reserva-1',
    claseId: 'clase-1',
    usuarioId: 'usuario-1',
    estado: 'confirmada',
    creadaEn: '2026-12-01T08:00:00.000Z',
    ...sobrescritura,
  }
}

/**
 * Duplicado del PuertoReservas (GEN-51): control manual de respuestas y del
 * momento de resolver las acciones (para probar el estado 'en curso').
 */
export class PuertoReservasFalso implements PuertoReservas {
  reservas: Reserva[] = []
  /** Resultado que devuelve la próxima llamada a reservarPlaza. */
  resultadoReservar: Validacion<Reserva> = { ok: true, valor: reservaEjemplo() }
  /** Resultado que devuelve la próxima llamada a cancelarReserva. */
  resultadoCancelar: Validacion<Reserva> = {
    ok: true,
    valor: reservaEjemplo({ estado: 'cancelada', canceladaEn: '2026-12-02T08:00:00.000Z' }),
  }
  /** Error que lanza listarReservasDe (p. ej. emulador apagado). */
  errorListar: Error | null = null
  /** true simula una acción que no resuelve hasta resolverAccion. */
  accionDiferida = false

  llamadasReservar: string[] = []
  llamadasCancelar: string[] = []
  llamadasListar: string[] = []

  private resolvers: Array<(resultado: Validacion<Reserva>) => void> = []

  async reservarPlaza(claseId: string): Promise<Validacion<Reserva>> {
    this.llamadasReservar.push(claseId)
    if (this.accionDiferida) return new Promise<Validacion<Reserva>>((resolver) => {
      this.resolvers.push(resolver)
    })
    return this.resultadoReservar
  }

  async cancelarReserva(reservaId: string): Promise<Validacion<Reserva>> {
    this.llamadasCancelar.push(reservaId)
    if (this.accionDiferida) return new Promise<Validacion<Reserva>>((resolver) => {
      this.resolvers.push(resolver)
    })
    return this.resultadoCancelar
  }

  async listarReservasDe(usuarioId: string): Promise<Reserva[]> {
    this.llamadasListar.push(usuarioId)
    if (this.errorListar) throw this.errorListar
    return this.reservas
  }

  /** Resuelve la acción diferida más antigua con el resultado dado. */
  resolverAccion(resultado: Validacion<Reserva>): void {
    const resolver = this.resolvers.shift()
    resolver?.(resultado)
  }
}

export function claseEjemplo(sobrescritura: Partial<Clase> = {}): Clase {
  return {
    id: 'clase-1',
    titulo: 'Vinyasa 60',
    fechaInicio: '2027-01-15T09:00:00.000Z',
    duracionMinutos: 60,
    capacidadPlazas: 12,
    ...sobrescritura,
  }
}
