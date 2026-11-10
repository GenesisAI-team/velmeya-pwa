import type { EntradaUsuario, RolUsuario, Usuario, Validacion } from './tipos'

const ROLES: readonly string[] = ['alumno', 'profesor', 'admin']
const PATRON_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validarUsuario(entrada: EntradaUsuario): Validacion<Usuario> {
  const errores: string[] = []

  const id = entrada.id?.trim() ?? ''
  if (!id) errores.push('ID_REQUERIDO')

  const nombre = entrada.nombre?.trim() ?? ''
  if (!nombre) errores.push('NOMBRE_REQUERIDO')

  const email = entrada.email?.trim().toLowerCase() ?? ''
  if (!PATRON_EMAIL.test(email)) errores.push('EMAIL_INVALIDO')

  const rol = entrada.rol
  if (!rol || !ROLES.includes(rol)) errores.push('ROL_INVALIDO')

  if (errores.length > 0 || !rol) return { ok: false, errores }

  return { ok: true, valor: { id, nombre, email, rol: rol as RolUsuario } }
}
