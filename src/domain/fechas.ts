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
