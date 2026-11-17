import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { afterAll, describe, expect, it, vi } from 'vitest'
import { crearAdaptadorAuth } from '../../infrastructure/firebase/auth'
import type { PuertoAuth, SesionUsuario } from '../../domain/puertos'

// Proyecto y clave de prueba: el emulador de Auth separa cuentas por apiKey.
const CLAVE = 'velmeya-test-key'
const PROYECTO = 'demo-velmeya-auth'
const HOST = '127.0.0.1'
const PUERTO_AUTH = 9099

const appsCreadas: FirebaseApp[] = []

afterAll(async () => {
  await Promise.all(appsCreadas.map((app) => deleteApp(app)))
})

/** App nueva por prueba: cada Auth arranca sin usuario conectado. */
function crearAuthDePrueba(): PuertoAuth {
  const app = initializeApp({ apiKey: CLAVE, projectId: PROYECTO }, `prueba-${Date.now()}-${Math.random()}`)
  appsCreadas.push(app)
  const auth = getAuth(app)
  connectAuthEmulator(auth, `http://${HOST}:${PUERTO_AUTH}`, { disableWarnings: true })
  return crearAdaptadorAuth(auth)
}

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

describe('adaptador Auth contra el emulador (GEN-46)', () => {
  it('inicia sesión con un usuario del emulador, notifica la sesión y la cierra', async () => {
    const email = `alumno-${Date.now()}@demo.local`
    const uid = await crearUsuarioEmulador(email, 'demo1234')
    const adaptador = crearAuthDePrueba()

    const recibidas: Array<SesionUsuario | null> = []
    const baja = adaptador.suscribirseSesion((sesion) => recibidas.push(sesion))
    await vi.waitFor(() => expect(recibidas.length).toBeGreaterThan(0))
    expect(recibidas[0]).toBeNull()

    const resultado = await adaptador.iniciarSesion(email, 'demo1234')
    expect(resultado).toEqual({ ok: true, valor: { uid, email } })
    await vi.waitFor(() => expect(recibidas.at(-1)?.uid).toBe(uid))
    await vi.waitFor(() => expect(recibidas.at(-1)?.email).toBe(email))

    await adaptador.cerrarSesion()
    await vi.waitFor(() => expect(recibidas.at(-1)).toBeNull())
    baja()
  })

  it('restaura la sesión en una nueva suscripción mientras el usuario sigue conectado', async () => {
    const email = `restaurada-${Date.now()}@demo.local`
    const uid = await crearUsuarioEmulador(email, 'demo1234')
    const adaptador = crearAuthDePrueba()

    await adaptador.iniciarSesion(email, 'demo1234')

    // Nueva suscripción (equivalente a recargar la app): recibe la sesión actual.
    const recibidas: Array<SesionUsuario | null> = []
    const baja = adaptador.suscribirseSesion((sesion) => recibidas.push(sesion))
    await vi.waitFor(() => expect(recibidas.at(-1)?.uid).toBe(uid))
    baja()

    // Tras cerrar sesión, una nueva suscripción recupera el estado anónimo.
    await adaptador.cerrarSesion()
    const trasCierre: Array<SesionUsuario | null> = []
    adaptador.suscribirseSesion((sesion) => trasCierre.push(sesion))
    await vi.waitFor(() => expect(trasCierre).toContain(null))
  })

  it('devuelve un código estable ante credenciales incorrectas', async () => {
    const email = `fallido-${Date.now()}@demo.local`
    await crearUsuarioEmulador(email, 'demo1234')
    const adaptador = crearAuthDePrueba()

    const resultado = await adaptador.iniciarSesion(email, 'contrasena-mala')
    expect(resultado).toEqual({ ok: false, errores: ['CREDENCIALES_INVALIDAS'] })
  })

  it('devuelve un código estable ante un email con formato inválido', async () => {
    const adaptador = crearAuthDePrueba()
    const resultado = await adaptador.iniciarSesion('no-es-un-email', 'demo1234')
    expect(resultado).toEqual({ ok: false, errores: ['EMAIL_INVALIDO'] })
  })
})
