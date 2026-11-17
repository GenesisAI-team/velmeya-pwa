import { expect } from 'vitest'

// Apoyo compartido por la suite de emuladores (GEN-51): siembra de documentos
// vía REST del emulador con la cabecera de propietario (acceso privilegiado,
// equivalente a las Functions). Los campos van como cadenas, como en la
// siembra de scripts/sembrar-emulador.mjs.

export interface SembradorDocumento {
  (coleccion: string, id: string, campos: Record<string, string>): Promise<void>
}

export function crearSembrador(
  proyecto: string,
  host = '127.0.0.1',
  puerto = 8080,
): SembradorDocumento {
  return async (coleccion, id, campos) => {
    const fields: Record<string, { stringValue: string }> = {}
    for (const [clave, valor] of Object.entries(campos)) {
      fields[clave] = { stringValue: valor }
    }
    const respuesta = await fetch(
      `http://${host}:${puerto}/v1/projects/${proyecto}/databases/(default)/documents/${coleccion}?documentId=${id}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
        body: JSON.stringify({ fields }),
      },
    )
    expect(
      respuesta.ok,
      `siembra de ${coleccion}/${id} fallida: ${await respuesta.text()}`,
    ).toBe(true)
  }
}
