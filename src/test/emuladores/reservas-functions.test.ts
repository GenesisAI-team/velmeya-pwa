import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  cancelarReservaEnTransaccion,
  reservarPlazaEnTransaccion,
} from '../../../functions/src/reservas'
import {
  gestorCancelarReserva,
  gestorReservarPlaza,
  obtenerDb,
} from '../../../functions/src/index'

// Proyecto de demo (prefijo demo-): nunca puede llegar a un proyecto real.
const PROYECTO = 'demo-velmeya-transacciones'
const HOST = '127.0.0.1'
const PUERTO_FIRESTORE = 8080
const FECHA_CLASE = '2027-01-15T09:00:00.000Z'
const AHORA_ANTES_DE_LA_CLASE = '2027-01-01T10:00:00.000Z'

type DbAdmin = ReturnType<typeof obtenerDb>
type PeticionReservar = Parameters<typeof gestorReservarPlaza>[0]
type PeticionCancelar = Parameters<typeof gestorCancelarReserva>[0]

let entorno: RulesTestEnvironment
let dbAdmin: DbAdmin

beforeAll(async () => {
  // Variables que las Functions leen para apuntar el SDK de administrador al
  // emulador de Firestore (nunca a producción).
  process.env.GCLOUD_PROJECT = PROYECTO
  process.env.FIRESTORE_EMULATOR_HOST = `${HOST}:${PUERTO_FIRESTORE}`
  process.env.FIREBASE_AUTH_EMULATOR_HOST = `${HOST}:9099`

  entorno = await initializeTestEnvironment({
    projectId: PROYECTO,
    firestore: { host: HOST, port: PUERTO_FIRESTORE },
  })
  dbAdmin = obtenerDb()
})

afterAll(async () => {
  await entorno.cleanup()
})

afterEach(async () => {
  await entorno.clearFirestore()
})

async function sembrarClase(
  id: string,
  capacidadPlazas: number,
  fechaInicio = FECHA_CLASE,
): Promise<void> {
  await dbAdmin.collection('classes').doc(id).set({
    titulo: `Clase ${id} (demo)`,
    fechaInicio,
    duracionMinutos: 60,
    capacidadPlazas,
  })
}

async function sembrarReserva(
  id: string,
  claseId: string,
  usuarioId: string,
  estado = 'confirmada',
  creadaEn = '2026-12-01T08:00:00.000Z',
): Promise<void> {
  await dbAdmin.collection('reservations').doc(id).set({ claseId, usuarioId, estado, creadaEn })
}

async function reservar(
  claseId: string,
  usuarioId: string,
  ahora: string | undefined = AHORA_ANTES_DE_LA_CLASE,
): Promise<Awaited<ReturnType<typeof reservarPlazaEnTransaccion>>> {
  return reservarPlazaEnTransaccion(dbAdmin, { claseId, usuarioId, ahora })
}

async function cancelar(
  reservaId: string,
  usuarioId: string,
): Promise<Awaited<ReturnType<typeof cancelarReservaEnTransaccion>>> {
  return cancelarReservaEnTransaccion(dbAdmin, {
    reservaId,
    usuarioId,
    ahora: AHORA_ANTES_DE_LA_CLASE,
  })
}

async function contarConfirmadas(claseId: string): Promise<number> {
  const instantanea = await dbAdmin
    .collection('reservations')
    .where('claseId', '==', claseId)
    .get()
  return instantanea.docs.filter((documento) => documento.data().estado === 'confirmada').length
}

async function leerOcupadas(claseId: string): Promise<number | undefined> {
  const instantanea = await dbAdmin.collection('classes').doc(claseId).get()
  return instantanea.data()?.ocupadas
}

function peticionReservar(uid: string | null, data: unknown): PeticionReservar {
  return {
    ...(uid ? { auth: { uid, token: {} } } : {}),
    data,
  } as PeticionReservar
}

function peticionCancelar(uid: string | null, data: unknown): PeticionCancelar {
  return {
    ...(uid ? { auth: { uid, token: {} } } : {}),
    data,
  } as PeticionCancelar
}

