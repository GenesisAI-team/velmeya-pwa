import { describe, expect, it } from 'vitest'
import type { Firestore } from 'firebase/firestore'
import {
  crearAdaptadorReservas,
  desdeDocumentoReserva,
  mapearErrorFunciones,
  ordenarReservasPorCreacion,
  type LlamadorFunciones,
} from './reservas'
import type { Reserva } from '../../domain/tipos'

// Sin Firebase: la base solo se usa en listarReservasDe (suite de emuladores);
// las operaciones llaman a la función inyectada.

const BASE_INUTIL = {} as Firestore

interface LlamadorFalso {
  llamar: LlamadorFunciones
  llamadas: Array<{ nombre: string; entrada: unknown }>
}

function llamarFalso(opciones: { respuesta?: unknown; error?: unknown }): LlamadorFalso {
  const llamadas: Array<{ nombre: string; entrada: unknown }> = []
  const llamar: LlamadorFunciones = async (nombre, entrada) => {
    llamadas.push({ nombre, entrada })
    if (opciones.error !== undefined) throw opciones.error
    return opciones.respuesta
  }
  return { llamar, llamadas }
}

function reservaPlana(sobrescritura: Partial<Reserva> = {}): Record<string, unknown> {
  return {
    id: 'reserva-1',
    claseId: 'clase-1',
    usuarioId: 'usuario-1',
    estado: 'confirmada',
    creadaEn: '2026-12-01T08:00:00.000Z',
    ...sobrescritura,
  }
}

describe('mapearErrorFunciones: códigos estables del servidor (GEN-51)', () => {
  it('extrae los códigos del mensaje cuando son estables', () => {
    expect(mapearErrorFunciones({ code: 'functions/failed-precondition', message: 'CLASE_COMPLETA' })).toEqual(['CLASE_COMPLETA'])
    expect(mapearErrorFunciones({ code: 'functions/failed-precondition', message: 'YA_RESERVADA' })).toEqual(['YA_RESERVADA'])
    expect(mapearErrorFunciones({ code: 'functions/failed-precondition', message: 'YA_CANCELADA' })).toEqual(['YA_CANCELADA'])
  })

  it('acumula varios códigos separados por comas', () => {
    expect(
      mapearErrorFunciones({ code: 'functions/failed-precondition', message: 'CLASE_COMPLETA,YA_RESERVADA' }),
    ).toEqual(['CLASE_COMPLETA', 'YA_RESERVADA'])
  })

  it('devuelve SESION_REQUERIDA ante un error unauthenticated sin mensaje estable', () => {
    expect(mapearErrorFunciones({ code: 'functions/unauthenticated', message: 'sin sesión' })).toEqual([
      'SESION_REQUERIDA',
    ])
  })

  it('devuelve ERROR_SERVIDOR ante fallos de transporte u objetos desconocidos', () => {
    expect(mapearErrorFunciones({ code: 'functions/unavailable', message: 'backend error' })).toEqual([
      'ERROR_SERVIDOR',
    ])
    expect(mapearErrorFunciones('fallo raro')).toEqual(['ERROR_SERVIDOR'])
    expect(mapearErrorFunciones(undefined)).toEqual(['ERROR_SERVIDOR'])
  })
})

describe('crearAdaptadorReservas: reservar y cancelar vía Functions (GEN-51)', () => {
  it('reserva una plaza y devuelve la reserva validada con el dominio', async () => {
    const falso = llamarFalso({ respuesta: reservaPlana() })
    const adaptador = crearAdaptadorReservas(BASE_INUTIL, falso.llamar)

    const resultado = await adaptador.reservarPlaza('clase-1')

    expect(resultado).toEqual({
      ok: true,
      valor: {
        id: 'reserva-1',
        claseId: 'clase-1',
        usuarioId: 'usuario-1',
        estado: 'confirmada',
        creadaEn: '2026-12-01T08:00:00.000Z',
      },
    })
    expect(falso.llamadas).toEqual([
      { nombre: 'reservarPlaza', entrada: { claseId: 'clase-1' } },
    ])
  })

  it('devuelve los códigos del servidor cuando la reserva falla (p. ej. CLASE_COMPLETA)', async () => {
    const falso = llamarFalso({
      error: { code: 'functions/failed-precondition', message: 'CLASE_COMPLETA' },
    })
    const adaptador = crearAdaptadorReservas(BASE_INUTIL, falso.llamar)

    const resultado = await adaptador.reservarPlaza('clase-1')
    expect(resultado).toEqual({ ok: false, errores: ['CLASE_COMPLETA'] })
  })

  it('exige un id de clase no vacío sin llamar al servidor', async () => {
    const falso = llamarFalso({ respuesta: reservaPlana() })
    const adaptador = crearAdaptadorReservas(BASE_INUTIL, falso.llamar)

    const resultado = await adaptador.reservarPlaza('   ')
    expect(resultado).toEqual({ ok: false, errores: ['ID_REQUERIDO'] })
    expect(falso.llamadas).toHaveLength(0)
  })

  it('devuelve RESPUESTA_INVALIDA si la respuesta del servidor no cumple el dominio', async () => {
    const falso = llamarFalso({ respuesta: { estado: 'imposible' } })
    const adaptador = crearAdaptadorReservas(BASE_INUTIL, falso.llamar)

    const resultado = await adaptador.reservarPlaza('clase-1')
    expect(resultado).toEqual({ ok: false, errores: ['RESPUESTA_INVALIDA'] })
  })

  it('cancela una reserva propia y devuelve el resultado validado', async () => {
    const falso = llamarFalso({
      respuesta: reservaPlana({ estado: 'cancelada', canceladaEn: '2026-12-02T08:00:00.000Z' }),
    })
    const adaptador = crearAdaptadorReservas(BASE_INUTIL, falso.llamar)

    const resultado = await adaptador.cancelarReserva('reserva-1')
    expect(resultado.ok).toBe(true)
    expect(falso.llamadas).toEqual([
      { nombre: 'cancelarReserva', entrada: { reservaId: 'reserva-1' } },
    ])
  })

  it('devuelve YA_CANCELADA cuando la cancelación ya se había hecho', async () => {
    const falso = llamarFalso({
      error: { code: 'functions/failed-precondition', message: 'YA_CANCELADA' },
    })
    const adaptador = crearAdaptadorReservas(BASE_INUTIL, falso.llamar)

    const resultado = await adaptador.cancelarReserva('reserva-1')
    expect(resultado).toEqual({ ok: false, errores: ['YA_CANCELADA'] })
  })
})

