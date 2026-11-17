import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { claseEjemplo } from '../test/fakes'
import { ListaClases } from './ListaClases'

describe('ListaClases', () => {
  it('muestra título, fecha y hora, duración y capacidad de cada clase', () => {
    const clases = [
      claseEjemplo({ id: 'c1', titulo: 'Vinyasa 60' }),
      claseEjemplo({ id: 'c2', titulo: 'Yin 75', fechaInicio: '2027-01-16T18:30:00.000Z', duracionMinutos: 75, capacidadPlazas: 8 }),
    ]
    render(<ListaClases clases={clases} onSeleccionar={vi.fn()} />)

    expect(screen.getByRole('button', { name: /Vinyasa 60/ })).toHaveTextContent('2027-01-15 09:00')
    expect(screen.getByRole('button', { name: /Vinyasa 60/ })).toHaveTextContent('60 min')
    expect(screen.getByRole('button', { name: /Vinyasa 60/ })).toHaveTextContent('12 plazas')
    expect(screen.getByRole('button', { name: /Yin 75/ })).toHaveTextContent('2027-01-16 18:30')
    expect(screen.getByRole('button', { name: /Yin 75/ })).toHaveTextContent('75 min')
    expect(screen.getByRole('button', { name: /Yin 75/ })).toHaveTextContent('8 plazas')
  })

  it('muestra la fecha original si el instante no es ISO válido', () => {
    render(
      <ListaClases
        clases={[claseEjemplo({ fechaInicio: 'fecha-rara' })]}
        onSeleccionar={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: /Vinyasa 60/ })).toHaveTextContent('fecha-rara')
  })

  it('notifica la clase elegida al pulsar su tarjeta', () => {
    const onSeleccionar = vi.fn()
    const clase = claseEjemplo({ id: 'c9', titulo: 'Hatha 90' })
    render(<ListaClases clases={[clase]} onSeleccionar={onSeleccionar} />)
    fireEvent.click(screen.getByRole('button', { name: /Hatha 90/ }))
    expect(onSeleccionar).toHaveBeenCalledWith(clase)
  })

  it('renderiza una lista vacía sin contenido', () => {
    render(<ListaClases clases={[]} onSeleccionar={vi.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
