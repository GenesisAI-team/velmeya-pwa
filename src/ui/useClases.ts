import { useEffect, useState } from 'react'
import type { RepositorioClases } from '../domain/puertos'
import type { Clase } from '../domain/tipos'

export type EstadoCargaClases = 'cargando' | 'listado' | 'vacio' | 'error'

/**
 * Carga el listado de clases del repositorio con estados observables:
 * 'cargando' mientras consulta, 'listado'/'vacio' al resolver y 'error'
 * si falla. Ignora la respuesta si el componente se desmonta.
 */
export function useClases(repositorio: RepositorioClases) {
  const [clases, setClases] = useState<Clase[]>([])
  const [estado, setEstado] = useState<EstadoCargaClases>('cargando')

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
  }, [repositorio])

  return { clases, estado } as const
}
