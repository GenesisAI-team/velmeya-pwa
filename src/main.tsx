import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { crearServiciosBackend } from './infrastructure/firebase/app'
import type { FuenteEnv } from './infrastructure/firebase/config'
import './styles/global.css'

const contenedor = document.getElementById('root')
if (!contenedor) {
  throw new Error('Velmeya: no se encontró el elemento raíz #root')
}

const resultado = crearServiciosBackend(import.meta.env as unknown as FuenteEnv)

if (!resultado.ok) {
  // Configuración incompleta: error visible con los códigos estables; el
  // contrato de variables vive en .env.example (copiar a .env.local).
  createRoot(contenedor).render(
    <StrictMode>
      <main className="principal">
        <section className="panel">
          <h2>Configuración de Firebase incompleta</h2>
          <p className="avisoError" role="alert">
            {resultado.errores.join(', ')}
          </p>
          <p className="estadoVacio">
            Copia .env.example a .env.local y rellena los valores (ver docs/WORKFLOW.md).
          </p>
        </section>
      </main>
    </StrictMode>,
  )
} else {
  createRoot(contenedor).render(
    <StrictMode>
      <App
        puertoAuth={resultado.valor.puertoAuth}
        repositorioClases={resultado.valor.repositorioClases}
      />
    </StrictMode>,
  )
}

// Registro del service worker solo en producción: el SW mínimo da shell
// offline; en desarrollo hay recarga en caliente y no interfiere.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  void navigator.serviceWorker.register('/sw.js')
}
