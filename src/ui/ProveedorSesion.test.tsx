import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { ReactNode } from 'react'
import { AuthFalso } from '../test/fakes'
import { ProveedorSesion } from './ProveedorSesion'
import { useSesion } from './sesion'
import type { SesionUsuario } from '../domain/puertos'

function envolverCon(authFalso: AuthFalso) {
  return function Envolvente({ children }: { children: ReactNode }) {
    return <ProveedorSesion puertoAuth={authFalso}>{children}</ProveedorSesion>
  }
}

describe('ProveedorSesion / useSesion', () => {
  let authFalso: AuthFalso

  beforeEach(() => {
    authFalso = new AuthFalso()
  })

  it('arranca en estado de carga y pasa a anónima cuando el adaptador notifica null', async () => {
    authFalso.emitirAlSuscribir = false
    const hook = renderHook(() => useSesion(), { wrapper: envolverCon(authFalso) })
    expect(hook.result.current.estado).toBe('cargando')

    act(() => {
      authFalso.definirSesion(null)
    })
    await waitFor(() => expect(hook.result.current.estado).toBe('anonima'))
  })

  it('pasa a autenticada con la sesión notificada por el adaptador', async () => {
    authFalso.emitirAlSuscribir = false
    const hook = renderHook(() => useSesion(), { wrapper: envolverCon(authFalso) })
    const sesion: SesionUsuario = { uid: 'uid-7', email: 'restaurada@demo.local' }

    act(() => {
      authFalso.definirSesion(sesion)
    })
    await waitFor(() => {
      expect(hook.result.current.estado).toBe('autenticada')
      expect(hook.result.current.sesion).toEqual(sesion)
    })
  })

  it('inicia en anónima cuando el adaptador emite sin sesión', async () => {
    const hook = renderHook(() => useSesion(), { wrapper: envolverCon(authFalso) })
    expect(hook.result.current.estado).toBe('anonima')
    expect(hook.result.current.sesion).toBeNull()
  })

  it('marca iniciando durante el intento y registra la petición', async () => {
    authFalso.respuestaDiferida = true
    const hook = renderHook(() => useSesion(), { wrapper: envolverCon(authFalso) })

    let promesaIniciacion!: Promise<void>
    act(() => {
      promesaIniciacion = hook.result.current.iniciarSesion('alumno@demo.local', 'demo1234')
    })
    expect(hook.result.current.iniciando).toBe(true)
    expect(authFalso.llamadasIniciarSesion).toEqual([
      { email: 'alumno@demo.local', contrasena: 'demo1234' },
    ])

    act(() => {
      authFalso.resolverInicioSesion({ ok: true, valor: { uid: 'u', email: 'a' } })
    })
    await act(async () => {
      await promesaIniciacion
    })
    expect(hook.result.current.iniciando).toBe(false)
    expect(hook.result.current.errorSesion).toBeNull()
  })

  it('expone un código de error estable y sigue anónima cuando falla el inicio', async () => {
    const hook = renderHook(() => useSesion(), { wrapper: envolverCon(authFalso) })
    authFalso.respuestaInicioSesion = { ok: false, errores: ['CREDENCIALES_INVALIDAS'] }

    await act(async () => {
      await hook.result.current.iniciarSesion('alumno@demo.local', 'mala')
    })
    expect(hook.result.current.errorSesion).toBe('CREDENCIALES_INVALIDAS')
    expect(hook.result.current.estado).toBe('anonima')
    expect(hook.result.current.iniciando).toBe(false)
  })

  it('limpia el error anterior al comenzar un nuevo intento', async () => {
    const hook = renderHook(() => useSesion(), { wrapper: envolverCon(authFalso) })
    authFalso.respuestaInicioSesion = { ok: false, errores: ['CREDENCIALES_INVALIDAS'] }
    await act(async () => {
      await hook.result.current.iniciarSesion('a@b.c', 'mala')
    })
    expect(hook.result.current.errorSesion).toBe('CREDENCIALES_INVALIDAS')

    authFalso.respuestaDiferida = true
    let segunda!: Promise<void>
    act(() => {
      segunda = hook.result.current.iniciarSesion('a@b.c', 'otra')
    })
    expect(hook.result.current.errorSesion).toBeNull()

    act(() => {
      authFalso.resolverInicioSesion({ ok: true, valor: { uid: 'u', email: 'a' } })
    })
    await act(async () => {
      await segunda
    })
  })

  it('cierra sesión a través del puerto y vuelve a anónima', async () => {
    authFalso.sesionActual = { uid: 'uid-7', email: 'alumno@demo.local' }
    const hook = renderHook(() => useSesion(), { wrapper: envolverCon(authFalso) })
    expect(hook.result.current.estado).toBe('autenticada')

    await act(async () => {
      await hook.result.current.cerrarSesion()
    })
    expect(authFalso.llamadasCerrarSesion).toBe(1)
    expect(hook.result.current.estado).toBe('anonima')
    expect(hook.result.current.sesion).toBeNull()
  })

  it('cancela la suscripción al desmontarse', () => {
    const hook = renderHook(() => useSesion(), { wrapper: envolverCon(authFalso) })
    hook.unmount()
    expect(authFalso.suscripciones).toBe(1)
    expect(authFalso.bajas).toBe(1)
  })

  it('falla si se usa fuera del proveedor', () => {
    expect(() => renderHook(() => useSesion())).toThrow(/ProveedorSesion/)
  })
})
