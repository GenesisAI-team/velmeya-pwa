// Traducción de códigos de Firebase Auth a códigos de error estables del
// proyecto (patrón Validacion<T>, ver AGENTS.md). La lista cubre los errores
// del flujo de inicio de sesión con email y contraseña; cualquier código
// desconocido cae en el genérico.

export const ERROR_AUTENTICACION_GENERICO = 'ERROR_AUTENTICACION'

const MAPA_ERRORES_AUTH: Record<string, string> = {
  'auth/invalid-email': 'EMAIL_INVALIDO',
  'auth/missing-email': 'EMAIL_REQUERIDO',
  'auth/invalid-credential': 'CREDENCIALES_INVALIDAS',
  'auth/user-not-found': 'CREDENCIALES_INVALIDAS',
  'auth/wrong-password': 'CREDENCIALES_INVALIDAS',
  'auth/missing-password': 'CONTRASENA_REQUERIDA',
  'auth/invalid-password': 'CONTRASENA_INVALIDA',
  'auth/weak-password': 'CONTRASENA_INVALIDA',
  'auth/user-disabled': 'USUARIO_DESHABILITADO',
  'auth/too-many-requests': 'DEMASIADOS_INTENTOS',
  'auth/network-request-failed': 'ERROR_RED',
  'auth/internal-error': 'ERROR_AUTENTICACION',
}

export function mapearErrorAuth(codigoFirebase: string): string {
  return MAPA_ERRORES_AUTH[codigoFirebase] ?? ERROR_AUTENTICACION_GENERICO
}

/** Extrae el código `auth/...` de un error del SDK de Firebase sin suponer su tipo. */
export function codigoErrorFirebase(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code: unknown }).code)
  }
  return ''
}
