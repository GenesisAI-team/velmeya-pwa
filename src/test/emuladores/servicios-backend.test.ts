import { deleteApp, getApps } from 'firebase/app'
import { afterAll, afterEach, describe, expect, it } from 'vitest'
import { crearServiciosBackend } from '../../infrastructure/firebase/app'

// Mismo contrato que .env.example; la clave determina el proyecto del
// emulador de Auth, por eso la REST de siembra usa la misma.
const ENV_EMULADORES = {
  VITE_FIREBASE_API_KEY: 'velmeya-test-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'emulador.local',
  VITE_FIREBASE_PROJECT_ID: 'demo-velmeya-servicios',
  VITE_FIREBASE_STORAGE_BUCKET: 'emulador.local.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  VITE_FIREBASE_APP_ID: 'app-prueba',
  VITE_USE_FIREBASE_EMULATORS: 'true',
}

// Copia literal de .env.example: projectId placeholder, no el del emulador.
const ENV_EJEMPLO = {
  VITE_FIREBASE_API_KEY: 'placeholder-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'placeholder-auth-domain.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'placeholder-project-id',
  VITE_FIREBASE_STORAGE_BUCKET: 'placeholder-storage-bucket.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: 'placeholder-sender-id',
  VITE_FIREBASE_APP_ID: 'placeholder-app-id',
  VITE_USE_FIREBASE_EMULATORS: 'true',
}

const HOST = '127.0.0.1'
const PROYECTO_SEMBRA = 'demo-velmeya-local'

afterAll(async () => {
  await Promise.all(getApps().map((app) => deleteApp(app)))
})

// Cada prueba cablea el SDK de cero: la app por defecto no admite reuso.
afterEach(async () => {
  await Promise.all(getApps().map((app) => deleteApp(app)))
})

async function crearUsuarioEmulador(email: string, contrasena: string): Promise<void> {
  const respuesta = await fetch(
    `http://${HOST}:9099/www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=velmeya-test-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: contrasena, returnSecureToken: true }),
    },
  )
  const cuerpo = (await respuesta.json()) as { localId?: string }
  expect(cuerpo.localId, 'el emulador de Auth debe estar en marcha para esta suite').toBeTruthy()
}

/** Siembra una clase en el proyecto del Emulator Suite (cabecera de propietario). */
async function sembrarClaseEmulador(id: string, campos: Record<string, string | number>): Promise<void> {
  const fields: Record<string, Record<string, string>> = {}
  for (const [clave, valor] of Object.entries(campos)) {
    fields[clave] =
      typeof valor === 'number' ? { integerValue: String(valor) } : { stringValue: String(valor) }
  }
  const respuesta = await fetch(
    `http://${HOST}:8080/v1/projects/${PROYECTO_SEMBRA}/databases/(default)/documents/classes?documentId=${id}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ fields }),
    },
  )
  expect(respuesta.ok, `siembra de classes/${id} fallida: ${await respuesta.text()}`).toBe(true)
}

describe('creación de servicios backend (cableado GEN-46)', () => {
  it('falla con códigos estables si falta la configuración de Firebase', () => {
    const resultado = crearServiciosBackend({ VITE_USE_FIREBASE_EMULATORS: 'true' })
    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(resultado.errores).toContain('VITE_FIREBASE_API_KEY_REQUERIDA')
    }
  })

  it('conecta a los emuladores e inicia sesión de extremo a extremo', async () => {
    const email = `servicio-${Date.now()}@demo.local`
    await crearUsuarioEmulador(email, 'demo1234')

    const resultado = crearServiciosBackend(ENV_EMULADORES)
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return

    const sesion = await resultado.valor.puertoAuth.iniciarSesion(email, 'demo1234')
    expect(sesion.ok).toBe(true)
    if (sesion.ok) {
      expect(sesion.valor.email).toBe(email)
    }
    await resultado.valor.puertoAuth.cerrarSesion()
  })

  it('lee las clases sembradas en demo-velmeya-local con el projectId de .env.example', async () => {
    const id = `demo-servicios-${Date.now()}`
    await sembrarClaseEmulador(id, {
      titulo: 'Hatha (demo)',
      fechaInicio: '2027-04-01T09:00:00.000Z',
      duracionMinutos: 60,
      capacidadPlazas: 12,
    })

    // Copia de .env.example: el projectId placeholder no debe separar al
    // frontend del proyecto donde siembra scripts/sembrar-emulador.mjs.
    const resultado = crearServiciosBackend(ENV_EJEMPLO)
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return

    const clases = await resultado.valor.repositorioClases.listarClases()
    expect(clases.map((clase) => clase.id)).toContain(id)
  })
})
