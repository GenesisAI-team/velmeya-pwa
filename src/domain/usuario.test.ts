import { describe, expect, it } from 'vitest'
import { validarUsuario } from './usuario'

describe('validarUsuario', () => {
  it('acepta un usuario correcto y normaliza nombre y email', () => {
    const resultado = validarUsuario({ id: 'u1', nombre: '  Ana  ', email: ' ANA@Estudio.com ', rol: 'alumno' })
    expect(resultado).toEqual({
      ok: true,
      valor: { id: 'u1', nombre: 'Ana', email: 'ana@estudio.com', rol: 'alumno' },
    })
  })

  it('exige id, nombre y email; acumula errores sin cortar en el primero', () => {
    const resultado = validarUsuario({ nombre: '', email: 'sin-arroba', rol: 'alumno' })
    expect(resultado).toEqual({
      ok: false,
      errores: ['ID_REQUERIDO', 'NOMBRE_REQUERIDO', 'EMAIL_INVALIDO'],
    })
  })

  it('rechaza un rol fuera del catálogo', () => {
    const resultado = validarUsuario({ id: 'u2', nombre: 'Bea', email: 'bea@estudio.com', rol: 'jefe' })
    expect(resultado).toEqual({ ok: false, errores: ['ROL_INVALIDO'] })
  })

  it('rechaza email sin dominio', () => {
    const resultado = validarUsuario({ id: 'u3', nombre: 'Carlos', email: 'carlos@', rol: 'profesor' })
    expect(resultado).toEqual({ ok: false, errores: ['EMAIL_INVALIDO'] })
  })
})