describe('reservarPlazaEnTransaccion (Functions + transacción Firestore, GEN-51)', () => {
  it('reserva una plaza: crea la reserva confirmada y actualiza el contador de la clase', async () => {
    await sembrarClase('c1', 2)
    const resultado = await reservar('c1', 'u1')

    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    expect(resultado.valor).toMatchObject({
      claseId: 'c1',
      usuarioId: 'u1',
      estado: 'confirmada',
      creadaEn: AHORA_ANTES_DE_LA_CLASE,
    })
    const guardadas = await dbAdmin.collection('reservations').get()
    expect(guardadas.docs).toHaveLength(1)
    expect(guardadas.docs[0].data()).toMatchObject({
      claseId: 'c1',
      usuarioId: 'u1',
      estado: 'confirmada',
      creadaEn: AHORA_ANTES_DE_LA_CLASE,
    })
    expect(await leerOcupadas('c1')).toBe(1)
  })

  it('rechaza a un segundo usuario cuando la última plaza está ocupada (CLASE_COMPLETA)', async () => {
    await sembrarClase('c1', 1)
    expect((await reservar('c1', 'u1')).ok).toBe(true)

    const resultado = await reservar('c1', 'u2')
    expect(resultado).toEqual({ ok: false, errores: ['CLASE_COMPLETA'] })
    expect(await contarConfirmadas('c1')).toBe(1)
    expect(await leerOcupadas('c1')).toBe(1)
  })

  it('impide la reserva duplicada del mismo usuario (YA_RESERVADA)', async () => {
    await sembrarClase('c1', 5)
    expect((await reservar('c1', 'u1')).ok).toBe(true)

    const resultado = await reservar('c1', 'u1')
    expect(resultado).toEqual({ ok: false, errores: ['YA_RESERVADA'] })
    expect(await contarConfirmadas('c1')).toBe(1)
  })

  it('rechaza reservar una clase ya iniciada (CLASE_INICIADA)', async () => {
    await sembrarClase('c1', 5, '2026-01-15T09:00:00.000Z')
    const resultado = await reservar('c1', 'u1', '2027-01-01T10:00:00.000Z')
    expect(resultado).toEqual({ ok: false, errores: ['CLASE_INICIADA'] })
    expect(await contarConfirmadas('c1')).toBe(0)
  })

  it('rechaza clase inexistente, id vacío y documento que no cumple el dominio', async () => {
    await sembrarClase('rota', 0)
    expect(await reservar('c1', 'u1')).toEqual({ ok: false, errores: ['CLASE_NO_ENCONTRADA'] })
    expect(await reservar('', 'u1')).toEqual({ ok: false, errores: ['ID_REQUERIDO'] })
    expect(await reservar('rota', 'u1')).toEqual({ ok: false, errores: ['CLASE_INVALIDA'] })
  })
})

describe('dos solicitudes concurrentes a la última plaza (GEN-51)', () => {
  it('no genera sobrecupo: con capacidad 1 gana exactamente una de dos', async () => {
    await sembrarClase('c1', 1)
    const resultados = await Promise.allSettled([
      reservar('c1', 'u1'),
      reservar('c1', 'u2'),
    ])
    expect(resultados.every((r) => r.status === 'fulfilled')).toBe(true)
    const valores = resultados.map((r) => (r as PromiseFulfilledResult<Awaited<ReturnType<typeof reservarPlazaEnTransaccion>>>).value)
    const ganadores = valores.filter((r) => r.ok)
    expect(ganadores).toHaveLength(1)
    expect(valores.find((r) => !r.ok)).toEqual({ ok: false, errores: ['CLASE_COMPLETA'] })
    expect(await contarConfirmadas('c1')).toBe(1)
    expect(await leerOcupadas('c1')).toBe(1)
  })

  it('no genera sobrecupo: con capacidad 2 y tres peticiones ganan exactamente dos', async () => {
    await sembrarClase('c1', 2)
    const resultados = await Promise.allSettled([
      reservar('c1', 'u1'),
      reservar('c1', 'u2'),
      reservar('c1', 'u3'),
    ])
    expect(resultados.every((r) => r.status === 'fulfilled')).toBe(true)
    const valores = resultados.map((r) => (r as PromiseFulfilledResult<Awaited<ReturnType<typeof reservarPlazaEnTransaccion>>>).value)
    expect(valores.filter((r) => r.ok)).toHaveLength(2)
    expect(valores.filter((r) => !r.ok)).toEqual([{ ok: false, errores: ['CLASE_COMPLETA'] }])
    expect(await contarConfirmadas('c1')).toBe(2)
    expect(await leerOcupadas('c1')).toBe(2)
  })
})

