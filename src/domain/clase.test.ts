import { describe, expect, it } from 'vitest'
import { plazasDisponibles, validarClase } from './clase'
import type { Reserva } from './tipos'

const claseValida = {
  id: 'c1',
  titulo: 'Vinyasa 60',
  fechaInicio: '2026-12-01T10:00:00.000Z',
  duracionMinutos: 60,
  capacidadPlazas: 12,
}

describe('validarClase', () => {
  it('acepta una clase correcta', () => {
    expect(validarClase(claseValida)).toEqual({ ok: true, valor: claseValida })
  })

  it('acepta una clase sin profesorId', () => {
    const resultado = validarClase(claseValida)
    expect(resultado.ok).toBe(true)
  })

  it('acumula errores de campos vacíos y valores fuera de rango', () => {
    const resultado = validarClase({
      titulo: '   ',
      fechaInicio: 'no-es-fecha',
      duracionMinutos: 0,
      capacidadPlazas: -3,
    })
    expect(resultado).toEqual({
      ok: false,
      errores: ['ID_REQUERIDO', 'TITULO_REQUERIDO', 'FECHA_INVALIDA', 'DURACION_INVALIDA', 'CAPACIDAD_INVALIDA'],
    })
  })

  it('rechaza duración no entera o mayor de 480 minutos', () => {
    expect(validarClase({ ...claseValida, duracionMinutos: 61.5 })).toEqual({
      ok: false,
      errores: ['DURACION_INVALIDA'],
    })
    expect(validarClase({ ...claseValida, duracionMinutos: 481 })).toEqual({
      ok: false,
      errores: ['DURACION_INVALIDA'],
    })
  })

  it('rechaza capacidad no entera o mayor de 200 plazas', () => {
    expect(validarClase({ ...claseValida, capacidadPlazas: 2.5 })).toEqual({
      ok: false,
      errores: ['CAPACIDAD_INVALIDA'],
    })
    expect(validarClase({ ...claseValida, capacidadPlazas: 201 })).toEqual({
      ok: false,
      errores: ['CAPACIDAD_INVALIDA'],
    })
  })

  it('rechaza profesorId vacío si viene presente', () => {
    expect(validarClase({ ...claseValida, profesorId: '' })).toEqual({
      ok: false,
      errores: ['PROFESOR_INVALIDO'],
    })
  })
})

describe('plazasDisponibles', () => {
  const reservas: Reserva[] = [
    { id: 'r1', claseId: 'c1', usuarioId: 'u1', estado: 'confirmada', creadaEn: '2026-11-01T08:00:00.000Z' },
    { id: 'r2', claseId: 'c1', usuarioId: 'u2', estado: 'confirmada', creadaEn: '2026-11-01T09:00:00.000Z' },
    { id: 'r3', claseId: 'c1', usuarioId: 'u3', estado: 'cancelada', creadaEn: '2026-11-01T10:00:00.000Z', canceladaEn: '2026-11-02T10:00:00.000Z' },
    { id: 'r4', claseId: 'otra-clase', usuarioId: 'u4', estado: 'confirmada', creadaEn: '2026-11-01T11:00:00.000Z' },
  ]

  it('cuenta solo reservas confirmadas de esa clase', () => {
    expect(plazasDisponibles({ ...claseValida, capacidadPlazas: 3 }, reservas)).toBe(1)
  })

  it('no devuelve plazas negativas al sobrepasar la capacidad', () => {
    const llenas: Reserva[] = reservas.filter((r) => r.claseId === 'c1')
    expect(plazasDisponibles({ ...claseValida, capacidadPlazas: 2 }, llenas)).toBe(0)
  })
})
