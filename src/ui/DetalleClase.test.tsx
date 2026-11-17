import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { claseEjemplo, reservaEjemplo } from '../test/fakes'
import { DetalleClase } from './DetalleClase'

describe('DetalleClase', () => {
  it('muestra todos los datos de la clase seleccionada', () => {
    render(
      <DetalleClase
        clase={claseEjemplo({
          id: 'c1',
          titulo: 'Vinyasa 60',
          fechaInicio: '2027-01-15T09:00:00.000Z',
          duracionMinutos: 60,
          capacidadPlazas: 12,
          profesorId: 'prof-9',
        })}
        onCerrar={vi.fn()}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Vinyasa 60' })).toBeInTheDocument()
    expect(screen.getByText('2027-01-15')).toBeInTheDocument()
    expect(screen.getByText('09:00')).toBeInTheDocument()
    expect(screen.getByText('60 minutos')).toBeInTheDocument()
    expect(screen.getByText('12 plazas')).toBeInTheDocument()
    expect(screen.getByText('prof-9')).toBeInTheDocument()
  })

  it('omite la fila de profesor cuando la clase no lo define', () => {
    render(<DetalleClase clase={claseEjemplo()} onCerrar={vi.fn()} />)
    expect(screen.queryByText('Profesor')).not.toBeInTheDocument()
  })

  it('muestra las plazas libres según el contador de la clase (GEN-51)', () => {
    render(
      <DetalleClase
        clase={claseEjemplo({ capacidadPlazas: 12, ocupadas: 4 })}
        onCerrar={vi.fn()}
      />,
    )
    expect(screen.getByText('8 plazas libres')).toBeInTheDocument()
  })

  it('sin sesión invita a iniciar sesión y no muestra el botón de reserva', () => {
    render(<DetalleClase clase={claseEjemplo()} onCerrar={vi.fn()} />)
    expect(screen.getByText('Inicia sesión para reservar plaza.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reservar plaza' })).not.toBeInTheDocument()
  })

  it('con sesión ofrece reservar y notifica la clase elegida (GEN-51)', () => {
    const onReservar = vi.fn()
    render(
      <DetalleClase
        clase={claseEjemplo()}
        onCerrar={vi.fn()}
        sesionActivada
        onReservar={onReservar}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Reservar plaza' }))
    expect(onReservar).toHaveBeenCalledTimes(1)
  })

  it('deshabilita el botón mientras la reserva está en curso (GEN-51)', () => {
    render(
      <DetalleClase
        clase={claseEjemplo()}
        onCerrar={vi.fn()}
        sesionActivada
        enCurso
        onReservar={vi.fn()}
      />,
    )
    const boton = screen.getByRole('button', { name: 'Reservando…' })
    expect(boton).toBeDisabled()
  })

  it('avisa cuando la clase no tiene plazas libres (GEN-51)', () => {
    render(
      <DetalleClase
        clase={claseEjemplo({ capacidadPlazas: 2, ocupadas: 2 })}
        onCerrar={vi.fn()}
        sesionActivada
        onReservar={vi.fn()}
      />,
    )
    expect(screen.getByText('Sin plazas disponibles.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reservar plaza' })).toBeDisabled()
  })

  it('confirma el éxito de la reserva con un mensaje estable (GEN-51)', () => {
    render(
      <DetalleClase
        clase={claseEjemplo()}
        onCerrar={vi.fn()}
        sesionActivada
        resultado={{ ok: true, valor: reservaEjemplo() }}
        onReservar={vi.fn()}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Reserva confirmada.')
  })

  it('muestra los códigos de error estables de una reserva fallida (GEN-51)', () => {
    render(
      <DetalleClase
        clase={claseEjemplo()}
        onCerrar={vi.fn()}
        sesionActivada
        resultado={{ ok: false, errores: ['CLASE_COMPLETA', 'YA_RESERVADA'] }}
        onReservar={vi.fn()}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('CLASE_COMPLETA, YA_RESERVADA')
  })

  it('indica cuando el usuario ya tiene esta clase reservada (GEN-51)', () => {
    render(
      <DetalleClase
        clase={claseEjemplo()}
        onCerrar={vi.fn()}
        sesionActivada
        reservada
        onReservar={vi.fn()}
      />,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Ya tienes esta clase reservada.')
    expect(screen.queryByRole('button', { name: 'Reservar plaza' })).not.toBeInTheDocument()
  })

  it('cierra el detalle al pulsar el botón', () => {
    const onCerrar = vi.fn()
    render(<DetalleClase clase={claseEjemplo()} onCerrar={onCerrar} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' }))
    expect(onCerrar).toHaveBeenCalledTimes(1)
  })
})