describe('cancelarReservaEnTransaccion (GEN-51)', () => {
  it('cancela una reserva propia, libera la plaza y otro usuario puede reservar', async () => {
    await sembrarClase('c1', 1)
    expect((await reservar('c1', 'u1')).ok).toBe(true)
    expect((await reservar('c1', 'u2')).ok).toBe(false)
    const guardadas = await dbAdmin.collection('reservations').get()
    const idReservaU1 = guardadas.docs[0].id

    const resultado = await cancelar(idReservaU1, 'u1')
    expect(resultado.ok).toBe(true)
    const documento = await dbAdmin.collection('reservations').doc(idReservaU1).get()
    expect(documento.data()).toMatchObject({
      estado: 'cancelada',
      canceladaEn: AHORA_ANTES_DE_LA_CLASE,
    })
    expect(await leerOcupadas('c1')).toBe(0)
    expect((await reservar('c1', 'u2')).ok).toBe(true)
  })

  it('es idempotente: cancelar dos veces no duplica ni revierte (YA_CANCELADA)', async () => {
    await sembrarClase('c1', 2)
    await sembrarReserva('r1', 'c1', 'u1')
    expect((await cancelar('r1', 'u1')).ok).toBe(true)

    const segunda = await cancelar('r1', 'u1')
    expect(segunda).toEqual({ ok: false, errores: ['YA_CANCELADA'] })
    const documento = await dbAdmin.collection('reservations').doc('r1').get()
    expect(documento.data()).toMatchObject({
      estado: 'cancelada',
      canceladaEn: AHORA_ANTES_DE_LA_CLASE,
    })
    expect(await leerOcupadas('c1')).toBe(0)
    expect(await contarConfirmadas('c1')).toBe(0)
  })

  it('impide cancelar la reserva de otro usuario (RESERVA_AJENA)', async () => {
    await sembrarClase('c1', 2)
    await sembrarReserva('r1', 'c1', 'u1')

    const resultado = await cancelar('r1', 'u2')
    expect(resultado).toEqual({ ok: false, errores: ['RESERVA_AJENA'] })
    const documento = await dbAdmin.collection('reservations').doc('r1').get()
    expect(documento.data()).toMatchObject({ estado: 'confirmada' })
    expect(await leerOcupadas('c1')).toBeUndefined()
  })

  it('rechaza reserva inexistente, id vacío y documento que no cumple el dominio', async () => {
    await sembrarClase('c1', 2)
    await dbAdmin.collection('reservations').doc('rara').set({
      claseId: 'c1',
      usuarioId: 'u1',
      estado: 'estado-raro',
      creadaEn: '2026-12-01T08:00:00.000Z',
    })
    expect(await cancelar('r-x', 'u1')).toEqual({
      ok: false,
      errores: ['RESERVA_NO_ENCONTRADA'],
    })
    expect(await cancelar('', 'u1')).toEqual({ ok: false, errores: ['ID_REQUERIDO'] })
    expect(await cancelar('rara', 'u1')).toEqual({ ok: false, errores: ['RESERVA_INVALIDA'] })
  })
})

describe('llamadas autenticadas vía Functions (onCall, GEN-51)', () => {
  it('exige sesión iniciada (SESION_REQUERIDA) y claseId válido (ID_REQUERIDO)', async () => {
    await expect(gestorReservarPlaza(peticionReservar(null, { claseId: 'c1' }))).rejects.toThrow(
      'SESION_REQUERIDA',
    )
    await expect(
      gestorReservarPlaza(peticionReservar('u1', {})),
    ).rejects.toThrow('ID_REQUERIDO')
  })

  it('reserva con la sesión autenticada: el dueño es el uid de Auth, no el cliente', async () => {
    await sembrarClase('c1', 3)
    const respuesta = await gestorReservarPlaza(peticionReservar('alumno-1', { claseId: 'c1' }))
    expect(respuesta).toMatchObject({
      claseId: 'c1',
      usuarioId: 'alumno-1',
      estado: 'confirmada',
    })
    expect(await leerOcupadas('c1')).toBe(1)
  })

  it('cancela una reserva propia vía la llamada autenticada', async () => {
    await sembrarClase('c1', 3)
    await sembrarReserva('r-propia', 'c1', 'alumno-2')
    await dbAdmin.collection('classes').doc('c1').update({ ocupadas: 1 })

    const respuesta = await gestorCancelarReserva(
      peticionCancelar('alumno-2', { reservaId: 'r-propia' }),
    )
    expect(respuesta).toMatchObject({ estado: 'cancelada', usuarioId: 'alumno-2' })
    expect(await leerOcupadas('c1')).toBe(0)
  })

  it('rechaza con el código estable si el usuario no es el dueño (RESERVA_AJENA)', async () => {
    await sembrarClase('c1', 3)
    await sembrarReserva('r-ajena', 'c1', 'alumno-1')
    await expect(
      gestorCancelarReserva(peticionCancelar('alumno-2', { reservaId: 'r-ajena' })),
    ).rejects.toThrow('RESERVA_AJENA')
  })
})
