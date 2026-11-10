import { describe, expect, it } from 'vitest'
import { cargarConfigFirebase, usarEmuladores } from './config'

const envCompleto = {
  VITE_FIREBASE_API_KEY: 'demo-key-123',
  VITE_FIREBASE_AUTH_DOMAIN: 'demo-velmeya.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'demo-velmeya',
  VITE_FIREBASE_STORAGE_BUCKET: 'demo-velmeya.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '1234567890',
  VITE_FIREBASE_APP_ID: '1:1234567890:web:abcdef',
}

describe('cargarConfigFirebase', () => {
  it('extrae la configuración web de Firebase desde el entorno', () => {
    expect(cargarConfigFirebase(envCompleto)).toEqual({
      ok: true,
      valor: {
        apiKey: 'demo-key-123',
        authDomain: 'demo-velmeya.firebaseapp.com',
        projectId: 'demo-velmeya',
        storageBucket: 'demo-velmeya.appspot.com',
        messagingSenderId: '1234567890',
        appId: '1:1234567890:web:abcdef',
      },
    })
  })

  it('acumula las claves de Firebase ausentes', () => {
    const resultado = cargarConfigFirebase({
      ...envCompleto,
      VITE_FIREBASE_API_KEY: undefined,
      VITE_FIREBASE_APP_ID: '   ',
      VITE_FIREBASE_MESSAGING_SENDER_ID: undefined,
    })
    expect(resultado).toEqual({
      ok: false,
      errores: [
        'VITE_FIREBASE_API_KEY_REQUERIDA',
        'VITE_FIREBASE_MESSAGING_SENDER_ID_REQUERIDA',
        'VITE_FIREBASE_APP_ID_REQUERIDA',
      ],
    })
  })
})

describe('usarEmuladores', () => {
  it('activa el modo emulador solo con VITE_USE_FIREBASE_EMULATORS=true', () => {
    expect(usarEmuladores({ ...envCompleto, VITE_USE_FIREBASE_EMULATORS: 'true' })).toBe(true)
  })

  it('queda desactivado ante valores falsos o ausentes', () => {
    expect(usarEmuladores({ ...envCompleto })).toBe(false)
    expect(usarEmuladores({ ...envCompleto, VITE_USE_FIREBASE_EMULATORS: 'false' })).toBe(false)
  })
})
