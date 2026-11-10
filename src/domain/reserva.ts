import { esFechaISO } from './fechas'
import type {
  EntradaReserva,
  EstadoReserva,
  Reserva,
  Validacion,
} from './tipos'

const ESTADOS: readonly string[] = ['confirmada', 'cancelada']

export interface ClaseParcial {
  id: string
  fechaInicio: string
  capacidadPlazas: number
}

export interface DatosReserva {
  /** Identificador de la nueva reserva (proviene de Firestore). */
  id: string
  /** Instante "ahora" en ISO 8601, decidido por la capa de infraestructura. */
  ahora: string
}

export function filtrarConfirmadas(reservas: Reserva[]): Reserva[] {
  return reservas.filter((reserva) => reserva.estado === 'confirmada')
}

export function reservar(
  clase: ClaseParcial,
  reservasExistentes: Reserva[],
  usuarioId: string,
  datos: DatosReserva,
): Validacion<Reserva> {
  const errores: string[] = []

  const inicio = new Date(clase.fechaInicio).getTime()
  const ahora = new Date(datos.ahora).getTime()
  if (inicio <= ahora) errores.push('CLASE_INICIADA')

  // Si dos funcionalidades fallan a la vez, el usuario verá todos los motivos.
  const activas = filtrarConfirmadas(reservasExistentes).filter(
    (reserva) => reserva.claseId === clase.id,
  )
  if (activas.length >= clase.capacidadPlazas) errores.push('CLASE_COMPLETA')
  if (activas.some((reserva) => reserva.usuarioId === usuarioId)) {
    errores.push('YA_RESERVADA')
  }

  if (errores.length > 0) return { ok: false, errores }

  return {
    ok: true,
    valor: {
      id: datos.id,
      claseId: clase.id,
      usuarioId,
      estado: 'confirmada',
      creadaEn: datos.ahora,
    },
  }
}

export function cancelar(
  reserva: Reserva,
  clase: ClaseParcial,
  ahora: string,
): Validacion<Reserva> {
  const errores: string[] = []

  if (reserva.estado === 'cancelada') errores.push('YA_CANCELADA')
  if (new Date(clase.fechaInicio).getTime() <= new Date(ahora).getTime()) {
    errores.push('CLASE_INICIADA')
  }

  if (errores.length > 0) return { ok: false, errores }

  return {
    ok: true,
    valor: { ...reserva, estado: 'cancelada', canceladaEn: ahora },
  }
}

export function validarReserva(entrada: EntradaReserva): Validacion<Reserva> {
  const errores: string[] = []

  const id = entrada.id?.trim() ?? ''
  if (!id) errores.push('ID_REQUERIDO')

  const claseId = entrada.claseId?.trim() ?? ''
  if (!claseId) errores.push('CLASE_REQUERIDO')

  const usuarioId = entrada.usuarioId?.trim() ?? ''
  if (!usuarioId) errores.push('USUARIO_REQUERIDO')

  const estado = entrada.estado
  if (!estado) {
    errores.push('ESTADO_REQUERIDO')
  } else if (!ESTADOS.includes(estado)) {
    errores.push('ESTADO_INVALIDO')
  }

  const creadaEn = entrada.creadaEn?.trim() ?? ''
  if (!esFechaISO(creadaEn)) errores.push('FECHA_INVALIDA')

  if (estado === 'cancelada') {
    const canceladaEn = entrada.canceladaEn?.trim() ?? ''
    if (!esFechaISO(canceladaEn)) errores.push('CANCELADA_SIN_FECHA')
  }

  if (errores.length > 0) return { ok: false, errores }

  return {
    ok: true,
    valor: {
      id,
      claseId,
      usuarioId,
      estado: estado as EstadoReserva,
      creadaEn,
      ...(entrada.canceladaEn ? { canceladaEn: entrada.canceladaEn.trim() } : {}),
    },
  }
}
