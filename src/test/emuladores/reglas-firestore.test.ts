import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'

// Proyecto de demo (prefijo demo-): nunca puede llegar a un proyecto real.
const PROYECTO = 'demo-velmeya-reglas'
const HOST = '127.0.0.1'
const PUERTO_FIRESTORE = 8080

let entorno: RulesTestEnvironment

beforeAll(async () => {
  entorno = await initializeTestEnvironment({
    projectId: PROYECTO,
    firestore: {
      rules: readFileSync(join(__dirname, '..', '..', '..', 'firestore.rules'), 'utf8'),
      host: HOST,
      port: PUERTO_FIRESTORE,
    },
  })
})

afterAll(async () => {
  await entorno.cleanup()
})

afterEach(async () => {
  await entorno.clearFirestore()
})

/**
 * Siembra un documento vía REST del emulador con la cabecera de propietario
 * (acceso privilegiado del emulador), equivalente a lo que harán Functions.
 */
async function sembrarDocumento(
  coleccion: string,
  id: string,
  campos: Record<string, string>,
): Promise<void> {
  const fields: Record<string, { stringValue: string }> = {}
  for (const [clave, valor] of Object.entries(campos)) {
    fields[clave] = { stringValue: valor }
  }
  const respuesta = await fetch(
    `http://${HOST}:${PUERTO_FIRESTORE}/v1/projects/${PROYECTO}/databases/(default)/documents/${coleccion}?documentId=${id}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ fields }),
    },
  )
  expect(respuesta.ok, `siembra de ${coleccion}/${id} fallida: ${await respuesta.text()}`).toBe(true)
}

describe('reglas Firestore por colección (GEN-46)', () => {
  describe('classes (horario del estudio)', () => {
    it('permite leer clases incluso sin sesión', async () => {
      await sembrarDocumento('classes', 'clase-1', { titulo: 'Yin (demo)' })
      const anonimo = entorno.unauthenticatedContext()
      await assertSucceeds(anonimo.firestore().collection('classes').doc('clase-1').get())
      await assertSucceeds(anonimo.firestore().collection('classes').get())
    })

    it('impide crear, editar o borrar clases desde el cliente autenticado', async () => {
      const alumno = entorno.authenticatedContext('alumno-1')
      await assertFails(alumno.firestore().collection('classes').doc('nueva').set({ titulo: 'nueva' }))
      await assertFails(
        alumno.firestore().collection('classes').doc('clase-1').update({ titulo: 'cambiada' }),
      )
      await assertFails(alumno.firestore().collection('classes').doc('clase-1').delete())
    })
  })

  describe('users (espejo de Auth)', () => {
    it('permite al dueño leer y escribir su propio documento', async () => {
      const alumno = entorno.authenticatedContext('alumno-1')
      await assertSucceeds(
        alumno.firestore().collection('users').doc('alumno-1').set({ nombre: 'Ana' }),
      )
      await assertSucceeds(alumno.firestore().collection('users').doc('alumno-1').get())
    })

    it('impide leer o escribir el documento de otro usuario', async () => {
      await sembrarDocumento('users', 'alumno-1', { nombre: 'Ana' })
      const intruso = entorno.authenticatedContext('alumno-2')
      await assertFails(intruso.firestore().collection('users').doc('alumno-1').get())
      await assertFails(intruso.firestore().collection('users').doc('alumno-1').set({ nombre: 'X' }))
    })

    it('impide a un anónimo leer documentos de usuario', async () => {
      await sembrarDocumento('users', 'alumno-1', { nombre: 'Ana' })
      const anonimo = entorno.unauthenticatedContext()
      await assertFails(anonimo.firestore().collection('users').doc('alumno-1').get())
    })
  })

  describe('reservations (datos privados por dueño)', () => {
    it('permite al dueño leer sus reservas de forma puntual y por consulta', async () => {
      await sembrarDocumento('reservations', 'r1', {
        usuarioId: 'alumno-1',
        claseId: 'clase-1',
        estado: 'confirmada',
      })
      const dueno = entorno.authenticatedContext('alumno-1')
      await assertSucceeds(dueno.firestore().collection('reservations').doc('r1').get())
      await assertSucceeds(
        dueno.firestore().collection('reservations').where('usuarioId', '==', 'alumno-1').get(),
      )
    })

    it('impide leer reservas ajenas o sin sesión', async () => {
      await sembrarDocumento('reservations', 'r1', {
        usuarioId: 'alumno-1',
        claseId: 'clase-1',
        estado: 'confirmada',
      })
      const intruso = entorno.authenticatedContext('alumno-2')
      await assertFails(intruso.firestore().collection('reservations').doc('r1').get())
      await assertFails(
        intruso.firestore().collection('reservations').where('usuarioId', '==', 'alumno-1').get(),
      )
      const anonimo = entorno.unauthenticatedContext()
      await assertFails(anonimo.firestore().collection('reservations').doc('r1').get())
    })

    it('impide escribir reservas desde el cliente (llegarán vía Functions)', async () => {
      const alumno = entorno.authenticatedContext('alumno-1')
      await assertFails(
        alumno
          .firestore()
          .collection('reservations')
          .doc('nueva')
          .set({ usuarioId: 'alumno-1', estado: 'confirmada' }),
      )
      await assertFails(alumno.firestore().collection('reservations').doc('r1').delete())
    })
  })

  it('deniega cualquier colección no contemplada (denegación por defecto)', async () => {
    const alumno = entorno.authenticatedContext('alumno-1')
    await assertFails(alumno.firestore().collection('coleccionAjena').doc('x').get())
    const anonimo = entorno.unauthenticatedContext()
    await assertFails(anonimo.firestore().collection('coleccionAjena').doc('x').set({ a: 1 }))
  })
})
