import { useState, type FormEvent } from 'react'

interface PropiedadesFormularioInicioSesion {
  iniciando: boolean
  errorSesion: string | null
  onSubmit: (email: string, contrasena: string) => void
}

/**
 * Formulario de inicio de sesión con email y contraseña. Muestra el código
 * de error estable del último intento y bloquea el envío con campos vacíos
 * o mientras la petición está en curso.
 */
export function FormularioInicioSesion({
  iniciando,
  errorSesion,
  onSubmit,
}: PropiedadesFormularioInicioSesion) {
  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')

  const envioValido = email.trim() !== '' && contrasena.trim() !== '' && !iniciando

  function manejarEnvio(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!envioValido) return
    onSubmit(email.trim(), contrasena)
  }

  return (
    <form className="formularioSesion" onSubmit={manejarEnvio} aria-label="Inicio de sesión" noValidate>
      <label className="campoEtiqueta" htmlFor="campoEmail">
        Email
      </label>
      <input
        id="campoEmail"
        name="email"
        type="email"
        autoComplete="email"
        className="campoTexto"
        value={email}
        onChange={(evento) => setEmail(evento.target.value)}
        disabled={iniciando}
        required
      />

      <label className="campoEtiqueta" htmlFor="campoContrasena">
        Contraseña
      </label>
      <input
        id="campoContrasena"
        name="contrasena"
        type="password"
        autoComplete="current-password"
        className="campoTexto"
        value={contrasena}
        onChange={(evento) => setContrasena(evento.target.value)}
        disabled={iniciando}
        required
      />

      {errorSesion && (
        <p className="avisoError" role="alert">
          Error: {errorSesion}
        </p>
      )}

      <button type="submit" className="botonPrimario" disabled={!envioValido}>
        Iniciar sesión
      </button>
    </form>
  )
}
