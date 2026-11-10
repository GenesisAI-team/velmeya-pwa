// Utilidades de validación compartidas por el dominio (GEN-35).
// Fechas: el contrato del dominio almacena instantes en ISO 8601 con
// hora/offset (p. ej. 2026-12-01T10:00:00.000Z); ver docs/DATA_MODEL.md.
const PATRON_FECHA_ISO =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/

export function esFechaISO(valor: string): boolean {
  if (!PATRON_FECHA_ISO.test(valor)) return false
  return !Number.isNaN(new Date(valor).getTime())
}

export function esEnteroEnRango(
  valor: number | undefined,
  min: number,
  max: number,
): boolean {
  return (
    typeof valor === 'number' &&
    Number.isInteger(valor) &&
    valor >= min &&
    valor <= max
  )
}

export interface PartesFechaISO {
  /** Parte de fecha del instante, tal como está escrita (p. ej. 2026-12-01). */
  fecha: string
  /** Parte de hora (HH:MM), tal como está escrita, sin conversión de zona. */
  hora: string
}

/**
 * Separa fecha y hora de un instante ISO 8601 tal como está almacenado,
 * sin conversión de zona horaria (el horario del estudio se muestra tal cual
 * se contrató). Devuelve null si la cadena no es un instante ISO válido.
 */
export function partesFechaISO(instante: string): PartesFechaISO | null {
  if (!esFechaISO(instante)) return null
  const [fecha, resto] = instante.split('T')
  return { fecha, hora: resto.slice(0, 5) }
}
