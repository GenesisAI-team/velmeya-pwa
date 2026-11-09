import type { EntradaReserva, Reserva, Validacion } from './tipos'

// GEN-35: contratos del dominio de reservas (stubs en fase roja).
export function filtrarConfirmadas(_reservas: Reserva[]): Reserva[] {
  void _reservas
  throw new Error('GEN-35: filtrarConfirmadas sin implementar')
}

export interface PeticionReserva {
  id: string
  ahora: string
}

export function reservar(
  _clase: { id: string; fechaInicio: string; capacidadPlazas: number },
  _reservasExistentes: Reserva[],
  _usuarioId: string,
  _datos: { id: string; ahora: string },
): Validacion<Reserva> {
  void _clase
  void _reservasExistentes
  void _usuarioId
  void _datos
  throw new Error('GEN-35: reservar sin implementar')
}

export function cancelar(_reserva: Reserva, _clase: { fechaInicio: string }, _ahora: string): Validacion<Reserva> {
  void _reserva
  void _clase
  void _ahora
  throw new Error('GEN-35: cancelar sin implementar')
}

export function validarReserva(_entrada: EntradaReserva): Validacion<Reserva> {
  void _entrada
  throw new Error('GEN-35: validarReserva sin implementar')
}
