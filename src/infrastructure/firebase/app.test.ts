import { beforeEach, describe, expect, it, vi } from 'vitest'
import { crearServiciosBackend } from './app'

const { inicializarApp, conectarFirestore, conectarAuth, obtenerFunciones, conectarFunciones, llamable } =
  vi.hoisted(() => ({
    inicializarApp: vi.fn(),
    conectarFirestore: vi.fn(),
    conectarAuth: vi.fn(),
    obtenerFunciones: vi.fn(),
    conectarFunciones: vi.fn(),
    llamable: vi.fn(),
  }))

vi.mock('firebase/app', () => ({ initializeApp: inicializarApp }))
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({})),
  connectAuthEmulator: conectarAuth,
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  connectFirestoreEmulator: conectarFirestore,
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(),
}))
vi.mock('firebase/functions', () => ({
  getFunctions: obtenerFunciones,
  connectFunctionsEmulator: conectarFunciones,
  httpsCallable: llamable,
}))

// Mismo contrato que .env.example: projectId placeholder tal cual se copia.
const ENV_EJEMPLO = {
  VITE_FIREBASE_API_KEY: 'placeholder-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'placeholder-auth-domain.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'placeholder-project-id',
  VITE_FIREBASE_STORAGE_BUCKET: 'placeholder-storage-bucket.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: 'placeholder-sender-id',
  VITE_FIREBASE_APP_ID: 'placeholder-app-id',
  VITE_USE_FIREBASE_EMULATORS: 'true',
}

beforeEach(() => {
  inicializarApp.mockReset()
  conectarFirestore.mockReset()
  conectarAuth.mockReset()
  obtenerFunciones.mockReset()
  conectarFunciones.mockReset()
  llamable.mockReset()
  // La app de Functions simulada: algo distinto de undefined para el Any.
  obtenerFunciones.mockReturnValue({})
})

describe('crearServiciosBackend: proyecto del Emulator Suite (GEN-46)', () => {
  it('usa demo-velmeya-local al conectar emuladores, igual que la siembra', () => {
    const resultado = crearServiciosBackend(ENV_EJEMPLO)
    expect(resultado.ok).toBe(true)
    expect(inicializarApp).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'demo-velmeya-local' }),
    )
    expect(conectarFirestore).toHaveBeenCalled()
    expect(conectarAuth).toHaveBeenCalled()
    expect(conectarFunciones).toHaveBeenCalledWith(expect.anything(), '127.0.0.1', 5001)
  })

  it('expone el puerto de reservas (GEN-51)', () => {
    const resultado = crearServiciosBackend(ENV_EJEMPLO)
    expect(resultado.ok).toBe(true)
    if (resultado.ok) {
      expect(typeof resultado.valor.puertoReservas.reservarPlaza).toBe('function')
      expect(typeof resultado.valor.puertoReservas.cancelarReserva).toBe('function')
      expect(typeof resultado.valor.puertoReservas.listarReservasDe).toBe('function')
    }
  })

  it('respeta el projectId del entorno cuando los emuladores están desactivados', () => {
    const resultado = crearServiciosBackend({
      ...ENV_EJEMPLO,
      VITE_USE_FIREBASE_EMULATORS: 'false',
      VITE_FIREBASE_PROJECT_ID: 'proj-sin-emuladores',
    })
    expect(resultado.ok).toBe(true)
    expect(inicializarApp).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'proj-sin-emuladores' }),
    )
    expect(conectarFirestore).not.toHaveBeenCalled()
    expect(conectarAuth).not.toHaveBeenCalled()
    expect(conectarFunciones).not.toHaveBeenCalled()
  })
})

describe('puente de reservas sobre el SDK real de Functions (GEN-51)', () => {
  it('desenvuelve .data al reservar: la reserva exitosa llega al dominio', async () => {
    const reserva = {
      id: 'r-1',
      claseId: 'c-1',
      usuarioId: 'u-1',
      estado: 'confirmada',
      creadaEn: '2027-01-01T10:00:00.000Z',
    }
    llamable.mockReturnValue(() => Promise.resolve({ data: reserva }))

    const resultado = crearServiciosBackend(ENV_EJEMPLO)
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    const reservada = await resultado.valor.puertoReservas.reservarPlaza('c-1')
    expect(reservada).toEqual({ ok: true, valor: reserva })
  })

  it('desenvuelve .data al cancelar: la cancelación exitosa llega al dominio', async () => {
    const reserva = {
      id: 'r-1',
      claseId: 'c-1',
      usuarioId: 'u-1',
      estado: 'cancelada',
      creadaEn: '2027-01-01T10:00:00.000Z',
      canceladaEn: '2027-01-02T10:00:00.000Z',
    }
    llamable.mockReturnValue(() => Promise.resolve({ data: reserva }))

    const resultado = crearServiciosBackend(ENV_EJEMPLO)
    expect(resultado.ok).toBe(true)
    if (!resultado.ok) return
    const cancelada = await resultado.valor.puertoReservas.cancelarReserva('r-1')
    expect(cancelada).toEqual({ ok: true, valor: reserva })
  })
})
