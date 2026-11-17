import { useCallback, useEffect, useState } from 'react'
import type { PuertoReservas } from '../domain/puertos'
import type { Reserva, Validacion } from '../domain/tipos'

export type EstadoCargaReservas = 'cargando' | 'listado' | 'vacio' | 'error'

/** Qué acción produjo el resultado de la última operación de reservas. */
export type TipoAccionReserva = 'reserva' | 'cancelacion' | null

export interface GestionReservas {
  /** Reservas propias del usuario con sesión (vacías si no hay sesión). */
  reservas: Reserva[]
  estadoReservas: EstadoCargaReservas
  /** true mientras hay una reserva o cancelación en curso. */
  enCurso: boolean
  /** Resultado de la última acción (Validacion<Reserva>), null si ninguna. */
  resultado: Validacion<Reserva> | null
  /** Acción que produjo el resultado, o null. */
  tipoResultado: TipoAccionReserva
  reservar(claseId: string): Promise<Validacion<Reserva>>
  cancelar(reservaId: string): Promise<Validacion<Reserva>>
  /** Recarga el listado de reservas y avisa (p. ej. para refrescar horarios). */
  recargar(): void
}

/** Último estado de carga, marcado con el uid al que pertenece. */
interface CargaReservas {
  uid: string | null
  estado: EstadoCargaReservas
  reservas: Reserva[]
}

const CARGA_INICIAL: CargaReservas = { uid: null, estado: 'vacio', reservas: [] }

/**
 * Gestión de reservas de la UI (GEN-51): consulta el listado propio cuando
 * hay sesión, ejecuta reservar/cancelar con estados observables y avisa de
 * los cambios (el contador de plazas de los horarios se refresca con la
 * lectura pública de clases). Ignora respuestas huérfanas al desmontar.
 */
export function useGestionReservas(
  puertoReservas: PuertoReservas,
  uid: string | null,
  alCambiar?: () => void,
): GestionReservas {
  const [carga, setCarga] = useState<CargaReservas>(CARGA_INICIAL)
  const [enCurso, setEnCurso] = useState(false)
  const [resultado, setResultado] = useState<Validacion<Reserva> | null>(null)
  const [tipoResultado, setTipoResultado] = useState<TipoAccionReserva>(null)
  const [version, setVersion] = useState(0)

  const recargar = useCallback(() => {
    setVersion((valor) => valor + 1)
    alCambiar?.()
  }, [alCambiar])

  useEffect(() => {
    if (!uid) return
    let activo = true
    puertoReservas
      .listarReservasDe(uid)
      .then((resultadoListado) => {
        if (!activo) return
        setCarga({
          uid,
          estado: resultadoListado.length > 0 ? 'listado' : 'vacio',
          reservas: resultadoListado,
        })
      })
      .catch(() => {
        if (activo) setCarga({ uid, estado: 'error', reservas: [] })
      })
    return () => {
      activo = false
    }
  }, [puertoReservas, uid, version])

  // Estado expuesto: sin sesión es vacío; con sesión, 'cargando' hasta que
  // resuelve la carga del uid actual.
  const propio = uid !== null && uid === carga.uid
  const estadoReservas: EstadoCargaReservas = !uid
    ? 'vacio'
    : propio
      ? carga.estado
      : 'cargando'
  const reservas = propio ? carga.reservas : []

  const ejecutar = useCallback(
    async (
      accion: 'reserva' | 'cancelacion',
      operacion: () => Promise<Validacion<Reserva>>,
    ): Promise<Validacion<Reserva>> => {
      if (enCurso) return { ok: false, errores: ['ACCION_EN_CURSO'] }
      setEnCurso(true)
      try {
        const resultadoAccion = await operacion()
        setResultado(resultadoAccion)
        setTipoResultado(accion)
        if (resultadoAccion.ok) recargar()
        return resultadoAccion
      } catch {
        const resultadoError: Validacion<Reserva> = { ok: false, errores: ['ERROR_SERVIDOR'] }
        setResultado(resultadoError)
        setTipoResultado(accion)
        return resultadoError
      } finally {
        setEnCurso(false)
      }
    },
    [enCurso, recargar],
  )

  const reservar = useCallback(
    (claseId: string) => ejecutar('reserva', () => puertoReservas.reservarPlaza(claseId)),
    [ejecutar, puertoReservas],
  )

  const cancelar = useCallback(
    (reservaId: string) => ejecutar('cancelacion', () => puertoReservas.cancelarReserva(reservaId)),
    [ejecutar, puertoReservas],
  )

  return {
    reservas,
    estadoReservas,
    enCurso,
    resultado,
    tipoResultado,
    reservar,
    cancelar,
    recargar,
  } as const
}
