import type { Validacion } from '../../domain/tipos'

// Contrato de infraestructura Firebase (solo configuración; GEN-35).
// La inicialización real de app/auth/firestore llega en issues posteriores.

export interface ConfigFirebase {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

export type FuenteEnv = Record<string, string | undefined>

export const CLAVES_CONFIG_FIREBASE = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const

const CAMPOS_POR_CLAVE: Record<(typeof CLAVES_CONFIG_FIREBASE)[number], keyof ConfigFirebase> = {
  VITE_FIREBASE_API_KEY: 'apiKey',
  VITE_FIREBASE_AUTH_DOMAIN: 'authDomain',
  VITE_FIREBASE_PROJECT_ID: 'projectId',
  VITE_FIREBASE_STORAGE_BUCKET: 'storageBucket',
  VITE_FIREBASE_MESSAGING_SENDER_ID: 'messagingSenderId',
  VITE_FIREBASE_APP_ID: 'appId',
}

export function cargarConfigFirebase(env: FuenteEnv): Validacion<ConfigFirebase> {
  const errores: string[] = []
  const valores: Partial<ConfigFirebase> = {}

  for (const clave of CLAVES_CONFIG_FIREBASE) {
    const valor = env[clave]?.trim()
    if (!valor) {
      errores.push(`${clave}_REQUERIDA`)
      continue
    }
    valores[CAMPOS_POR_CLAVE[clave]] = valor
  }

  if (errores.length > 0) return { ok: false, errores }

  return { ok: true, valor: valores as ConfigFirebase }
}

/**
 * true cuando VITE_USE_FIREBASE_EMULATORS === 'true'.
 * Nunca debe ser true en entornos reales de despliegue; ver docs/WORKFLOW.md.
 */
export function usarEmuladores(env: FuenteEnv): boolean {
  return env.VITE_USE_FIREBASE_EMULATORS === 'true'
}
