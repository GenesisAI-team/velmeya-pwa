import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { RepositorioClasesFalso, claseEjemplo } from '../test/fakes'
import { useClases } from './useClases'

describe('useClases', () => {
  let repositorioFalso: RepositorioClasesFalso

  beforeEach(() => {
    repositorioFalso = new RepositorioClasesFalso()
  })

  it('arranca en carga y pasa a listado con las clases del repositorio', async () => {
    repositorioFalso.clases = [claseEjemplo(), claseEjemplo({ id: 'clase-2', titulo: 'Yin 60' })]
    const hook = renderHook(() => useClases(repositorioFalso))
    expect(hook.result.current.estado).toBe('cargando')

    await waitFor(() => expect(hook.result.current.estado).toBe('listado'))
    expect(hook.result.current.clases).toHaveLength(2)
    expect(repositorioFalso.llamadasListar).toBe(1)
  })

  it('marca vacío cuando el repositorio no devuelve clases', async () => {
    const hook = renderHook(() => useClases(repositorioFalso))
    await waitFor(() => expect(hook.result.current.estado).toBe('vacio'))
    expect(hook.result.current.clases).toEqual([])
  })

  it('marca error cuando el repositorio rechaza', async () => {
    repositorioFalso.error = new Error('emulador apagado')
    const hook = renderHook(() => useClases(repositorioFalso))
    await waitFor(() => expect(hook.result.current.estado).toBe('error'))
    expect(hook.result.current.clases).toEqual([])
  })

  it('no actualiza el estado tras desmontarse (consulta huérfana)', async () => {
    repositorioFalso.clases = [claseEjemplo()]
    const hook = renderHook(() => useClases(repositorioFalso))
    hook.unmount()
    await act(async () => {
      await Promise.resolve()
    })
    expect(hook.result.current.estado).toBe('cargando')
  })

  it('recargar vuelve a consultar el repositorio (GEN-51)', async () => {
    repositorioFalso.clases = [claseEjemplo()]
    const hook = renderHook(() => useClases(repositorioFalso))
    await waitFor(() => expect(hook.result.current.estado).toBe('listado'))
    expect(repositorioFalso.llamadasListar).toBe(1)

    act(() => {
      hook.result.current.recargar()
    })
    await waitFor(() => expect(repositorioFalso.llamadasListar).toBe(2))
    expect(hook.result.current.estado).toBe('listado')
  })
})