describe('mapeo de documentos de reserva (GEN-51)', () => {
  it('valida un documento correcto', () => {
    expect(
      desdeDocumentoReserva('r1', {
        claseId: 'clase-1',
        usuarioId: 'usuario-1',
        estado: 'confirmada',
        creadaEn: '2026-12-01T08:00:00.000Z',
      }),
    ).toEqual({
      ok: true,
      valor: {
        id: 'r1',
        claseId: 'clase-1',
        usuarioId: 'usuario-1',
        estado: 'confirmada',
        creadaEn: '2026-12-01T08:00:00.000Z',
      },
    })
  })

  it('acumula los errores de un documento corrupto', () => {
    const resultado = desdeDocumentoReserva('r2', { estado: 'rara' })
    expect(resultado.ok).toBe(false)
    if (!resultado.ok) {
      expect(resultado.errores).toContain('CLASE_REQUERIDO')
      expect(resultado.errores).toContain('ESTADO_INVALIDO')
    }
  })
})

describe('ordenarReservasPorCreacion (GEN-51)', () => {
  it('ordena por el instante de creación, la más reciente primero', () => {
    const tardia = reservaPlana({ id: 'tardia', creadaEn: '2026-12-02T10:00:00.000Z' }) as unknown as Reserva
    const temprana = reservaPlana({ id: 'temprana', creadaEn: '2026-12-01T08:00:00.000Z' }) as unknown as Reserva
    // Distintos offsets con el mismo instante: el orden es cronológico.
    const conOffset = reservaPlana({
      id: 'con-offset',
      creadaEn: '2026-12-02T12:00:00.000+02:00',
    }) as unknown as Reserva

    const ordenadas = ordenarReservasPorCreacion([tardia, conOffset, temprana])
    expect(ordenadas.map((reserva) => reserva.id)).toEqual(['tardia', 'con-offset', 'temprana'])
  })

  it('no muta la lista original', () => {
    const tardia = reservaPlana({ id: 'tardia', creadaEn: '2026-12-02T10:00:00.000Z' }) as unknown as Reserva
    const temprana = reservaPlana({ id: 'temprana', creadaEn: '2026-12-01T08:00:00.000Z' }) as unknown as Reserva
    const original = [tardia, temprana]
    ordenarReservasPorCreacion(original)
    expect(original.map((reserva) => reserva.id)).toEqual(['tardia', 'temprana'])
  })
})

describe('comportamiento general del adaptador', () => {
  it('usa las funciones transaccionales reservarPlaza y cancelarReserva', async () => {
    const falso = llamarFalso({ respuesta: reservaPlana() })
    const adaptador = crearAdaptadorReservas(BASE_INUTIL, falso.llamar)
    await adaptador.reservarPlaza('c1')
    await adaptador.cancelarReserva('r1')
    expect(falso.llamadas.map((llamada) => llamada.nombre)).toEqual([
      'reservarPlaza',
      'cancelarReserva',
    ])
  })

  it('no deja colgar la promesa ante errores síncronos del llamador', async () => {
    const llamadorQueExplota: LlamadorFunciones = () => {
      throw new Error('fallo síncrono')
    }
    const adaptador = crearAdaptadorReservas(BASE_INUTIL, llamadorQueExplota)
    await expect(adaptador.reservarPlaza('c1')).resolves.toEqual({
      ok: false,
      errores: ['ERROR_SERVIDOR'],
    })
  })
})
