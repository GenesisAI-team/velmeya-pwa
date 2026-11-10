import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app'
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { crearRepositorioClases } from '../../infrastructure/firebase/clases'

// Proyecto de demo (prefijo demo-): nunca llega a un proyecto real.
const PROYECTO = 'demo-velmeya-repo'
const HOST = '127.0.0.1'
const PUERTO_FIRESTORE = 8080
const SUFIJO = `${Date.now()}`

let app: FirebaseApp
let db: Firestore

beforeAll(async () => {
  app = initializeApp({ projectId: PROYECTO }, 'pruebas-repo-clases')
  db = getFirestore(app)
  connectFirestoreEmulator(db, HOST, PUERTO_FIRESTORE)
  await sembrarClase(`demo-${SUFIJO}-temprana`, {
    titulo: 'Yin (demo)',
    fechaInicio: '2027-03-01T08:00:00.000Z',
    duracionMinutos: 60,
    capacidadPlazas: 10,
  })
  await sembrarClase(`demo-${SUFIJO}-tardia`, {
    titulo: 'Vinyasa (demo)',
    fechaInicio: '2027-03-01T18:30:00.000Z',
    duracionMinutos: 75,
    capacidadPlazas: 8,
  })
  await sembrarClase(`demo-${SUFIJO}-invalida`, {
    titulo: '',
    fechaInicio: 'no-es-fecha',
    duracionMinutos: 0,
    capacidadPlazas: 0,
  })
})

afterAll(async () => {
  await deleteApp(app)
})

/**
 * Siembra documentos vía REST con la cabecera de propietario del emulador
 * (acceso privilegiado, equivalente a Functions); el cliente nunca puede
 * escribir clases según las reglas.
 */
async function sembrarClase(id: string, campos: Record<string, string | number>): Promise<void> {
  const fields: Record<string, Record<string, string>> = {}
  for (const [clave, valor] of Object.entries(campos)) {
    fields[clave] =
      typeof valor === 'number' ? { integerValue: String(valor) } : { stringValue: valor }
  }
  const respuesta = await fetch(
    `http://${HOST}:${PUERTO_FIRESTORE}/v1/projects/${PROYECTO}/databases/(default)/documents/classes?documentId=${id}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ fields }),
    },
  )
  expect(respuesta.ok, `siembra de classes/${id} fallida: ${await respuesta.text()}`).toBe(true)
}

describe('repositorio de clases contra el emulador (GEN-46)', () => {
  it('lista las clases del emulador ordenadas por fecha, sin sesión previa', async () => {
    // La lectura anónima solo funciona con las reglas de lectura pública.
    const repositorio = crearRepositorioClases(db)
    const clases = await repositorio.listarClases()
    const ids = clases.map((clase) => clase.id)

    expect(ids).toContain(`demo-${SUFIJO}-temprana`)
    expect(ids).toContain(`demo-${SUFIJO}-tardia`)
    expect(ids).not.toContain(`demo-${SUFIJO}-invalida`)

    const temprana = clases.find((clase) => clase.id === `demo-${SUFIJO}-temprana`)
    const tardia = clases.find((clase) => clase.id === `demo-${SUFIJO}-tardia`)
    expect(temprana).toMatchObject({
      titulo: 'Yin (demo)',
      fechaInicio: '2027-03-01T08:00:00.000Z',
      duracionMinutos: 60,
      capacidadPlazas: 10,
    })
    expect(ids.indexOf(`demo-${SUFIJO}-temprana`)).toBeLessThan(ids.indexOf(`demo-${SUFIJO}-tardia`))
    expect(tardia).toMatchObject({ duracionMinutos: 75, capacidadPlazas: 8 })
  })
})
