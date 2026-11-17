import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { crearAdaptadorReservas, type LlamadorFunciones } from '../../infrastructure/firebase/reservas'
import { crearSembrador } from './apoyo'

// Proyecto de demo (prefijo demo-): nunca puede llegar a un proyecto real.
const PROYECTO = 'demo-velmeya-adaptador'
const HOST = '127.0.0.1'
const PUERTO_AUTH = 9099
const PUERTO_FIRESTORE = 8080
// Misma apiKey que adaptador-auth.test.ts: el emulador de Auth separa
// cuentas por clave.
const CLAVE = 'velmeya-test-key'

let entorno: RulesTestEnvironment
let sembrar: ReturnType<typeof crearSembrador>
let app: FirebaseApp
let db: Firestore

beforeAll(async () => {
  entorno = await initializeTestEnvironment({
    projectId: PROYECTO,
    firestore: {
      rules: readFileSync(join(__dirname, '..', '..', '..', 'firestore.rules'), 'utf8'),
      host: HOST,
      port: PUERTO_FIRESTORE,
    },
  })
  sembrar = crearSembrador(PROYECTO, HOST, PUERTO_FIRESTORE)

  // Cliente web real con sesión iniciada en el emulador de Auth: las reglas
  // de dueño sobre `reservations` se verifican de verdad.
  app = initializeApp({ apiKey: CLAVE, projectId: PROYECTO }, 'pruebas-adaptador-reservas')
  const auth = getAuth(app)
  connectAuthEmulator(auth, `http://${HOST}:${PUERTO_AUTH}`, { disableWarnings: true })
  db = getFirestore(app)
  connectFirestoreEmulator(db, HOST, PUERTO_FIRESTORE)
})

afterAll(async () => {
  await deleteApp(app)
  await entorno.cleanup()
})

afterEach(async () => {
  await entorno.clearFirestore()
})

interface RespuestaAlta {
  localId?: string
  error?: { message?: string }
}

/** Crea un usuario de prueba directamente en el emulador de Auth (REST). */
async function crearUsuarioEmulador(email: string, contrasena: string): Promise<string> {
  const respuesta = await fetch(
    `http://${HOST}:${PUERTO_AUTH}/www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=${CLAVE}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: contrasena, returnSecureToken: true }),
    },
  )
  const cuerpo = (await respuesta.json()) as RespuestaAlta
  if (!cuerpo.localId) {
    throw new Error(`Alta fallida en emulador de Auth: ${JSON.stringify(cuerpo)}`)
  }
  return cuerpo.localId
}

// El llamador no se usa en las consultas (las escrituras van vía Functions);
// fallaría ruidosamente si el adaptador lo necesitara aquí.
const LLAMADOR_QUE_FALLA: LlamadorFunciones = async () => {
  throw new Error('las pruebas de listado no deben llamar a Functions')
}

describe('adaptador de reservas contra el emulador: listado con reglas (GEN-51)', () => {
  it('lista solo las reservas propias del usuario (reglas de dueño)', async () => {
    const email = `adaptador-${Date.now()}@demo.local`
    const uid = await crearUsuarioEmulador(email, 'demo1234')
    await sembrar('reservations', 'r1', {
      claseId: 'clase-1',
      usuarioId: uid,
      estado: 'confirmada',
      creadaEn: '2026-12-01T08:00:00.000Z',
    })
    await sembrar('reservations', 'r2', {
      claseId: 'clase-2',
      usuarioId: 'otro-usuario',
      estado: 'confirmada',
      creadaEn: '2026-12-01T09:00:00.000Z',
    })
    await signInWithEmailAndPassword(getAuth(app), email, 'demo1234')

    const adaptador = crearAdaptadorReservas(db, LLAMADOR_QUE_FALLA)
    await expect(assertSucceeds(adaptador.listarReservasDe(uid))).resolves.toEqual([
      {
        id: 'r1',
        claseId: 'clase-1',
        usuarioId: uid,
        estado: 'confirmada',
        creadaEn: '2026-12-01T08:00:00.000Z',
      },
    ])
  })

  it('ordena las reservas propias de la más reciente a la más antigua', async () => {
    const email = `orden-${Date.now()}@demo.local`
    const uid = await crearUsuarioEmulador(email, 'demo1234')
    await sembrar('reservations', 'r-antigua', {
      claseId: 'clase-1',
      usuarioId: uid,
      estado: 'confirmada',
      creadaEn: '2026-12-01T08:00:00.000Z',
    })
    await sembrar('reservations', 'r-reciente', {
      claseId: 'clase-2',
      usuarioId: uid,
      estado: 'confirmada',
      creadaEn: '2026-12-02T10:00:00.000Z',
    })
    await signInWithEmailAndPassword(getAuth(app), email, 'demo1234')

    const adaptador = crearAdaptadorReservas(db, LLAMADOR_QUE_FALLA)
    const reservas = await adaptador.listarReservasDe(uid)
    expect(reservas.map((reserva) => reserva.id)).toEqual(['r-reciente', 'r-antigua'])
  })

  it('descarta los documentos que no cumplen el contrato del dominio', async () => {
    const email = `contrato-${Date.now()}@demo.local`
    const uid = await crearUsuarioEmulador(email, 'demo1234')
    await sembrar('reservations', 'r-buena', {
      claseId: 'clase-1',
      usuarioId: uid,
      estado: 'confirmada',
      creadaEn: '2026-12-01T08:00:00.000Z',
    })
    await sembrar('reservations', 'r-rota', {
      claseId: 'clase-1',
      usuarioId: uid,
      estado: 'estado-imposible',
      creadaEn: '2026-12-01T08:30:00.000Z',
    })
    await signInWithEmailAndPassword(getAuth(app), email, 'demo1234')

    const adaptador = crearAdaptadorReservas(db, LLAMADOR_QUE_FALLA)
    const reservas = await adaptador.listarReservasDe(uid)
    expect(reservas.map((reserva) => reserva.id)).toEqual(['r-buena'])
  })

  it('devuelve una lista vacía cuando el usuario no tiene reservas', async () => {
    const email = `vacio-${Date.now()}@demo.local`
    const uid = await crearUsuarioEmulador(email, 'demo1234')
    await signInWithEmailAndPassword(getAuth(app), email, 'demo1234')

    const adaptador = crearAdaptadorReservas(db, LLAMADOR_QUE_FALLA)
    await expect(adaptador.listarReservasDe(uid)).resolves.toEqual([])
  })
})
