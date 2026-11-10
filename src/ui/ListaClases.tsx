import { partesFechaISO } from '../domain/fechas'
import type { Clase } from '../domain/tipos'

interface PropiedadesListaClases {
  clases: Clase[]
  onSeleccionar: (clase: Clase) => void
}

/** Listado de clases del horario; cada tarjeta abre su detalle. */
export function ListaClases({ clases, onSeleccionar }: PropiedadesListaClases) {
  return (
    <ul className="listaClases">
      {clases.map((clase) => {
        const partes = partesFechaISO(clase.fechaInicio)
        const cuando = partes ? `${partes.fecha} ${partes.hora}` : clase.fechaInicio
        return (
          <li key={clase.id}>
            <button
              type="button"
              className="tarjetaClase"
              onClick={() => onSeleccionar(clase)}
            >
              <strong className="tituloClase">{clase.titulo}</strong>
              <span className="metaClase">
                {cuando} · {clase.duracionMinutos} min · {clase.capacidadPlazas} plazas
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
