import {
  connectAuthEmulator,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from 'firebase/auth'
import type { PuertoAuth, SesionUsuario } from '../../domain/puertos'
import type { Validacion } from '../../domain/tipos'
import { codigoErrorFirebase, mapearErrorAuth } from './erroresAuth'

function aSesionUsuario(usuario: { uid: string; email: string | null }): SesionUsuario {
  return { uid: usuario.uid, email: usuario.email }
}

/**
 * Adaptador del puerto de autenticación sobre el SDK de Firebase Auth.
 * Los errores del SDK se traducen a códigos estables del dominio; nunca se
 * propaga la excepción cruda hacia la UI.
 */
export function crearAdaptadorAuth(auth: Auth): PuertoAuth {
  return {
    suscribirseSesion(callback) {
      return onAuthStateChanged(auth, (usuario) => {
        callback(usuario ? aSesionUsuario(usuario) : null)
      })
    },

    async iniciarSesion(email: string, contrasena: string): Promise<Validacion<SesionUsuario>> {
      try {
        const credencial = await signInWithEmailAndPassword(auth, email, contrasena)
        return { ok: true, valor: aSesionUsuario(credencial.user) }
      } catch (error) {
        return { ok: false, errores: [mapearErrorAuth(codigoErrorFirebase(error))] }
      }
    },

    async cerrarSesion(): Promise<void> {
      await signOut(auth)
    },
  }
}

/** Conecta un Auth al emulador local (puerto 9099 de firebase.json). */
export function conectarAuthEmulador(auth: Auth): void {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
}
