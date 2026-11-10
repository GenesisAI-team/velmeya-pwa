import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('shell PWA (smoke)', () => {
  it('muestra una cabecera con el nombre de la app', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: /velmeya/i })).toBeInTheDocument()
  })

  it('ofrece navegación con accesos a Horarios y Reservas', () => {
    render(<App />)
    const nav = screen.getByRole('navigation')
    expect(nav).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Horarios' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Reservas' })).toBeInTheDocument()
  })
})
