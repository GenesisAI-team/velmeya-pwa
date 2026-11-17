import type { Clase, Reserva, Validacion } from './tipos'

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

/**
 * Puerto de reservas (GEN-51): las operaciones de escritura son llamadas a
 * Functions transaccionales (el cliente nunca escribe `reservations`); la
 * consulta devuelve solo las reservas del propio usuario, validadas con el
 * dominio. Los códigos de error son los del dominio (`CLASE_COMPLETA`,
 * `YA_RESERVADA`, `CLASE_INICIADA`, `YA_CANCELADA`, `RESERVA_AJENA`...).
 */
export interface PuertoReservas {
  /** Reserva una plaza en la clase indicada para el usuario con sesión. */
  reservarPlaza(claseId: string): Promise<Validacion<Reserva>>
  /** Cancela una reserva propia. Idempotente (YA_CANCELADA si ya lo estaba). */
  cancelarReserva(reservaId: string): Promise<Validacion<Reserva>>
  /** Reservas confirmadas o canceladas del usuario indicado (reglas: dueño). */
  listarReservasDe(usuarioId: string): Promise<Reserva[]>
}
