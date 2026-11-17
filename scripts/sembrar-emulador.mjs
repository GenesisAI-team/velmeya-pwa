// Siembra datos de DEMOSTRACIÓN en los emuladores locales (GEN-46).
//
//   pnpm emuladores        # en otra terminal: Auth 9099, Firestore 8080
//   pnpm sembrar:emulador
//
// Los datos creados son exclusivamente de prueba (usuarios y clases "demo"),
// nunca reales. Solo toca el proyecto demo-velmeya-local del Emulator Suite.
// Las clases se escriben con la cabecera de propietario del emulador
// (equivalente a Functions/admin): el cliente no puede escribir `classes`.
const HOST_AUTH = '127.0.0.1'
const PUERTO_AUTH = 9099
const HOST_FIRESTORE = '127.0.0.1'
const PUERTO_FIRESTORE = 8080
const PROYECTO = 'demo-velmeya-local'

// Misma apiKey que .env.example: el emulador de Auth separa cuentas por clave.
const CLAVE_API = process.env.API_KEY_EMULADOR ?? 'placeholder-api-key'
const CONTRASENA_DEMO = 'demo1234'

const USUARIOS_DEMO = [
  { email: 'alumno@demo.local', rol: 'alumno' },
  { email: 'profesora@demo.local', rol: 'profesor' },
]

// Instantes en 2027: claramente futuros y marcados como demo en el título.
const CLASES_DEMO = [
  { id: 'demo-1', titulo: 'Hatha (demo)', fechaInicio: '2027-01-11T09:00:00.000Z', duracionMinutos: 60, capacidadPlazas: 12, profesorId: '' },
  { id: 'demo-2', titulo: 'Vinyasa (demo)', fechaInicio: '2027-01-11T18:30:00.000Z', duracionMinutos: 75, capacidadPlazas: 8, profesorId: '' },
  { id: 'demo-3', titulo: 'Yin (demo)', fechaInicio: '2027-01-12T08:00:00.000Z', duracionMinutos: 60, capacidadPlazas: 10, profesorId: '' },
]

async function altaUsuario(email, contrasena) {
  const respuesta = await fetch(
    `http://${HOST_AUTH}:${PUERTO_AUTH}/www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=${CLAVE_API}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: contrasena, returnSecureToken: true }),
    },
  )
  const cuerpo = await respuesta.json()
  if (cuerpo.localId) return { creado: true, uid: cuerpo.localId }
  if (String(cuerpo.error?.message ?? '').includes('EMAIL_EXISTS')) {
    return { creado: false }
  }
  throw new Error(`Alta fallida para ${email}: ${JSON.stringify(cuerpo)}`)
}

async function sembrarClase({ id, titulo, fechaInicio, duracionMinutos, capacidadPlazas, profesorId }) {
  const campos = {
    titulo: { stringValue: titulo },
    fechaInicio: { stringValue: fechaInicio },
    duracionMinutos: { integerValue: String(duracionMinutos) },
    capacidadPlazas: { integerValue: String(capacidadPlazas) },
  }
  if (profesorId) campos.profesorId = { stringValue: profesorId }
  const respuesta = await fetch(
    `http://${HOST_FIRESTORE}:${PUERTO_FIRESTORE}/v1/projects/${PROYECTO}/databases/(default)/documents/classes?documentId=${id}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
      body: JSON.stringify({ fields: campos }),
    },
  )
  if (!respuesta.ok) {
    throw new Error(`Siembra fallida de classes/${id}: ${await respuesta.text()}`)
  }
}

async function comprobarEmuladores() {
  try {
    const respuesta = await fetch(`http://${HOST_FIRESTORE}:${PUERTO_FIRESTORE}/`)
    return respuesta.ok || respuesta.status === 400
  } catch {
    return false
  }
}

const emuladoresActivos = await comprobarEmuladores()
if (!emuladoresActivos) {
  console.error('Los emuladores no responden. Arranca primero: pnpm emuladores')
  process.exit(1)
}

console.log('DATOS DE DEMOSTRACIÓN (no reales) para demo-velmeya-local:')

for (const usuario of USUARIOS_DEMO) {
  const resultado = await altaUsuario(usuario.email, CONTRASENA_DEMO)
  console.log(
    `  usuario ${usuario.email} (${usuario.rol}): ` +
      (resultado.creado ? `creado (${resultado.uid})` : 'ya existía'),
  )
}
console.log(`  contraseña de los usuarios demo: ${CONTRASENA_DEMO}`)

for (const clase of CLASES_DEMO) {
  await sembrarClase(clase)
  console.log(`  clase ${clase.id} "${clase.titulo}" sembrada (${clase.fechaInicio})`)
}

console.log('Listo. Con VITE_USE_FIREBASE_EMULATORS=true, la app leerá estos horarios.')
