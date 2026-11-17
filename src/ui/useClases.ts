import { useCallback, useEffect, useState } from 'react'
import type { RepositorioClases } from '../domain/puertos'
import type { Clase } from '../domain/tipos'

export type EstadoCargaClases = 'cargando' | 'listado' | 'vacio' | 'error'

/**
 * Carga el listado de clases del repositorio con estados observables:
 * 'cargando' mientras consulta, 'listado'/'vacio' al resolver y 'error'
 * si falla. Ignora la respuesta si el componente se desmonta. `recargar`
 * vuelve a consultar (p. ej. tras una reserva cambia el contador de plazas).
 */
export function useClases(repositorio: RepositorioClases) {
  const [clases, setClases] = useState<Clase[]>([])
  const [estado, setEstado] = useState<EstadoCargaClases>('cargando')
  const [version, setVersion] = useState(0)

  const recargar = useCallback(() => {
    setVersion((valor) => valor + 1)
  }, [])

  useEffect(() => {
    let activo = true
    repositorio
      .listarClases()
      .then((resultado) => {
        if (!activo) return
        setClases(resultado)
        setEstado(resultado.length > 0 ? 'listado' : 'vacio')
      })
      .catch(() => {
        if (activo) setEstado('error')
      })
    return () => {
      activo = false
    }
  }, [repositorio, version])

  return { clases, estado, recargar } as const
}
