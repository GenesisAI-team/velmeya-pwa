import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  AuthFalso,
  PuertoReservasFalso,
  RepositorioClasesFalso,
  claseEjemplo,
  reservaEjemplo,
} from './test/fakes'
import App from './App'
import type { SesionUsuario } from './domain/puertos'

function creaApp(props?: {
  authFalso?: AuthFalso
  repositorioFalso?: RepositorioClasesFalso
  reservasFalso?: PuertoReservasFalso
}) {
  const authFalso = props?.authFalso ?? new AuthFalso()
  const repositorioFalso = props?.repositorioFalso ?? new RepositorioClasesFalso()
  const reservasFalso = props?.reservasFalso ?? new PuertoReservasFalso()
  const pantalla = render(
    <App
      puertoAuth={authFalso}
      repositorioClases={repositorioFalso}
      puertoReservas={reservasFalso}
    />,
  )
  return { authFalso, repositorioFalso, reservasFalso, pantalla }
}

describe('shell PWA (smoke)', () => {
  it('muestra una cabecera con el nombre de la app', () => {
    creaApp()
    expect(screen.getByRole('heading', { level: 1, name: /velmeya/i })).toBeInTheDocument()
  })

  it('ofrece navegación con accesos a Horarios y Reservas', () => {
    creaApp()
    const nav = screen.getByRole('navigation')
    expect(nav).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Horarios' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reservas' })).toBeInTheDocument()
  })
})

describe('horarios desde Firestore (fase 2)', () => {
  it('muestra el listado de clases procedente del repositorio', async () => {
    const repositorioFalso = new RepositorioClasesFalso()
    repositorioFalso.clases = [
      claseEjemplo({ id: 'c1', titulo: 'Vinyasa 60' }),
      claseEjemplo({ id: 'c2', titulo: 'Yin 75', fechaInicio: '2027-01-16T18:30:00.000Z' }),
    ]
    creaApp({ repositorioFalso })
    await waitFor(() => expect(screen.getByRole('button', { name: /Vinyasa 60/ })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /Yin 75/ })).toBeInTheDocument()
  })

  it('muestra estados de carga mientras la sesión y los horarios no resuelven', () => {
    const authFalso = new AuthFalso()
    authFalso.emitirAlSuscribir = false
    const repositorioFalso = new RepositorioClasesFalso()
    repositorioFalso.pendiente = true
    creaApp({ authFalso, repositorioFalso })
    expect(screen.getByText('Comprobando sesión…')).toBeInTheDocument()
    expect(screen.getByText('Cargando horarios…')).toBeInTheDocument()
  })

  it('muestra un aviso de error cuando no se pueden cargar los horarios', async () => {
    const repositorioFalso = new RepositorioClasesFalso()
    repositorioFalso.error = new Error('emulador apagado')
    creaApp({ repositorioFalso })
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/No se pudieron cargar los horarios/),
    )
  })

  it('muestra el estado vacío cuando no hay clases programadas', async () => {
    creaApp()
    await waitFor(() =>
      expect(screen.getByText('No hay clases programadas ahora mismo.')).toBeInTheDocument(),
    )
  })

  it('abre el detalle de una clase al seleccionarla y permite cerrarlo', async () => {
    const repositorioFalso = new RepositorioClasesFalso()
    repositorioFalso.clases = [claseEjemplo({ id: 'c1', titulo: 'Vinyasa 60' })]
    creaApp({ repositorioFalso })

    fireEvent.click(await screen.findByRole('button', { name: /Vinyasa 60/ }))
    const detalle = await screen.findByRole('region', { name: 'Detalle de clase' })
    expect(detalle).toHaveTextContent('Vinyasa 60')
    expect(detalle).toHaveTextContent('60 minutos')
    expect(detalle).toHaveTextContent('12 plazas')

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' }))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Detalle de clase' })).not.toBeInTheDocument())
  })
})

