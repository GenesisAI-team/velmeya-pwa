import { createContext, useContext } from 'react'
import type { SesionUsuario } from '../domain/puertos'

// Estado y contexto de sesión para la UI: consumidos por useSesion y
// alimentados por ProveedorSesion a partir de un PuertoAuth.

export type EstadoVistaSesion = 'cargando' | 'anonima' | 'autenticada'

export interface EstadoSesionUI {
  estado: EstadoVistaSesion
  sesion: SesionUsuario | null
  /** true mientras hay una petición de inicio de sesión en curso. */
  iniciando: boolean
  /** Código de error estable del último intento fallido, o null. */
  errorSesion: string | null
  iniciarSesion(email: string, contrasena: string): Promise<void>
  cerrarSesion(): Promise<void>
}

export const ContextoSesion = createContext<EstadoSesionUI | null>(null)

export function useSesion(): EstadoSesionUI {
  const contexto = useContext(ContextoSesion)
  if (!contexto) {
    throw new Error('useSesion debe usarse dentro de ProveedorSesion')
  }
  return contexto
}
