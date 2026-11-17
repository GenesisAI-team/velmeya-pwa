import { initializeApp, type App } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https'
import { cancelarReservaEnTransaccion, reservarPlazaEnTransaccion } from './reservas'
import type { Reserva } from '../../src/domain/tipos'

// GEN-35: scaffold mínimo de Functions v2; GEN-51 añade las llamadas
// autenticadas de reserva/cancelación sobre transacciones de Firestore
// (ver functions/src/reservas.ts). Sigue sin despliegue: solo Emulator Suite.

export const ping = onCall({ cors: true }, async () => {
  return { ok: true, ts: new Date().toISOString() }
})

let aplicacion: App | undefined

/**
 * Firestore de administrador (intérprete autorizado). En el Emulator Suite las
 * variables GCLOUD_PROJECT y FIRESTORE_EMULATOR_HOST apuntan el SDK al
 * emulador; en el runtime de Cloud Functions las fija la plataforma. Se
 * exporta también para la suite de emuladores, que inyecta este mismo
 * cliente en las funciones transaccionales.
 */
export function obtenerDb(): Firestore {
  if (!aplicacion) {
    const proyecto = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT
    if (!proyecto) throw new HttpsError('internal', 'PROYECTO_NO_CONFIGURADO')
    aplicacion = initializeApp({ projectId: proyecto }, 'velmeya-functions')
  }
  return getFirestore(aplicacion)
}

/** Datos de la llamada: solo ids; el dueño sale siempre de request.auth. */
interface DatosReservarPlaza {
  claseId?: unknown
}

interface DatosCancelarReserva {
  reservaId?: unknown
}

/**
 * Reserva una plaza para el usuario con sesión. Errores como HttpsError cuyo
 * mensaje son códigos estables del dominio ('CLASE_COMPLETA', 'YA_RESERVADA',
 * 'CLASE_INICIADA', 'CLASE_NO_ENCONTRADA', 'CLASE_INVALIDA', 'ID_REQUERIDO'),
 * unidos por comas si hay varios.
 */
export async function gestorReservarPlaza(
  peticion: CallableRequest<DatosReservarPlaza>,
): Promise<Reserva> {
  const uid = peticion.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'SESION_REQUERIDA')

  const claseId = typeof peticion.data?.claseId === 'string' ? peticion.data.claseId : ''
  if (!claseId.trim()) throw new HttpsError('invalid-argument', 'ID_REQUERIDO')

  const resultado = await reservarPlazaEnTransaccion(obtenerDb(), {
    claseId,
    usuarioId: uid,
  })
  if (!resultado.ok) throw new HttpsError('failed-precondition', resultado.errores.join(','))
  return resultado.valor
}

export const reservarPlaza = onCall({ cors: true }, gestorReservarPlaza)

/**
 * Cancela una reserva propia. Errores como HttpsError con códigos estables:
 * 'RESERVA_NO_ENCONTRADA', 'RESERVA_AJENA', 'RESERVA_INVALIDA', 'YA_CANCELADA',
 * 'CLASE_INICIADA', 'CLASE_NO_ENCONTRADA', 'CLASE_INVALIDA', 'ID_REQUERIDO'.
 */
export async function gestorCancelarReserva(
  peticion: CallableRequest<DatosCancelarReserva>,
): Promise<Reserva> {
  const uid = peticion.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'SESION_REQUERIDA')

  const reservaId = typeof peticion.data?.reservaId === 'string' ? peticion.data.reservaId : ''
  if (!reservaId.trim()) throw new HttpsError('invalid-argument', 'ID_REQUERIDO')

  const resultado = await cancelarReservaEnTransaccion(obtenerDb(), {
    reservaId,
    usuarioId: uid,
  })
  if (!resultado.ok) throw new HttpsError('failed-precondition', resultado.errores.join(','))
  return resultado.valor
}

export const cancelarReserva = onCall({ cors: true }, gestorCancelarReserva)
