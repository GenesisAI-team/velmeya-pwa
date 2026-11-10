# Arquitectura — Velmeya PWA

Documento de referencia del bootstrap técnico (`GEN-35`). Describe la
estructura real del repo y las decisiones tomadas. Issue de Linear: `GEN-35`.

---

## 1. Resumen

PWA de reservas de clases de yoga construida con **React + TypeScript + Vite**
(pnpm) y **Firebase** (Auth, Firestore y Functions v2) configurado para
desarrollo local exclusivamente vía **Emulator Suite**. Aún no existe
conexión real a un proyecto de Firebase ni despliegue.

Estado (noviembre 2026):

- Contratos de dominio con validaciones TDD (usuarios, clases, reservas).
- Shell responsive mínimo, manifest PWA instalable y service worker offline
  reducido.
- Emuladores configurados (Auth 9099, Firestore 8080, Functions 5001, UI 4000).
- Sin backend conectado: la UI muestra datos estáticos con aviso de entorno.

## 2. Estructura del repositorio

```text
velmeya-pwa/
├── index.html                  # Entrada HTML (lang es, manifest, theme-color)
├── package.json                # Scripts: dev, test, lint, typecheck, build...
├── pnpm-workspace.yaml         # Workspace: app raíz + functions
├── vite.config.ts              # Vite + Vitest (jsdom, setup en src/test)
├── tsconfig*.json              # Config TypeScript estricta (app / node)
├── eslint.config.js            # ESLint 10 plano (ts + react-hooks)
├── firebase.json               # Emuladores y Firestore/Functions (sin hosting)
├── firestore.rules             # Reglas iniciales: deny-all
├── .env.example                # Contrato de variables de entorno (placeholders)
├── AGENTS.md                   # Contrato de trabajo para agentes
├── docs/                       # ARQUITECTURE (este doc), WORKFLOW, DATA_MODEL
├── public/                     # manifest.webmanifest, icons/, favicon, sw.js
├── src/
│   ├── main.tsx                # Montaje React + registro de SW en producción
│   ├── App.tsx                 # Shell responsive con nav Horarios/Reservas
│   ├── domain/
│   │   ├── tipos.ts            # Usuario, Clase, Reserva, Validacion<T>...
│   │   ├── fechas.ts           # Helpers esFechaISO / esEnteroEnRango
│   │   ├── usuario.ts          # validarUsuario
│   │   ├── clase.ts            # validarClase, plazasDisponibles
│   │   └── reserva.ts          # filtrarConfirmadas, reservar, cancelar, validarReserva
│   ├── infrastructure/
│   │   └── firebase/
│   │       └── config.ts       # cargarConfigFirebase + usarEmuladores
│   └── styles/global.css       # Design system mínimo (mobile-first)
└── functions/                  # Package Functions v2 (scaffold, ping)
```

## 3. Capas y reglas de dependencia

- **`src/domain`**: TypeScript puro, sin React ni Firebase. Define entidades
  (`Usuario`, `Clase`, `Reserva`), entradas parciales y el patrón de
  resultado `Validacion<T>` con códigos de error estables
  (`ID_REQUERIDO`, `CLASE_COMPLETA`...). Las reglas de negocio
  (`reservar`, `cancelar`, `plazasDisponibles`) son funciones puras
  testeables sin entorno.
- **`src/infrastructure`**: solo configuración en esta fase
  (`cargarConfigFirebase`, `usarEmuladores`). El dominio nunca importa de
  aquí; la infraestructura puede usar el dominio.
- **UI shell** (`App.tsx` + `global.css`): mobile-first, sin framework CSS.
  Lee `VITE_USE_FIREBASE_EMULATORS` para mostrar el estado del backend.
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
- **ADR-4 — Reglas Firestore deny-all**: no se relaja hasta existir
  autenticación real y caminos de datos probados (ver `docs/DATA_MODEL.md`).
- **ADR-5 — Service worker manual mínimo**: sin Workbox en el bootstrap.
  Estrategia: `cache-first` para estáticos same-origin, `network-first` con
  fallback al shell cacheado para navegaciones.
- **ADR-6 — Emuladores con `--project demo-velmeya-local`**: el prefijo
  `demo-` del proyecto garantiza que nunca se toca producción, y evita
  commitear `.firebaserc` (que además está en `.gitignore`).

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
  `singleProject: true`; `firestore.rules` en deny-all; funciones apunta a
  `functions/` (codebase `default`). **No hay configuración de hosting**.
- `functions/`: TypeScript → `dist`, `onCall({ cors: true })` con `ping`.
  Dependencias mínimas (`firebase-functions`); `firebase-admin` se añadirá
  con la primera función que necesite acceso a Firestore.
- Pendiente (fases siguientes, nuevas issues): inicialización del SDK en la
  app, autenticación, listeners de Firestore y reglas por colección.

## 7. Calidad y CI

- Quality gates locales: `lint`, `typecheck` (app y functions), `test:run`,
  `build` (app) y `build:functions`.
- `.github/workflows/ci.yml`: mismas gates sobre Node 22 con pnpm
  (fijado en `packageManager`), lockfile congelado.
- Estricta: `strict: true`, `noUnusedLocals`, `noUncheckedSideEffectImports`;
  ESLint plano con `@eslint/js`, `typescript-eslint` y plugins de React.
