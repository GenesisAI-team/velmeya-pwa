import { partesFechaISO } from '../domain/fechas'
import { plazasDisponiblesDesdeContador } from '../domain/clase'
import type { Clase, Reserva, Validacion } from '../domain/tipos'

interface PropiedadesDetalleClase {
  clase: Clase
  onCerrar: () => void
  /** true si hay sesión iniciada: entonces se puede reservar. */
  sesionActivada?: boolean
  /** true si el usuario ya tiene esta clase reservada y confirmada. */
  reservada?: boolean
  /** true mientras la reserva está en curso. */
  enCurso?: boolean
  /** Resultado de la última acción de reserva (los de cancelación no llegan). */
  resultado?: Validacion<Reserva> | null
  onReservar?: () => void
}

/**
 * Detalle de una clase seleccionada del horario: fecha, hora, duración,
 * capacidad y plazas libres (contador derivado de las transacciones,
 * GEN-51). Con sesión ofrece reservar plaza con estados y errores estables.
 */
export function DetalleClase({
  clase,
  onCerrar,
  sesionActivada = false,
  reservada = false,
  enCurso = false,
  resultado = null,
  onReservar,
}: PropiedadesDetalleClase) {
  const partes = partesFechaISO(clase.fechaInicio)
  const libres = plazasDisponiblesDesdeContador(clase)
  return (
    <div className="detalleClase" role="region" aria-label="Detalle de clase" aria-live="polite">
      <h3 className="tituloDetalle">{clase.titulo}</h3>
      <dl className="fichaDetalle">
        <dt>Fecha</dt>
        <dd>{partes?.fecha ?? clase.fechaInicio}</dd>
        <dt>Hora</dt>
        <dd>{partes?.hora ?? '—'}</dd>
        <dt>Duración</dt>
        <dd>{clase.duracionMinutos} minutos</dd>
        <dt>Capacidad</dt>
        <dd>{clase.capacidadPlazas} plazas</dd>
        <dt>Plazas libres</dt>
        <dd>{libres} plazas libres</dd>
        {clase.profesorId && (
          <>
            <dt>Profesor</dt>
            <dd>{clase.profesorId}</dd>
          </>
        )}
      </dl>
      {reservada ? (
        <p className="estadoExito" role="status">
          Ya tienes esta clase reservada.
        </p>
      ) : sesionActivada ? (
        <>
          {libres === 0 && <p className="notaDetalle">Sin plazas disponibles.</p>}
          {resultado?.ok && (
            <p className="estadoExito" role="status">
              Reserva confirmada.
            </p>
          )}
          {resultado && !resultado.ok && (
            <p className="avisoError" role="alert">
              {resultado.errores.join(', ')}
            </p>
          )}
          <button
            type="button"
            className="botonPrimario"
            onClick={onReservar}
            disabled={enCurso || libres === 0 || !onReservar}
          >
            {enCurso ? 'Reservando…' : 'Reservar plaza'}
          </button>
        </>
      ) : (
        <p className="notaDetalle">Inicia sesión para reservar plaza.</p>
      )}
      <button type="button" className="botonSecundario" onClick={onCerrar}>
        Cerrar detalle
      </button>
    </div>
  )
}
