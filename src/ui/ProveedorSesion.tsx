import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { PuertoAuth, SesionUsuario } from '../domain/puertos'
import { ContextoSesion, type EstadoSesionUI, type EstadoVistaSesion } from './sesion'

interface PropiedadesProveedorSesion {
  puertoAuth: PuertoAuth
  children: ReactNode
}

/**
 * Proveedor de sesión: arranca en 'cargando' hasta que el puerto de Auth
 * notifica el primer estado (sesión restaurada o anónima) y expone las
 * acciones de inicio y cierre con códigos de error estables.
 */
export function ProveedorSesion({ puertoAuth, children }: PropiedadesProveedorSesion) {
  const [estado, setEstado] = useState<EstadoVistaSesion>('cargando')
  const [sesion, setSesion] = useState<SesionUsuario | null>(null)
  const [iniciando, setIniciando] = useState(false)
  const [errorSesion, setErrorSesion] = useState<string | null>(null)

  useEffect(() => {
    const baja = puertoAuth.suscribirseSesion((sesionNueva) => {
      setSesion(sesionNueva)
      setEstado(sesionNueva ? 'autenticada' : 'anonima')
    })
    return baja
  }, [puertoAuth])

  const iniciarSesion = useCallback(
    async (email: string, contrasena: string) => {
      setIniciando(true)
      setErrorSesion(null)
      const resultado = await puertoAuth.iniciarSesion(email, contrasena)
      setIniciando(false)
      if (!resultado.ok) {
        setErrorSesion(resultado.errores[0] ?? 'ERROR_AUTENTICACION')
      }
    },
    [puertoAuth],
  )

  const cerrarSesion = useCallback(async () => {
    await puertoAuth.cerrarSesion()
  }, [puertoAuth])

  const valor = useMemo<EstadoSesionUI>(
    () => ({ estado, sesion, iniciando, errorSesion, iniciarSesion, cerrarSesion }),
    [estado, sesion, iniciando, errorSesion, iniciarSesion, cerrarSesion],
  )

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>
}
