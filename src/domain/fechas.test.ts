import { describe, expect, it } from 'vitest'
import { esEnteroEnRango, esFechaISO, partesFechaISO } from './fechas'

describe('esFechaISO (regresión GEN-35)', () => {
  it('acepta instantes ISO 8601 válidos', () => {
    expect(esFechaISO('2026-12-01T10:00:00.000Z')).toBe(true)
    expect(esFechaISO('2027-03-01T18:30:00+01:00')).toBe(true)
  })

  it('rechaza cadenas que no son instantes ISO', () => {
    expect(esFechaISO('no-es-fecha')).toBe(false)
    expect(esFechaISO('')).toBe(false)
  })
})

describe('partesFechaISO', () => {
  it('separa fecha y hora de un instante ISO en Z', () => {
    expect(partesFechaISO('2026-12-01T10:30:00.000Z')).toEqual({
      fecha: '2026-12-01',
      hora: '10:30',
    })
  })

  it('mantiene la hora local tal como está escrita con offset', () => {
    expect(partesFechaISO('2027-03-01T18:45:00+02:00')).toEqual({
      fecha: '2027-03-01',
      hora: '18:45',
    })
  })

  it('devuelve null para cadenas que no son instantes ISO', () => {
    expect(partesFechaISO('no-es-fecha')).toBeNull()
    expect(partesFechaISO('')).toBeNull()
  })
})

describe('esEnteroEnRango (regresión GEN-35)', () => {
  it('valida enteros dentro del rango', () => {
    expect(esEnteroEnRango(60, 1, 480)).toBe(true)
    expect(esEnteroEnRango(0, 1, 480)).toBe(false)
    expect(esEnteroEnRango(undefined, 1, 480)).toBe(false)
  })
})