describe('pantalla protegida de reservas (fase 2)', () => {
  it('sin sesión muestra el formulario y no el contenido protegido', async () => {
    creaApp()
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeInTheDocument())
    expect(screen.queryByText(/Sesión iniciada como/)).not.toBeInTheDocument()
    expect(screen.getByText(/Inicia sesión para ver y gestionar tus reservas/)).toBeInTheDocument()
  })

  it('con sesión restaurada muestra el email, sus reservas y el botón de salida', async () => {
    const authFalso = new AuthFalso()
    const sesion: SesionUsuario = { uid: 'uid-7', email: 'alumno@demo.local' }
    authFalso.sesionActual = sesion
    creaApp({ authFalso })
    await waitFor(() =>
      expect(screen.getByText('Sesión iniciada como alumno@demo.local')).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mis reservas' })).toBeInTheDocument()
    expect(screen.getByText('No tienes reservas todavía.')).toBeInTheDocument()
  })

  it('al cerrar sesión vuelve a la pantalla protegida con formulario', async () => {
    const authFalso = new AuthFalso()
    authFalso.sesionActual = { uid: 'uid-7', email: 'alumno@demo.local' }
    creaApp({ authFalso })
    fireEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }))
    await waitFor(() => expect(screen.getByLabelText('Email')).toBeInTheDocument())
    expect(authFalso.llamadasCerrarSesion).toBe(1)
  })

  it('autentica con las credenciales del formulario y notifica la sesión al adaptador', async () => {
    const authFalso = new AuthFalso()
    creaApp({ authFalso })
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'alumno@demo.local' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'demo1234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    await waitFor(() => {
      expect(authFalso.llamadasIniciarSesion).toEqual([
        { email: 'alumno@demo.local', contrasena: 'demo1234' },
      ])
    })

    // El SDK real notifica por su cuenta; el duplicado simula ese aviso.
    act(() => {
      authFalso.definirSesion({ uid: 'uid-7', email: 'alumno@demo.local' })
    })
    await waitFor(() =>
      expect(screen.getByText('Sesión iniciada como alumno@demo.local')).toBeInTheDocument(),
    )
  })

  it('muestra el código de error estable cuando el inicio falla', async () => {
    const authFalso = new AuthFalso()
    authFalso.respuestaInicioSesion = { ok: false, errores: ['CREDENCIALES_INVALIDAS'] }
    creaApp({ authFalso })
    fireEvent.change(await screen.findByLabelText('Email'), { target: { value: 'alumno@demo.local' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'mala' } })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('CREDENCIALES_INVALIDAS'))
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
  })
})

