import { filtrarConfirmadas } from './reserva'
import { esEnteroEnRango, esFechaISO } from './fechas'
import type { Clase, EntradaClase, Reserva, Validacion } from './tipos'

const DURACION_MAX_MINUTOS = 480
const CAPACIDAD_MAX_PLAZAS = 200

export function validarClase(entrada: EntradaClase): Validacion<Clase> {
  const errores: string[] = []

  const id = entrada.id?.trim() ?? ''
  if (!id) errores.push('ID_REQUERIDO')

  const titulo = entrada.titulo?.trim() ?? ''
  if (!titulo) errores.push('TITULO_REQUERIDO')

  const fechaInicio = entrada.fechaInicio?.trim() ?? ''
  if (!esFechaISO(fechaInicio)) errores.push('FECHA_INVALIDA')

  const duracionMinutos = entrada.duracionMinutos
  if (
    !esEnteroEnRango(duracionMinutos, 1, DURACION_MAX_MINUTOS)
  ) {
    errores.push('DURACION_INVALIDA')
  }

  const capacidadPlazas = entrada.capacidadPlazas
  if (!esEnteroEnRango(capacidadPlazas, 1, CAPACIDAD_MAX_PLAZAS)) {
    errores.push('CAPACIDAD_INVALIDA')
  }

  const profesorId = entrada.profesorId?.trim()
  if (entrada.profesorId !== undefined && profesorId === '') {
    errores.push('PROFESOR_INVALIDO')
  }

  if (errores.length > 0) return { ok: false, errores }

  return {
    ok: true,
    valor: {
      id,
      titulo,
      fechaInicio,
      duracionMinutos: duracionMinutos as number,
      capacidadPlazas: capacidadPlazas as number,
      ...(profesorId ? { profesorId } : {}),
    },
  }
}

/**
 * Plazas libres = capacidad - reservas confirmadas de esta clase,
 * sin devolver valores negativos (sobreasignación defensiva).
 */
export function plazasDisponibles(clase: Clase, reservas: Reserva[]): number {
  const ocupadas = filtrarConfirmadas(reservas).filter(
    (reserva) => reserva.claseId === clase.id,
  ).length
  return Math.max(0, clase.capacidadPlazas - ocupadas)
}
