// Adaptador del PuertoReservas (GEN-51): las escrituras son llamadas a
// Functions transaccionales (el cliente nunca escribe `reservations`, reglas
// de GEN-46) y la consulta lee solo las reservas propias, algo que las reglas
// permiten. Los errores de las Functions llegan como HttpsError cuyo mensaje
// son códigos estables del dominio; aquí se traducen a `Validacion<T>`.

import { collection, getDocs, where, query } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { validarReserva } from '../../domain/reserva'
import type { PuertoReservas } from '../../domain/puertos'
import type { EntradaReserva, Reserva, Validacion } from '../../domain/tipos'

/** Llamada a una función transaccional, inyectable para las pruebas. */
export type LlamadorFunciones = (nombre: string, entrada: unknown) => Promise<unknown>

/** Regex de códigos estables: MAYÚSCULAS_Y_GUIONES_BAJOS, unidos por comas. */
const CODIGOS_ESTABLES = /^[A-Z][A-Z0-9_]*(,[A-Z][A-Z0-9_]*)*$/

/**
 * Traduce el error de una llamada a Functions a códigos estables. El mensaje
 * del HttpsError del servidor es la lista de códigos; si no lo es, se mapea
 * por código de transporte y, en último término, ERROR_SERVIDOR.
 */
export function mapearErrorFunciones(error: unknown): string[] {
  if (typeof error === 'object' && error !== null) {
    const candidato = error as { code?: unknown; message?: unknown }
    const mensaje = typeof candidato.message === 'string' ? candidato.message.trim() : ''
    if (mensaje && CODIGOS_ESTABLES.test(mensaje)) {
      return mensaje.split(',')
    }
    if (candidato.code === 'functions/unauthenticated') return ['SESION_REQUERIDA']
  }
  return ['ERROR_SERVIDOR']
}

/**
 * Mapea un documento de `reservations` a la entidad del dominio, validándolo
 * con `validarReserva`. Los campos con tipo inesperado se tratan como
 * ausentes (sin excepciones).
 */
export function desdeDocumentoReserva(
  id: string,
  datos: Record<string, unknown>,
): Validacion<Reserva> {
  return validarReserva(desdeDatosReserva(id, datos))
}

function desdeDatosReserva(id: string, datos: Record<string, unknown>): EntradaReserva {
  return {
    // En documentos el id viene de la ruta; en la respuesta de las Functions,
    // del propio objeto (el parámetro llega vacío).
    id: id || (typeof datos.id === 'string' ? datos.id : undefined),
    claseId: typeof datos.claseId === 'string' ? datos.claseId : undefined,
    usuarioId: typeof datos.usuarioId === 'string' ? datos.usuarioId : undefined,
    estado: typeof datos.estado === 'string' ? datos.estado : undefined,
    creadaEn: typeof datos.creadaEn === 'string' ? datos.creadaEn : undefined,
    ...(typeof datos.canceladaEn === 'string' ? { canceladaEn: datos.canceladaEn } : {}),
  }
}

/**
 * Ordena por el instante de creación (la más reciente primero), como GEN-46
 * hace con las clases: por Date.parse y no por la cadena ISO, que con
 * offsets distintos no es cronológica.
 */
export function ordenarReservasPorCreacion(reservas: Reserva[]): Reserva[] {
  return [...reservas].sort(
    (a, b) => Date.parse(b.creadaEn) - Date.parse(a.creadaEn),
  )
}

/** Respuesta de las Functions: una reserva en forma plana. */
function desdeRespuesta(datos: unknown): Validacion<Reserva> {
  if (typeof datos !== 'object' || datos === null) {
    return { ok: false, errores: ['RESPUESTA_INVALIDA'] }
  }
  const validada = desdeDocumentoReserva('', datos as Record<string, unknown>)
  if (validada.ok) return validada
  return { ok: false, errores: ['RESPUESTA_INVALIDA'] }
}

/**
 * Adaptador de reservas contra Firestore (lectura propia) y Functions
 * transaccionales (escrituras). Las operaciones nunca lanzan: devuelven
 * `Validacion<T>` con códigos estables; la consulta sí puede lanzar, como el
 * resto de repositorios.
 */
export function crearAdaptadorReservas(
  db: Firestore,
  llamarFuncion: LlamadorFunciones,
): PuertoReservas {
  return {
    async reservarPlaza(claseId: string): Promise<Validacion<Reserva>> {
      if (!claseId.trim()) return { ok: false, errores: ['ID_REQUERIDO'] }
      try {
        const respuesta = await llamarFuncion('reservarPlaza', { claseId })
        return desdeRespuesta(respuesta)
      } catch (error) {
        return { ok: false, errores: mapearErrorFunciones(error) }
      }
    },

    async cancelarReserva(reservaId: string): Promise<Validacion<Reserva>> {
      if (!reservaId.trim()) return { ok: false, errores: ['ID_REQUERIDO'] }
      try {
        const respuesta = await llamarFuncion('cancelarReserva', { reservaId })
        return desdeRespuesta(respuesta)
      } catch (error) {
        return { ok: false, errores: mapearErrorFunciones(error) }
      }
    },

    async listarReservasDe(usuarioId: string): Promise<Reserva[]> {
      if (!usuarioId.trim()) return []
      const instantanea = await getDocs(
        query(collection(db, 'reservations'), where('usuarioId', '==', usuarioId)),
      )
      const reservas: Reserva[] = []
      for (const documento of instantanea.docs) {
        const resultado = desdeDocumentoReserva(
          documento.id,
          documento.data() as Record<string, unknown>,
        )
        if (resultado.ok) reservas.push(resultado.valor)
      }
      return ordenarReservasPorCreacion(reservas)
    },
  }
}
