import { describe, expect, it } from 'vitest'
import { ERROR_AUTENTICACION_GENERICO, mapearErrorAuth } from './erroresAuth'

describe('mapearErrorAuth', () => {
  it('mapea un email con formato inválido', () => {
    expect(mapearErrorAuth('auth/invalid-email')).toBe('EMAIL_INVALIDO')
  })

  it('mapea credenciales incorrectas a un único código estable', () => {
    expect(mapearErrorAuth('auth/invalid-credential')).toBe('CREDENCIALES_INVALIDAS')
    expect(mapearErrorAuth('auth/user-not-found')).toBe('CREDENCIALES_INVALIDAS')
    expect(mapearErrorAuth('auth/wrong-password')).toBe('CREDENCIALES_INVALIDAS')
  })

  it('mapea contraseñas problemáticas', () => {
    expect(mapearErrorAuth('auth/missing-password')).toBe('CONTRASENA_REQUERIDA')
    expect(mapearErrorAuth('auth/invalid-password')).toBe('CONTRASENA_INVALIDA')
    expect(mapearErrorAuth('auth/weak-password')).toBe('CONTRASENA_INVALIDA')
  })

  it('mapea un email ausente', () => {
    expect(mapearErrorAuth('auth/missing-email')).toBe('EMAIL_REQUERIDO')
  })

  it('mapea usuario deshabilitado', () => {
    expect(mapearErrorAuth('auth/user-disabled')).toBe('USUARIO_DESHABILITADO')
  })

  it('mapea demasiados intentos y fallos de red', () => {
    expect(mapearErrorAuth('auth/too-many-requests')).toBe('DEMASIADOS_INTENTOS')
    expect(mapearErrorAuth('auth/network-request-failed')).toBe('ERROR_RED')
  })

  it('devuelve un código genérico para errores desconocidos o vacíos', () => {
    expect(mapearErrorAuth('auth/codigo-inventado')).toBe(ERROR_AUTENTICACION_GENERICO)
    expect(mapearErrorAuth('')).toBe(ERROR_AUTENTICACION_GENERICO)
  })
})
