import { partesFechaISO } from '../domain/fechas'
import type { Clase } from '../domain/tipos'

interface PropiedadesDetalleClase {
  clase: Clase
  onCerrar: () => void
}

/**
 * Detalle de una clase seleccionada del horario: fecha, hora, duración y
 * capacidad. Las plazas disponibles (conteo de reservas) llegan con la fase
 * de reservas; aquí se muestra la capacidad contratada.
 */
export function DetalleClase({ clase, onCerrar }: PropiedadesDetalleClase) {
  const partes = partesFechaISO(clase.fechaInicio)
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
        {clase.profesorId && (
          <>
            <dt>Profesor</dt>
            <dd>{clase.profesorId}</dd>
          </>
        )}
      </dl>
      <p className="notaDetalle">
        Las plazas disponibles se calculan al activar las reservas (próxima fase).
      </p>
      <button type="button" className="botonSecundario" onClick={onCerrar}>
        Cerrar detalle
      </button>
    </div>
  )
}
