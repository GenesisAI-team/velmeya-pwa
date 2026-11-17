// GEN-51: operaciones de reserva y cancelación como transacciones de Firestore
// ejecutadas por Functions v2 como intérprete autorizado (el cliente nunca
// escribe `reservations`: las reglas lo bloquean). La verdad del cupo son las
// reservas confirmadas: se releen DENTRO de la transacción y se aplican las
// reglas puras del dominio (`reservar`/`cancelar` de src/domain). El contador
// `ocupadas` de la clase se recalcula en la misma transacción y solo alimenta
// la UI; sin él no se autoriza nada.
//
// El módulo no importa firebase-admin en tiempo de ejecución: recibe el
// `Firestore` por parámetro, lo que permite probarlo contra el emulador desde
// la suite de emuladores sin dependencias ajenas a la app.

import { validarClase } from '../../src/domain/clase'
import { cancelar, filtrarConfirmadas, reservar, validarReserva } from '../../src/domain/reserva'
import type {
  EntradaClase,
  EntradaReserva,
  Reserva,
  Validacion,
} from '../../src/domain/tipos'
import type { DocumentData, Firestore, Transaction } from 'firebase-admin/firestore'

export interface ParametrosReserva {
  /** Id de la clase en la que se reserva. */
  claseId: string
  /** Usuario con sesión iniciada (proviene de request.auth, nunca del cliente). */
  usuarioId: string
  /** Instante "ahora" en ISO 8601; si falta, se usa el reloj del servidor. */
  ahora?: string
}

export interface ParametrosCancelacion {
  /** Id de la reserva propia que se cancela. */
  reservaId: string
  /** Usuario con sesión iniciada (proviene de request.auth, nunca del cliente). */
  usuarioId: string
  ahora?: string
}

function desdeDocumento(datos: DocumentData | undefined): Record<string, unknown> {
  return datos ?? {}
}

function entradaClase(id: string, datos: Record<string, unknown>): EntradaClase {
  return {
    id,
    titulo: typeof datos.titulo === 'string' ? datos.titulo : undefined,
    fechaInicio: typeof datos.fechaInicio === 'string' ? datos.fechaInicio : undefined,
    duracionMinutos: typeof datos.duracionMinutos === 'number' ? datos.duracionMinutos : undefined,
    capacidadPlazas: typeof datos.capacidadPlazas === 'number' ? datos.capacidadPlazas : undefined,
    ...(typeof datos.profesorId === 'string' ? { profesorId: datos.profesorId } : {}),
    ...(typeof datos.ocupadas === 'number' ? { ocupadas: datos.ocupadas } : {}),
  }
}

function entradaReserva(id: string, datos: Record<string, unknown>): EntradaReserva {
  return {
    id,
    claseId: typeof datos.claseId === 'string' ? datos.claseId : undefined,
    usuarioId: typeof datos.usuarioId === 'string' ? datos.usuarioId : undefined,
    estado: typeof datos.estado === 'string' ? datos.estado : undefined,
    creadaEn: typeof datos.creadaEn === 'string' ? datos.creadaEn : undefined,
    ...(typeof datos.canceladaEn === 'string' ? { canceladaEn: datos.canceladaEn } : {}),
  }
}

function fechaServidor(ahora: string | undefined): string {
  return ahora ?? new Date().toISOString()
}

/**
 * Reservas confirmadas de una clase, validadas con el dominio dentro de la
 * transacción (los documentos corruptos se descartan del recuento).
 */
async function reservasConfirmadasDe(
  transaccion: Transaction,
  db: Firestore,
  claseId: string,
): Promise<Reserva[]> {
  const instantanea = await transaccion.get(
    db.collection('reservations').where('claseId', '==', claseId),
  )
  const reservas: Reserva[] = []
  for (const documento of instantanea.docs) {
    const validada = validarReserva(
      entradaReserva(documento.id, desdeDocumento(documento.data())),
    )
    if (validada.ok) reservas.push(validada.valor)
  }
  return filtrarConfirmadas(reservas)
}

/**
 * Reserva una plaza en una transacción: releer la clase y sus reservas
 * confirmadas, aplicar `reservar` del dominio y escribir la reserva y el
 * contador derivado de forma atómica. Dos peticiones concurrentes a la última
 * plaza se serializan: exactamente una consigue plaza.
 */
