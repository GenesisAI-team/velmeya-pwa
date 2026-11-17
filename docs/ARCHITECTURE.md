# Arquitectura — Velmeya PWA

Documento de referencia del bootstrap técnico (`GEN-35`). Describe la
estructura real del repo y las decisiones tomadas. Issue de Linear: `GEN-35`.

---

## 1. Resumen

PWA de reservas de clases de yoga construida con **React + TypeScript + Vite**
(pnpm) y **Firebase** (Auth, Firestore y Functions v2) configurado para
desarrollo local exclusivamente vía **Emulator Suite**. Aún no existe
conexión real a un proyecto de Firebase ni despliegue.

Estado (noviembre 2026, tras `GEN-46`):

- Contratos de dominio con validaciones TDD (usuarios, clases, reservas) y
  puertos de sesión y repositorio (`src/domain/puertos.ts`).
- Autenticación (inicio/cierre/sesión restaurada) contra el **Auth Emulator**,
  con estados de carga y error y la pantalla de reservas protegida.
- Listado y detalle de clases desde el **Firestore Emulator**, validados con
  el dominio; reglas por colección con denegación por defecto y tests de
  reglas (`src/test/emuladores`).
- Shell responsive mínimo, manifest PWA instalable y service worker offline
  reducido.
- Sin backend real: todo contra el Emulator Suite (`demo-velmeya-local`);
  producción sigue fuera de alcance.

## 2. Estructura del repositorio

```text
velmeya-pwa/
├── index.html                  # Entrada HTML (lang es, manifest, theme-color)
├── package.json                # Scripts: dev, test, test:emuladores, lint...
├── pnpm-workspace.yaml         # Workspace: app raíz + functions
├── vite.config.ts              # Vite + Vitest (jsdom; excluye src/test/emuladores)
├── vitest.emuladores.config.ts # Suite de emuladores (entorno node)
├── tsconfig*.json              # Config TypeScript estricta (app / node)
├── eslint.config.js            # ESLint 10 plano (ts + react-hooks)
├── firebase.json               # Emuladores y Firestore/Functions (sin hosting)
├── firestore.rules             # Reglas por colección (GEN-46), denegación por defecto
├── scripts/
│   └── sembrar-emulador.mjs    # Datos de DEMOSTRACIÓN para los emuladores
├── .env.example                # Contrato de variables de entorno (placeholders)
├── AGENTS.md                   # Contrato de trabajo para agentes
├── docs/                       # ARQUITECTURE (este doc), WORKFLOW, DATA_MODEL
├── public/                     # manifest.webmanifest, icons/, favicon, sw.js
├── src/
│   ├── main.tsx                # Cableado: crearServiciosBackend + montaje React
│   ├── App.tsx                 # Shell responsive: horarios (Firestore) + reservas (protegida)
│   ├── domain/
│   │   ├── tipos.ts            # Usuario, Clase, Reserva, Validacion<T>...
│   │   ├── puertos.ts          # PuertoAuth y RepositorioClases (contratos)
│   │   ├── fechas.ts           # esFechaISO / esEnteroEnRango / partesFechaISO
│   │   ├── usuario.ts          # validarUsuario
│   │   ├── clase.ts            # validarClase, plazasDisponibles
│   │   └── reserva.ts          # filtrarConfirmadas, reservar, cancelar, validarReserva
│   ├── infrastructure/
│   │   └── firebase/
│   │       ├── config.ts       # cargarConfigFirebase + usarEmuladores
│   │       ├── app.ts          # crearServiciosBackend (cableado único del SDK)
│   │       ├── auth.ts         # crearAdaptadorAuth (PuertoAuth sobre Firebase Auth)
│   │       ├── clases.ts       # crearRepositorioClases + desdeDocumentoClase
│   │       └── erroresAuth.ts  # mapearErrorAuth: códigos Firebase → códigos estables
│   ├── ui/
│   │   ├── sesion.ts           # Contexto + useSesion (estado de sesión UI)
│   │   ├── ProveedorSesion.tsx # Proveedor con estados carga/anónima/autenticada
│   │   ├── FormularioInicioSesion.tsx
│   │   ├── useClases.ts        # Estados de carga/listado/vacío/error del horario
│   │   ├── ListaClases.tsx
│   │   └── DetalleClase.tsx
│   ├── test/
│   │   ├── setup.ts            # jsdom + jest-dom + cleanup
│   │   ├── fakes.ts            # Duplicados de PuertoAuth/RepositorioClases
│   │   └── emuladores/         # Suite real contra emuladores (reglas y adaptadores)
│   └── styles/global.css       # Design system mínimo (mobile-first)
└── functions/                  # Package Functions v2 (scaffold, ping)
```

## 3. Capas y reglas de dependencia

- **`src/domain`**: TypeScript puro, sin React ni Firebase. Define entidades
  (`Usuario`, `Clase`, `Reserva`), los puertos (`PuertoAuth`,
  `RepositorioClases` en `puertos.ts`) y el patrón de resultado
  `Validacion<T>` con códigos de error estables (`ID_REQUERIDO`,
  `CLASE_COMPLETA`...). Las reglas de negocio (`reservar`, `cancelar`,
  `plazasDisponibles`) son funciones puras testeables sin entorno.
- **`src/infrastructure`**: adaptadores Firebase. `crearServiciosBackend`
  (`app.ts`) es el único punto que inicializa el SDK y conecta los
  emuladores; `auth.ts` implementa `PuertoAuth` y `clases.ts` implementa
  `RepositorioClases` (mapeando documentos con `validarClase`, sin excepciones).
  El dominio nunca importa de aquí; la infraestructura puede usar el dominio.
