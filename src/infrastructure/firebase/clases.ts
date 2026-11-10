import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import type { Firestore } from 'firebase/firestore'
import { validarClase } from '../../domain/clase'
import type { RepositorioClases } from '../../domain/puertos'
import type { Clase, EntradaClase, Validacion } from '../../domain/tipos'

/**
 * Mapea un documento de la colección `classes` a la entidad del dominio,
 * validándolo con `validarClase`. Los campos con tipo inesperado se tratan
 * como ausentes (sin excepciones); los documentos que no cumplen el contrato
 * devuelven `ok: false` con los errores acumulados.
 */
export function desdeDocumentoClase(
  id: string,
  datos: Record<string, unknown>,
): Validacion<Clase> {
  const entrada: EntradaClase = {
    id,
    titulo: typeof datos.titulo === 'string' ? datos.titulo : undefined,
    fechaInicio: typeof datos.fechaInicio === 'string' ? datos.fechaInicio : undefined,
    duracionMinutos: typeof datos.duracionMinutos === 'number' ? datos.duracionMinutos : undefined,
    capacidadPlazas: typeof datos.capacidadPlazas === 'number' ? datos.capacidadPlazas : undefined,
    ...(typeof datos.profesorId === 'string' ? { profesorId: datos.profesorId } : {}),
  }
  return validarClase(entrada)
}

/**
 * Repositorio de clases contra Firestore. La lectura es pública (reglas de
 * GEN-46); los documentos que no cumplen el contrato del dominio se omiten
 * del listado y no llegan a la UI.
 */
export function crearRepositorioClases(db: Firestore): RepositorioClases {
  return {
    async listarClases(): Promise<Clase[]> {
      const instantanea = await getDocs(
        query(collection(db, 'classes'), orderBy('fechaInicio', 'asc')),
      )
      const clases: Clase[] = []
      for (const documento of instantanea.docs) {
        const resultado = desdeDocumentoClase(documento.id, documento.data() as Record<string, unknown>)
        if (resultado.ok) clases.push(resultado.valor)
      }
      return clases
    },
  }
}
