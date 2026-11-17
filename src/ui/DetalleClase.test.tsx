import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { claseEjemplo } from '../test/fakes'
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

  it('avisa que las plazas disponibles llegan en la fase de reservas', () => {
    render(<DetalleClase clase={claseEjemplo()} onCerrar={vi.fn()} />)
    expect(
      screen.getByText(/plazas disponibles se calculan al activar las reservas/i),
    ).toBeInTheDocument()
  })

  it('cierra el detalle al pulsar el botón', () => {
    const onCerrar = vi.fn()
    render(<DetalleClase clase={claseEjemplo()} onCerrar={onCerrar} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalle' }))
    expect(onCerrar).toHaveBeenCalledTimes(1)
  })
})