- **UI** (`src/ui` + `App.tsx`): componentes con estados observables
  (`cargando`/`anónima`/`autenticada` para sesión; `cargando`/`listado`/
  `vacío`/`error` para horarios). Recibe los puertos por props, de modo que
  los tests la ejercitan con duplicados (`src/test/fakes.ts`) sin Firebase.
- **`functions`**: package independiente (Cloud Functions v2, `onCall`)
  con un `ping` de humo; sin lógica de negocio todavía.

## 4. Decisiones (mini-ADRs)

- **ADR-1 — Vite + React + TS + pnpm**: arranque rápido, ecosistema estable;
  pnpm con workspace para aislar `functions`.
- **ADR-2 — Vitest + Testing Library + jsdom**: tests alojados junto al
  módulo; setup común en `src/test/setup.ts` (jest-dom y cleanup).
- **ADR-3 — Errores como códigos, no excepciones**: `Validacion<T>`
  acumula errores (`errores: string[]`) para poder mostrar todos los fallos
  de un formulario de reserva.
- **ADR-4 — Reglas Firestore por colección con denegación por defecto**
  (actualizado en GEN-46): lectura pública de `classes`; `users/{uid}` solo
  accesible a su dueño; `reservations` leíble solo por su dueño y sin
  escrituras de cliente (irán vía Functions). Cualquier relajación nueva
  exige issue propia y tests de reglas en `src/test/emuladores`.
- **ADR-5 — Service worker manual mínimo**: sin Workbox en el bootstrap.
  Estrategia: `cache-first` para estáticos same-origin, `network-first` con
  fallback al shell cacheado para navegaciones.
- **ADR-6 — Emuladores con `--project demo-velmeya-local`**: el prefijo
  `demo-` del proyecto garantiza que nunca se toca producción, y evita
  commitear `.firebaserc` (que además está en `.gitignore`).
- **ADR-7 — Puertos en el dominio, adaptadores en infraestructura (GEN-46)**:
  la UI depende de `PuertoAuth`/`RepositorioClases`, no del SDK; los errores
  de Auth se traducen a códigos estables (`mapearErrorAuth`) y los documentos
  de Firestore se validan con el dominio (`desdeDocumentoClase`) descartando
  los que no cumplen el contrato.
- **ADR-8 — Suite de emuladores separada (GEN-46)**: las pruebas que exigen
  Emulator Suite (reglas Firestore, adaptadores reales) viven en
  `src/test/emuladores` con su config (`vitest.emuladores.config.ts`) y no
  corren en `pnpm test:run`; en CI se ejecutan dentro de
  `firebase emulators:exec` con JDK 21 (job `emuladores`).

## 5. PWA: instalación y límites offline (exactitud)

- `public/manifest.webmanifest`: `start_url /`, `display standalone`,
  tema verde del estudio, iconos SVG (`any` y `maskable`), `lang es`.
- `public/sw.js` (registrado solo en `import.meta.env.PROD`, desde
  `src/main.tsx`):
  - Instala el shell (`/`, manifest, favicon, iconos) en `velmeya-shell-v1`.
  - Navegaciones: red primero; si falla, sirve la navegación cacheada o `/`.
  - Estáticos same-origin: caché primero; al fetch con éxito, se guardan
    versionados por runtime (los assets con hash de `dist/` se cachéan al
    primer uso).
- Límites documentados (no vender más de lo que hay):
  1. La **primera visita necesita red** (no hay precache del build final).
  2. Sin `background sync`, sin push, sin indexación de respuestas API.
  3. Los cambios de shell requieren incrementar `CACHE` (`-v2`, `-v3`...):
     el `activate` antiguo borra cachés con nombres previos.
  4. La funcionalidad de lectura/escritura offline real de Firestore se
     habilitará al conectar el SDK (fases siguientes); hoy solo hay shell.

## 6. Firebase: qué está y qué falta

- `firebase.json`: emuladores Auth/Firestore/Functions/UI con
  `singleProject: true`; `firestore.rules` por colección (clases lectura
  pública, usuarios y reservas privados por dueño, denegación por defecto);
  funciones apunta a `functions/` (codebase `default`). **No hay
  configuración de hosting**.
- SDK conectado (`GEN-46`): `crearServiciosBackend` inicializa app, Auth y
  Firestore y, si `VITE_USE_FIREBASE_EMULATORS=true`, conecta al Emulator
  Suite (Auth 9099, Firestore 8080). Con configuración incompleta la app
  muestra los códigos de error estables en lugar de arrancar a medias.
- Datos: `pnpm sembrar:emulador` siembra usuarios y clases **de
  demostración** en el emulador (nada real).
- `functions/`: TypeScript → `dist`, `onCall({ cors: true })` con `ping`.
  Dependencias mínimas (`firebase-functions`); `firebase-admin` se añadirá
  con la primera función que necesite acceso a Firestore.
- Pendiente (fases siguientes, nuevas issues): reservas transaccionales
  (escrituras vía Functions), registro de cuentas nuevas desde la app
  (hoy los usuarios se crean en el Emulator UI o con el script de siembra),
  listeners en tiempo real y despliegue a producción.

## 7. Calidad y CI

- Quality gates locales: `lint`, `typecheck` (app y functions), `test:run`,
  `build` (app) y `build:functions`.
- `.github/workflows/ci.yml`: mismas gates sobre Node 22 con pnpm
  (fijado en `packageManager`), lockfile congelado.
- Estricta: `strict: true`, `noUnusedLocals`, `noUncheckedSideEffectImports`;
  ESLint plano con `@eslint/js`, `typescript-eslint` y plugins de React.
