import { describe, expect, it } from 'vitest'
import { cancelar, filtrarConfirmadas, reservar, validarReserva } from './reserva'
import type { Reserva } from './tipos'

const clase = {
  id: 'c1',
  fechaInicio: '2026-12-01T10:00:00.000Z',
  capacidadPlazas: 3,
}
const ahora = '2026-11-01T10:00:00.000Z'

const reservaExistente = (datos: Partial<Reserva> = {}): Reserva => ({
  id: 'r0',
  claseId: 'c1',
  usuarioId: 'u9',
  estado: 'confirmada',
  creadaEn: ahora,
  ...datos,
})

describe('filtrarConfirmadas', () => {
  it('devuelve solo las reservas en estado confirmada', () => {
    const resultado = filtrarConfirmadas([
      reservaExistente({ id: 'r1', estado: 'confirmada' }),
      reservaExistente({ id: 'r2', estado: 'cancelada', canceladaEn: ahora }),
    ])
    expect(resultado.map((r) => r.id)).toEqual(['r1'])
  })
})

describe('reservar', () => {
  it('crea una reserva confirmada cuando hay plazas y el usuario no estaba inscrito', () => {
    const resultado = reservar(clase, [], 'u1', { id: 'r1', ahora })
    expect(resultado).toEqual({
      ok: true,
      valor: { id: 'r1', claseId: 'c1', usuarioId: 'u1', estado: 'confirmada', creadaEn: ahora },
    })
  })

  it('rechaza reservar una clase que ya empezó', () => {
    const pasado = { ...clase, fechaInicio: '2026-10-01T10:00:00.000Z' }
    expect(reservar(pasado, [], 'u1', { id: 'r1', ahora })).toEqual({
      ok: false,
      errores: ['CLASE_INICIADA'],
    })
  })

  it('rechaza cuando no quedan plazas', () => {
    const llenas = [
      reservaExistente({ id: 'r1', usuarioId: 'u1' }),
      reservaExistente({ id: 'r2', usuarioId: 'u2' }),
      reservaExistente({ id: 'r3', usuarioId: 'u3' }),
    ]
    expect(reservar(clase, llenas, 'u4', { id: 'r4', ahora })).toEqual({
      ok: false,
      errores: ['CLASE_COMPLETA'],
    })
  })

  it('rechaza reservas duplicadas del mismo usuario activas', () => {
    const activa = reservaExistente({ usuarioId: 'u1' })
    expect(reservar(clase, [activa], 'u1', { id: 'r2', ahora })).toEqual({
      ok: false,
      errores: ['YA_RESERVADA'],
    })
  })

  it('acumula los fallos de capacidad y duplicado', () => {
    const activa = reservaExistente({ usuarioId: 'u1' })
    const resultado = reservar({ ...clase, capacidadPlazas: 1 }, [activa], 'u1', { id: 'r2', ahora })
    expect(resultado).toEqual({
      ok: false,
      errores: ['CLASE_COMPLETA', 'YA_RESERVADA'],
    })
  })

  it('permite reservar de nuevo si la reserva previa está cancelada', () => {
    const anterior = reservaExistente({ usuarioId: 'u1', estado: 'cancelada', canceladaEn: ahora })
    const resultado = reservar(clase, [anterior], 'u1', { id: 'r2', ahora })
    expect(resultado.ok).toBe(true)
  })
})

describe('cancelar', () => {
  it('marca la reserva como cancelada y guarda la fecha', () => {
    const resultado = cancelar(reservaExistente(), clase, ahora)
    expect(resultado).toEqual({
      ok: true,
      valor: { ...reservaExistente(), estado: 'cancelada', canceladaEn: ahora },
    })
  })

  it('no cancela dos veces la misma reserva', () => {
    const yaCancelada = reservaExistente({ estado: 'cancelada', canceladaEn: ahora })
    expect(cancelar(yaCancelada, clase, ahora)).toEqual({ ok: false, errores: ['YA_CANCELADA'] })
  })

  it('no cancela una clase que ya empezó', () => {
    const iniciada = { ...clase, fechaInicio: '2026-10-01T10:00:00.000Z' }
    expect(cancelar(reservaExistente(), iniciada, ahora)).toEqual({
      ok: false,
      errores: ['CLASE_INICIADA'],
    })
  })
})

describe('validarReserva', () => {
  it('valida una reserva hidratada con todos los campos', () => {
    expect(
      validarReserva({
        id: 'r1',
        claseId: 'c1',
        usuarioId: 'u1',
        estado: 'confirmada',
        creadaEn: ahora,
      }),
    ).toEqual({
      ok: true,
      valor: { id: 'r1', claseId: 'c1', usuarioId: 'u1', estado: 'confirmada', creadaEn: ahora },
    })
  })

  it('exige id, clase y usuario; acumula errores', () => {
    expect(validarReserva({ claseId: '', usuarioId: '' })).toEqual({
      ok: false,
      errores: ['ID_REQUERIDO', 'CLASE_REQUERIDO', 'USUARIO_REQUERIDO', 'ESTADO_REQUERIDO', 'FECHA_INVALIDA'],
    })
  })

  it('rechaza estados fuera del catálogo', () => {
    expect(
      validarReserva({ id: 'r1', claseId: 'c1', usuarioId: 'u1', estado: 'pendiente', creadaEn: ahora }),
    ).toEqual({ ok: false, errores: ['ESTADO_INVALIDO'] })
  })

  it('rechaza cancelada sin fecha de cancelación', () => {
    expect(
      validarReserva({ id: 'r1', claseId: 'c1', usuarioId: 'u1', estado: 'cancelada', creadaEn: ahora }),
    ).toEqual({ ok: false, errores: ['CANCELADA_SIN_FECHA'] })
  })
})
