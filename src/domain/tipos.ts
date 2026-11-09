// Contratos del dominio de reservas (GEN-35).
// Solo tipos y firmas: la funcionalidad completa se implementa en issues posteriores.

export type RolUsuario = 'alumno' | 'profesor' | 'admin'

export type EstadoReserva = 'confirmada' | 'cancelada'

export interface Usuario {
  id: string
  nombre: string
  email: string
  rol: RolUsuario
}

export interface Clase {
  id: string
  titulo: string
  /** Fecha de inicio en formato ISO 8601 (por ejemplo, 2026-12-01T10:00:00.000Z). */
  fechaInicio: string
  /** Duración en minutos, entero entre 1 y 480. */
  duracionMinutos: number
  /** Plazas totales, entero entre 1 y 200. */
  capacidadPlazas: number
  /** Opcional: identificador del usuario con rol 'profesor'. */
  profesorId?: string
}

export interface Reserva {
  id: string
  claseId: string
  usuarioId: string
  estado: EstadoReserva
  /** Creación en formato ISO 8601. */
  creadaEn: string
  /** Presente solo si estado === 'cancelada'. */
  canceladaEn?: string
}

export interface EntradaUsuario {
  id?: string
  nombre?: string
  email?: string
  rol?: string
}

export interface EntradaClase {
  id?: string
  titulo?: string
  fechaInicio?: string
  duracionMinutos?: number
  capacidadPlazas?: number
  profesorId?: string
}

export interface EntradaReserva {
  id?: string
  claseId?: string
  usuarioId?: string
  estado?: string
  creadaEn?: string
}

/**
 * Resultado típico de las validaciones del dominio: valor validado o lista
 * de códigos de error acumulados (no corta en el primer error).
 */
export type Validacion<T> =
  | { ok: true; valor: T }
  | { ok: false; errores: string[] }
