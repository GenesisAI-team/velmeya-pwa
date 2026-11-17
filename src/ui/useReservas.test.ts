import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PuertoReservasFalso, reservaEjemplo } from '../test/fakes'
import { useGestionReservas } from './useReservas'

describe('useGestionReservas (GEN-51)', () => {
  let puerto: PuertoReservasFalso
  let avisoCambio: ReturnType<typeof vi.fn<() => void>>

  beforeEach(() => {
    puerto = new PuertoReservasFalso()
    avisoCambio = vi.fn<() => void>()
  })

  describe('listado de reservas propias', () => {
    it('sin sesión no consulta y queda vacío', () => {
      const hook = renderHook(() => useGestionReservas(puerto, null, avisoCambio))
      expect(hook.result.current.estadoReservas).toBe('vacio')
      expect(hook.result.current.reservas).toEqual([])
      expect(puerto.llamadasListar).toEqual([])
    })

    it('con sesión carga las reservas del usuario (más recientes ya ordenadas)', async () => {
      puerto.reservas = [
        reservaEjemplo({ id: 'r1', claseId: 'clase-1' }),
        reservaEjemplo({ id: 'r2', claseId: 'clase-2', estado: 'cancelada' }),
      ]
      const hook = renderHook(() => useGestionReservas(puerto, 'usuario-1', avisoCambio))
      expect(hook.result.current.estadoReservas).toBe('cargando')
      await waitFor(() => expect(hook.result.current.estadoReservas).toBe('listado'))
      expect(hook.result.current.reservas).toHaveLength(2)
      expect(puerto.llamadasListar).toEqual(['usuario-1'])
    })

    it('marca vacío cuando el usuario no tiene reservas', async () => {
      const hook = renderHook(() => useGestionReservas(puerto, 'usuario-1', avisoCambio))
      await waitFor(() => expect(hook.result.current.estadoReservas).toBe('vacio'))
    })

    it('marca error si la consulta de reservas falla', async () => {
      puerto.errorListar = new Error('emulador apagado')
      const hook = renderHook(() => useGestionReservas(puerto, 'usuario-1', avisoCambio))
      await waitFor(() => expect(hook.result.current.estadoReservas).toBe('error'))
    })

    it('no actualiza el estado tras desmontarse', async () => {
      puerto.reservas = [reservaEjemplo()]
      const hook = renderHook(() => useGestionReservas(puerto, 'usuario-1', avisoCambio))
      hook.unmount()
      await act(async () => {
        await Promise.resolve()
      })
      expect(hook.result.current.estadoReservas).toBe('cargando')
    })

    it('recarga el listado cuando cambia el usuario de la sesión', async () => {
      const hook = renderHook(
        ({ uid }) => useGestionReservas(puerto, uid, avisoCambio),
        { initialProps: { uid: 'usuario-1' as string | null } },
      )
      await waitFor(() => expect(hook.result.current.estadoReservas).toBe('vacio'))
      act(() => {
        hook.rerender({ uid: 'usuario-2' })
      })
      await waitFor(() => expect(puerto.llamadasListar).toEqual(['usuario-1', 'usuario-2']))
    })

    it('recargar consulta de nuevo y avisa a quien quiera refrescar los horarios', async () => {
      const hook = renderHook(() => useGestionReservas(puerto, 'usuario-1', avisoCambio))
      await waitFor(() => expect(hook.result.current.estadoReservas).toBe('vacio'))
      act(() => {
        hook.result.current.recargar()
      })
      await waitFor(() => expect(puerto.llamadasListar).toHaveLength(2))
      expect(avisoCambio).toHaveBeenCalled()
    })
  })

  describe('reservar plaza', () => {
    it('resultado correcto, tipo reserva, recarga listado y avisa de cambios', async () => {
      const hook = renderHook(() => useGestionReservas(puerto, 'usuario-1', avisoCambio))
      await waitFor(() => expect(hook.result.current.estadoReservas).toBe('vacio'))
      avisoCambio.mockClear()

      await act(async () => {
        await hook.result.current.reservar('clase-1')
      })
      expect(puerto.llamadasReservar).toEqual(['clase-1'])
      expect(hook.result.current.enCurso).toBe(false)
      expect(hook.result.current.tipoResultado).toBe('reserva')
      expect(hook.result.current.resultado?.ok).toBe(true)
      expect(puerto.llamadasListar).toHaveLength(2)
      expect(avisoCambio).toHaveBeenCalledTimes(1)
    })

    it('guarda los códigos de error de una reserva fallida sin recargar', async () => {
      puerto.resultadoReservar = { ok: false, errores: ['CLASE_COMPLETA'] }
      const hook = renderHook(() => useGestionReservas(puerto, 'usuario-1', avisoCambio))
      await waitFor(() => expect(hook.result.current.estadoReservas).toBe('vacio'))

      await act(async () => {
        await hook.result.current.reservar('clase-1')
      })
      expect(hook.result.current.resultado).toEqual({ ok: false, errores: ['CLASE_COMPLETA'] })
      expect(hook.result.current.tipoResultado).toBe('reserva')
      expect(puerto.llamadasListar).toHaveLength(1)
      expect(avisoCambio).not.toHaveBeenCalled()
    })

    it('ignora una segunda acción mientras la primera sigue en curso', async () => {
      puerto.accionDiferida = true
      const hook = renderHook(() => useGestionReservas(puerto, 'usuario-1', avisoCambio))
      await waitFor(() => expect(hook.result.current.estadoReservas).toBe('vacio'))

      let primera: Promise<unknown>
      act(() => {
        primera = hook.result.current.reservar('clase-1')
      })
      expect(hook.result.current.enCurso).toBe(true)

      await act(async () => {
        const segunda = await hook.result.current.reservar('clase-2')
        expect(segunda).toEqual({ ok: false, errores: ['ACCION_EN_CURSO'] })
        puerto.resolverAccion({ ok: true, valor: reservaEjemplo() })
        await primera
      })
      expect(puerto.llamadasReservar).toEqual(['clase-1'])
      expect(hook.result.current.enCurso).toBe(false)
    })

    it('traduce una excepción del puerto a ERROR_SERVIDOR', async () => {
      puerto.reservarPlaza = async () => {
        throw new Error('fallo de red')
      }
      const hook = renderHook(() => useGestionReservas(puerto, 'usuario-1', avisoCambio))
      await waitFor(() => expect(hook.result.current.estadoReservas).toBe('vacio'))
      await act(async () => {
        await hook.result.current.reservar('clase-1')
      })
      expect(hook.result.current.resultado).toEqual({ ok: false, errores: ['ERROR_SERVIDOR'] })
    })
  })

  describe('cancelar reserva', () => {
    it('resultado correcto, tipo cancelacion, recarga listado y avisa de cambios', async () => {
      const hook = renderHook(() => useGestionReservas(puerto, 'usuario-1', avisoCambio))
      await waitFor(() => expect(hook.result.current.estadoReservas).toBe('vacio'))

      await act(async () => {
        await hook.result.current.cancelar('reserva-1')
      })
      expect(puerto.llamadasCancelar).toEqual(['reserva-1'])
      expect(hook.result.current.tipoResultado).toBe('cancelacion')
      expect(hook.result.current.resultado?.ok).toBe(true)
      expect(puerto.llamadasListar).toHaveLength(2)
      expect(avisoCambio).toHaveBeenCalledTimes(1)
    })

    it('guarda YA_CANCELADA como código estable sin recargar', async () => {
      puerto.resultadoCancelar = { ok: false, errores: ['YA_CANCELADA'] }
      const hook = renderHook(() => useGestionReservas(puerto, 'usuario-1', avisoCambio))
      await waitFor(() => expect(hook.result.current.estadoReservas).toBe('vacio'))

      await act(async () => {
        await hook.result.current.cancelar('reserva-1')
      })
      expect(hook.result.current.resultado).toEqual({ ok: false, errores: ['YA_CANCELADA'] })
      expect(puerto.llamadasListar).toHaveLength(1)
      expect(avisoCambio).not.toHaveBeenCalled()
    })
  })
})
