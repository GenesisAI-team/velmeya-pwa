import type { PuertoAuth, RepositorioClases, SesionUsuario } from '../domain/puertos'
import type { Clase, Validacion } from '../domain/tipos'

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
  error: Error | null = null
  /** true simula una consulta que nunca resuelve (estado 'cargando' observable). */
  pendiente = false
  llamadasListar = 0

  async listarClases(): Promise<Clase[]> {
    this.llamadasListar += 1
    if (this.pendiente) return new Promise<Clase[]>(() => {})
    if (this.error) throw this.error
    return this.clases
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
