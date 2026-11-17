import type { Clase, Validacion } from './tipos'

// Puertos del dominio (GEN-46): contratos que la infraestructura Firebase
// implementa y la UI consume. TypeScript puro, sin dependencias externas.

/** Sesión activa, mínima para la UI (identidad sin datos de negocio). */
export interface SesionUsuario {
  uid: string
  email: string | null
}

/**
 * Puerto de autenticación. `suscribirseSesion` notifica la sesión actual al
 * suscribirse y en cada cambio (inicio, cierre, restauración al recargar);
 * devuelve la función de baja.
 */
export interface PuertoAuth {
  suscribirseSesion(callback: (sesion: SesionUsuario | null) => void): () => void
  iniciarSesion(email: string, contrasena: string): Promise<Validacion<SesionUsuario>>
  cerrarSesion(): Promise<void>
}

/** Puerto de consulta del horario: clases validadas con el dominio. */
export interface RepositorioClases {
  listarClases(): Promise<Clase[]>
}
