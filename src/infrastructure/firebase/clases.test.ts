import { getDocs, type Firestore } from 'firebase/firestore'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { crearRepositorioClases, desdeDocumentoClase } from './clases'

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  getDocs: vi.fn(),
}))

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

  it('copia el contador de ocupadas del documento al dominio (GEN-51)', () => {
    const resultado = desdeDocumentoClase('doc-7', { ...DOC_VALIDO, ocupadas: 5 })
    expect(resultado.ok).toBe(true)
    if (resultado.ok) expect(resultado.valor.ocupadas).toBe(5)
  })

  it('trata ocupadas con tipo inesperado como campo ausente (GEN-51)', () => {
    for (const ocupadas of ['5', null]) {
      const resultado = desdeDocumentoClase('doc-8', { ...DOC_VALIDO, ocupadas })
      expect(resultado.ok).toBe(true)
      if (resultado.ok) expect(resultado.valor.ocupadas).toBeUndefined()
    }
  })

  it('rechaza un contador no entero con OCUPADAS_INVALIDAS (GEN-51)', () => {
    const resultado = desdeDocumentoClase('doc-9', { ...DOC_VALIDO, ocupadas: 2.5 })
    expect(resultado).toEqual({ ok: false, errores: ['OCUPADAS_INVALIDAS'] })
  })

  it('ignora campos adicionales del documento', () => {
    const resultado = desdeDocumentoClase('doc-6', { ...DOC_VALIDO, notas: 'campo ajeno' })
    expect(resultado.ok).toBe(true)
    if (resultado.ok) expect('notas' in resultado.valor).toBe(false)
  })
})

describe('crearRepositorioClases', () => {
  beforeEach(() => {
    vi.mocked(getDocs).mockReset()
  })

  it('ordena por instante cronológico y no por cadena ISO con offsets distintos', async () => {
    // Orden lexicográfico que devuelve Firestore: "08:00:00Z" precede a
    // "09:00:00+02:00", pero ese instante (07:00Z) es el anterior.
    const documentos = [
      {
        id: 'clase-z',
        data: () => ({ ...DOC_VALIDO, fechaInicio: '2027-03-01T08:00:00Z' }),
      },
      {
        id: 'clase-offset',
        data: () => ({ ...DOC_VALIDO, fechaInicio: '2027-03-01T09:00:00+02:00' }),
      },
    ]
    vi.mocked(getDocs).mockResolvedValue({
      docs: documentos,
    } as unknown as Awaited<ReturnType<typeof getDocs>>)

    const repositorio = crearRepositorioClases({} as unknown as Firestore)
    const clases = await repositorio.listarClases()

    expect(clases.map((clase) => clase.id)).toEqual(['clase-offset', 'clase-z'])
  })
})
