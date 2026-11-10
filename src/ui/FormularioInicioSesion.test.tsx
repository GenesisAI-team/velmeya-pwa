import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FormularioInicioSesion } from './FormularioInicioSesion'

describe('FormularioInicioSesion', () => {
  it('renderiza los campos email y contraseña con su botón', () => {
    render(<FormularioInicioSesion iniciando={false} errorSesion={null} onSubmit={vi.fn()} />)
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeInTheDocument()
  })

  it('envía las credenciales introducidas al confirmar', () => {
    const onSubmit = vi.fn()
    render(<FormularioInicioSesion iniciando={false} errorSesion={null} onSubmit={onSubmit} />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alumno@demo.local' } })
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'demo1234' } })
    fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }))
    expect(onSubmit).toHaveBeenCalledWith('alumno@demo.local', 'demo1234')
  })

  it('no permite enviar sin rellenar ambos campos', () => {
    const onSubmit = vi.fn()
    render(<FormularioInicioSesion iniciando={false} errorSesion={null} onSubmit={onSubmit} />)
    const boton = screen.getByRole('button', { name: 'Iniciar sesión' })
    expect(boton).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alumno@demo.local' } })
    expect(boton).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'demo1234' } })
    expect(boton).toBeEnabled()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('muestra el código de error estable cuando la sesión falla', () => {
    render(
      <FormularioInicioSesion
        iniciando={false}
        errorSesion="CREDENCIALES_INVALIDAS"
        onSubmit={vi.fn()}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('CREDENCIALES_INVALIDAS')
  })

  it('deshabilita controles y no muestra error mientras está iniciando', () => {
    render(
      <FormularioInicioSesion iniciando={true} errorSesion={null} onSubmit={vi.fn()} />,
    )
    expect(screen.getByLabelText('Email')).toBeDisabled()
    expect(screen.getByLabelText('Contraseña')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Iniciar sesión' })).toBeDisabled()
  })
})