describe('reservas y cancelaciones vía Functions (fase 3, GEN-51)', () => {
  it('sin sesión el detalle de clase invita a iniciar sesión y no permite reservar', async () => {
    const repositorioFalso = new RepositorioClasesFalso()
    repositorioFalso.clases = [claseEjemplo({ id: 'c1', titulo: 'Vinyasa 60' })]
    creaApp({ repositorioFalso })

    fireEvent.click(await screen.findByRole('button', { name: /Vinyasa 60/ }))
    const detalle = await screen.findByRole('region', { name: 'Detalle de clase' })
    expect(detalle).toHaveTextContent('Inicia sesión para reservar plaza.')
    expect(screen.queryByRole('button', { name: 'Reservar plaza' })).not.toBeInTheDocument()
  })

  it('con sesión muestra las plazas libres y permite reservar desde el detalle', async () => {
    const authFalso = new AuthFalso()
    authFalso.sesionActual = { uid: 'uid-7', email: 'alumno@demo.local' }
    const repositorioFalso = new RepositorioClasesFalso()
    repositorioFalso.clases = [claseEjemplo({ id: 'c1', titulo: 'Vinyasa 60', capacidadPlazas: 12 })]
    const reservasFalso = new PuertoReservasFalso()
    reservasFalso.resultadoReservar = {
      ok: true,
      valor: reservaEjemplo({ id: 'r-nueva', claseId: 'c1', usuarioId: 'uid-7' }),
    }
    creaApp({ authFalso, repositorioFalso, reservasFalso })

    fireEvent.click(await screen.findByRole('button', { name: /Vinyasa 60/ }))
    const detalle = await screen.findByRole('region', { name: 'Detalle de clase' })
    expect(detalle).toHaveTextContent('12 plazas libres')

    fireEvent.click(screen.getByRole('button', { name: 'Reservar plaza' }))
    await waitFor(() => expect(reservasFalso.llamadasReservar).toEqual(['c1']))
    await waitFor(() => expect(screen.getByText('Reserva confirmada.')).toBeInTheDocument())
  })

  it('lista las reservas propias con título de clase y botón de cancelación', async () => {
    const authFalso = new AuthFalso()
    authFalso.sesionActual = { uid: 'uid-7', email: 'alumno@demo.local' }
    const repositorioFalso = new RepositorioClasesFalso()
    repositorioFalso.clases = [claseEjemplo({ id: 'c1', titulo: 'Vinyasa 60' })]
    const reservasFalso = new PuertoReservasFalso()
    reservasFalso.reservas = [
      reservaEjemplo({ id: 'r-1', claseId: 'c1', usuarioId: 'uid-7' }),
    ]
    creaApp({ authFalso, repositorioFalso, reservasFalso })

    const botonCancelar = await screen.findByRole('button', { name: 'Cancelar reserva' })
    fireEvent.click(botonCancelar)
    await waitFor(() => expect(reservasFalso.llamadasCancelar).toEqual(['r-1']))
    await waitFor(() => expect(screen.getByText('Reserva cancelada.')).toBeInTheDocument())
  })

  it('muestra el código estable cuando una reserva falla (p. ej. CLASE_COMPLETA)', async () => {
    const authFalso = new AuthFalso()
    authFalso.sesionActual = { uid: 'uid-7', email: 'alumno@demo.local' }
    const repositorioFalso = new RepositorioClasesFalso()
    repositorioFalso.clases = [claseEjemplo({ id: 'c1', titulo: 'Vinyasa 60' })]
    const reservasFalso = new PuertoReservasFalso()
    reservasFalso.resultadoReservar = { ok: false, errores: ['CLASE_COMPLETA'] }
    creaApp({ authFalso, repositorioFalso, reservasFalso })

    fireEvent.click(await screen.findByRole('button', { name: /Vinyasa 60/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'Reservar plaza' }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('CLASE_COMPLETA'),
    )
  })

  it('muestra un aviso de error cuando no se pueden cargar las reservas', async () => {
    const authFalso = new AuthFalso()
    authFalso.sesionActual = { uid: 'uid-7', email: 'alumno@demo.local' }
    const reservasFalso = new PuertoReservasFalso()
    reservasFalso.errorListar = new Error('emulador apagado')
    creaApp({ authFalso, reservasFalso })

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar tus reservas.'),
    )
  })

  it('tras reservar, refresca las plazas libres de la clase en el detalle', async () => {
    const authFalso = new AuthFalso()
    authFalso.sesionActual = { uid: 'uid-7', email: 'alumno@demo.local' }
    const repositorioFalso = new RepositorioClasesFalso()
    // Primera carga: contador sin datos; tras la transacción real, el
    // repositorio devuelve la clase con el contador actualizado.
    repositorioFalso.clasesPorLlamada = [
      [claseEjemplo({ id: 'c1', titulo: 'Vinyasa 60', capacidadPlazas: 12 })],
      [claseEjemplo({ id: 'c1', titulo: 'Vinyasa 60', capacidadPlazas: 12, ocupadas: 1 })],
    ]
    const reservasFalso = new PuertoReservasFalso()
    reservasFalso.resultadoReservar = {
      ok: true,
      valor: reservaEjemplo({ id: 'r-nueva', claseId: 'c1', usuarioId: 'uid-7' }),
    }
    creaApp({ authFalso, repositorioFalso, reservasFalso })

    fireEvent.click(await screen.findByRole('button', { name: /Vinyasa 60/ }))
    expect(await screen.findByText('12 plazas libres')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reservar plaza' }))
    await waitFor(() => expect(screen.getByText('Reserva confirmada.')).toBeInTheDocument())
    await waitFor(() =>
      expect(screen.getByText('11 plazas libres')).toBeInTheDocument(),
    )
  })
})
