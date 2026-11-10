import { describe, expect, it } from 'vitest'
import { desdeDocumentoClase } from './clases'

const DOC_VALIDO = {
  titulo: 'Vinyasa 60',
  fechaInicio: '2027-01-15T09:00:00.000Z',
  duracionMinutos: 60,
  capacidadPlazas: 12,
}

describe('desdeDocumentoClase', () => {
  it('mapea un documento válido de Firestore a una Clase del dominio', () => {
    const resultado = desdeDocumentoClase('doc-1', DOC_VALIDO)
    expect(resultado).toEqual({
      ok: true,
      valor: { id: 'doc-1', ...DOC_VALIDO },
    })
  })

  it('incluye profesorId cuando existe en el documento', () => {
    const resultado = desdeDocumentoClase('doc-2', { ...DOC_VALIDO, profesorId: 'prof-9' })
    expect(resultado.ok).toBe(true)
    if (resultado.ok) expect(resultado.valor.profesorId).toBe('prof-9')
  })

  it('acumula los errores de validación del dominio', () => {
    const resultado = desdeDocumentoClase('doc-3', {
      fechaInicio: 'no-es-fecha',
      duracionMinutos: 0,
      capacidadPlazas: -1,
    })
    expect(resultado).toEqual({
      ok: false,
      errores: ['TITULO_REQUERIDO', 'FECHA_INVALIDA', 'DURACION_INVALIDA', 'CAPACIDAD_INVALIDA'],
    })
  })

  it('marca ID_REQUERIDO si el identificador llega vacío', () => {
    const resultado = desdeDocumentoClase('   ', { ...DOC_VALIDO })
    expect(resultado).toEqual({ ok: false, errores: ['ID_REQUERIDO'] })
  })

  it('trata tipos incorrectos como campos ausentes sin lanzar excepciones', () => {
    const resultado = desdeDocumentoClase('doc-4', {
      titulo: 42,
      fechaInicio: null,
      duracionMinutos: '60',
      capacidadPlazas: true,
    })
    expect(resultado).toEqual({
      ok: false,
      errores: ['TITULO_REQUERIDO', 'FECHA_INVALIDA', 'DURACION_INVALIDA', 'CAPACIDAD_INVALIDA'],
    })
  })

  it('trata null en profesorId como campo ausente', () => {
    const resultado = desdeDocumentoClase('doc-5', { ...DOC_VALIDO, profesorId: null })
    expect(resultado.ok).toBe(true)
    if (resultado.ok) expect(resultado.valor.profesorId).toBeUndefined()
  })

  it('ignora campos adicionales del documento', () => {
    const resultado = desdeDocumentoClase('doc-6', { ...DOC_VALIDO, notas: 'campo ajeno' })
    expect(resultado.ok).toBe(true)
    if (resultado.ok) expect('notas' in resultado.valor).toBe(false)
  })
})
