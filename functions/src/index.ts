import { onCall } from 'firebase-functions/v2/https'

// GEN-35: scaffold mínimo de Functions v2, sin lógica de negocio.
// La logica de reservas en servidor (cancelaciones, notificaciones) llega en
// issues posteriores; aquí solo se demuestra que la base v2 emulable funciona.
export const ping = onCall({ cors: true }, async () => {
  return { ok: true, ts: new Date().toISOString() }
})