export async function reservarPlazaEnTransaccion(
  db: Firestore,
  parametros: ParametrosReserva,
): Promise<Validacion<Reserva>> {
  const claseId = parametros.claseId.trim()
  const usuarioId = parametros.usuarioId.trim()
  if (!claseId || !usuarioId) return { ok: false, errores: ['ID_REQUERIDO'] }

  const ahora = fechaServidor(parametros.ahora)
  const referenciaClase = db.collection('classes').doc(claseId)
  // Id generado sin red: determinista respecto a esta transacción.
  const referenciaReserva = db.collection('reservations').doc()

  return db.runTransaction(async (transaccion) => {
    const instantaneaClase = await transaccion.get(referenciaClase)
    if (!instantaneaClase.exists) return { ok: false, errores: ['CLASE_NO_ENCONTRADA'] }
    const claseValidada = validarClase(
      entradaClase(claseId, desdeDocumento(instantaneaClase.data())),
    )
    if (!claseValidada.ok) return { ok: false, errores: ['CLASE_INVALIDA'] }
    const clase = claseValidada.valor

    const existentes = await reservasConfirmadasDe(transaccion, db, claseId)
    const resultado = reservar(
      { id: clase.id, fechaInicio: clase.fechaInicio, capacidadPlazas: clase.capacidadPlazas },
      existentes,
      usuarioId,
      { id: referenciaReserva.id, ahora },
    )
    if (!resultado.ok) return { ok: false, errores: resultado.errores }

    transaccion.create(referenciaReserva, {
      claseId,
      usuarioId,
      estado: 'confirmada',
      creadaEn: ahora,
    })
    transaccion.update(referenciaClase, { ocupadas: existentes.length + 1 })
    return resultado
  })
}

/**
 * Cancela una reserva propia en una transacción: comprueba la propiedad
 * (RESERVA_AJENA), aplica `cancelar` del dominio (YA_CANCELADA idempotente,
 * CLASE_INICIADA bloqueada), libera la plaza recalculando el contador.
 */
export async function cancelarReservaEnTransaccion(
  db: Firestore,
  parametros: ParametrosCancelacion,
): Promise<Validacion<Reserva>> {
  const reservaId = parametros.reservaId.trim()
  const usuarioId = parametros.usuarioId.trim()
  if (!reservaId || !usuarioId) return { ok: false, errores: ['ID_REQUERIDO'] }

  const ahora = fechaServidor(parametros.ahora)
  const referenciaReserva = db.collection('reservations').doc(reservaId)

  return db.runTransaction(async (transaccion) => {
    const instantaneaReserva = await transaccion.get(referenciaReserva)
    if (!instantaneaReserva.exists) return { ok: false, errores: ['RESERVA_NO_ENCONTRADA'] }
    const reservaValidada = validarReserva(
      entradaReserva(reservaId, desdeDocumento(instantaneaReserva.data())),
    )
    if (!reservaValidada.ok) return { ok: false, errores: ['RESERVA_INVALIDA'] }
    const reserva = reservaValidada.valor
    if (reserva.usuarioId !== usuarioId) return { ok: false, errores: ['RESERVA_AJENA'] }

    const referenciaClase = db.collection('classes').doc(reserva.claseId)
    const instantaneaClase = await transaccion.get(referenciaClase)
    if (!instantaneaClase.exists) return { ok: false, errores: ['CLASE_NO_ENCONTRADA'] }
    const claseValidada = validarClase(
      entradaClase(reserva.claseId, desdeDocumento(instantaneaClase.data())),
    )
    if (!claseValidada.ok) return { ok: false, errores: ['CLASE_INVALIDA'] }
    const clase = claseValidada.valor

    const resultado = cancelar(
      reserva,
      { id: clase.id, fechaInicio: clase.fechaInicio, capacidadPlazas: clase.capacidadPlazas },
      ahora,
    )
    if (!resultado.ok) return { ok: false, errores: resultado.errores }

    // En la instantánea leída la reserva seguía confirmada: el recuento
    // posterior a la cancelación la excluye por id.
    const restantes = (
      await reservasConfirmadasDe(transaccion, db, reserva.claseId)
    ).filter((restante) => restante.id !== reservaId)

    transaccion.update(referenciaReserva, { estado: 'cancelada', canceladaEn: ahora })
    transaccion.update(referenciaClase, { ocupadas: restantes.length })
    return { ok: true, valor: resultado.valor }
  })
}
