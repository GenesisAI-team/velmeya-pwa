import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import type { PuertoAuth, RepositorioClases } from '../../domain/puertos'
import type { Validacion } from '../../domain/tipos'
import { cargarConfigFirebase, usarEmuladores, PROYECTO_EMULADOR, type FuenteEnv } from './config'
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

  // Con emuladores el namespace de Firestore es el del Emulator Suite
  // (demo-velmeya-local), no el projectId del entorno: así el frontend lee
  // las clases que siembra scripts/sembrar-emulador.mjs (hallazgo GEN-46).
  const emuladores = usarEmuladores(env)
  const configApp = emuladores
    ? { ...configuracion.valor, projectId: PROYECTO_EMULADOR }
    : configuracion.valor

  const app = initializeApp(configApp)
  const auth = getAuth(app)
  const db = getFirestore(app)

  if (emuladores) {
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
