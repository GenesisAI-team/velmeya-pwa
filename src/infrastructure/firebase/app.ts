import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import type { PuertoAuth, RepositorioClases } from '../../domain/puertos'
import type { Validacion } from '../../domain/tipos'
import { cargarConfigFirebase, usarEmuladores, type FuenteEnv } from './config'
import { conectarAuthEmulador, crearAdaptadorAuth } from './auth'
import { crearRepositorioClases } from './clases'

export interface ServiciosBackend {
  puertoAuth: PuertoAuth
  repositorioClases: RepositorioClases
}

/**
 * Cableado único de la app: configura el SDK de Firebase a partir del entorno
 * y, si `VITE_USE_FIREBASE_EMULATORS=true`, conecta Auth (9099) y Firestore
 * (8080) al Emulator Suite con el proyecto demo-velmeya-local. La
 * configuración inválida devuelve códigos de error estables, sin excepciones.
 */
export function crearServiciosBackend(env: FuenteEnv): Validacion<ServiciosBackend> {
  const configuracion = cargarConfigFirebase(env)
  if (!configuracion.ok) return configuracion

  const app = initializeApp(configuracion.valor)
  const auth = getAuth(app)
  const db = getFirestore(app)

  if (usarEmuladores(env)) {
    conectarAuthEmulador(auth)
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
  }

  return {
    ok: true,
    valor: {
      puertoAuth: crearAdaptadorAuth(auth),
      repositorioClases: crearRepositorioClases(db),
    },
  }
}
