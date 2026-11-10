import { deleteApp, getApps } from 'firebase/app'
import { afterAll, describe, expect, it } from 'vitest'
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

const HOST = '127.0.0.1'

afterAll(async () => {
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
})
