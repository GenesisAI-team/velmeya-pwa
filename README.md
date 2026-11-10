# Velmeya PWA

> **Estado del repositorio: fase 2 operativa contra emuladores (`GEN-46`).**
> El bootstrap de `GEN-35` dejó estructura, tests, PWA mínima y emuladores;
> `GEN-46` conectó Firebase Auth (inicio/cierre/sesión restaurada con pantalla
> protegida) y Firestore (horarios reales del emulador) con reglas por
> colección y suite de tests de emuladores. Los comandos de este README son
> operativos y están descritos en detalle en `docs/WORKFLOW.md`.

PWA de reservas de clases de yoga: consultar horarios, reservar plaza y gestionar
reservas desde el móvil y el escritorio, con experiencia instalable y funcionamiento
base sin conexión.

Issues de Linear asociadas: `GEN-7` (visión y convenciones), `GEN-35`
(bootstrap técnico) y `GEN-46` (autenticación y consulta real de clases).

---

## Índice

1. [Visión del producto](#1-visión-del-producto)
2. [Stack previsto](#2-stack-previsto)
3. [Estructura del repositorio (prevista)](#3-estructura-del-repositorio-prevista)
4. [Documentación complementaria (pendiente)](#4-documentación-complementaria-pendiente)
5. [Prerrequisitos](#5-prerrequisitos)
6. [Instalación inicial (prevista)](#6-instalación-inicial-prevista)
7. [Configuración local y variables de entorno](#7-configuración-local-y-variables-de-entorno)
8. [Comandos de desarrollo (previstos, no operativos)](#8-comandos-de-desarrollo-previstos-no-operativos)
9. [Flujo de desarrollo con Linear](#9-flujo-de-desarrollo-con-linear)
10. [Firebase Emulator Suite (notas breves)](#10-firebase-emulator-suite-notas-breves)
11. [Protección de credenciales](#11-protección-de-credenciales)
12. [Desarrollo frente a producción](#12-desarrollo-frente-a-producción)
13. [Alcance: lo que este README no cubre](#13-alcance-lo-que-este-readme-no-cubre)

---

## 1. Visión del producto

Velmeya es una **Progressive Web App (PWA) de reservas de yoga** orientada a estudios
y practicantes:

- Ver la oferta de clases y horarios disponibles.
- Reservar y cancelar plaza en una clase.
- Consultar el estado de las reservas propias.
- Recibir una experiencia rápida, instalable y usable desde el móvil.

El proyecto nace como PWA: primera carga web, instalación opcional en el
dispositivo y una base offline razonable (por definir en `docs/ARCHITECTURE.md`
cuando exista).

Público inicial: alumnado y profesorado de un estudio de yoga pequeño o mediano.
Esta visión se refinará en la documentación de arquitectura y modelo de datos
cuando se creen (ver sección 4).

## 2. Stack (instalado en el bootstrap GEN-35)

- **React 19 + TypeScript** como base de la interfaz.
- **Vite** como herramienta de desarrollo y construcción.
- **pnpm** como gestor de paquetes (versión fijada en `packageManager`).
- **Vitest + Testing Library + jsdom** para pruebas unitarias y smoke.
- **ESLint 10** con `typescript-eslint` y plugins de React.
- **Firebase** como backend gestionado, conectado en local vía **Emulator
  Suite** desde `GEN-46` (nunca contra un proyecto real en esta fase):
  - **Auth** para autenticación de usuarios (inicio/cierre/sesión restaurada).
  - **Firestore** como base de datos principal (horarios leídos del emulador).
  - **Functions v2** para lógica de servidor (scaffold en `functions/`).
  - **Emulator Suite** para desarrollo y pruebas en local sin tocar producción.

## 3. Estructura del repositorio (prevista)

Estructura orientativa. Ninguno de estos archivos o carpetas existe todavía;
se crearán en issues posteriores al bootstrap técnico:

```text
velmeya-pwa/
├── README.md              # Este archivo
├── AGENTS.md              # Contrato para agentes
├── docs/                  # ARCHITECTURE.md, WORKFLOW.md y DATA_MODEL.md
├── src/                   # Código React + TS (dominio, infraestructure, UI)
├── public/                # Manifiesto PWA, iconos, sw.js, favicon
├── functions/             # Cloud Functions v2 (scaffold con ping)
├── .env.example           # Ejemplo de variables de entorno (sin secretos)
└── package.json           # Scripts de calidad y desarrollo
```

La estructura completa (sin abreviar) está documentada en
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## 4. Documentación complementaria

- [`AGENTS.md`](AGENTS.md) — normas para agentes y automatización
  (seguridad, flujo Linear/GitHub, TDD obligatorio, quality gates).
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitectura, capas,
  decisiones (mini-ADRs) y límites offline de la PWA.
- [`docs/WORKFLOW.md`](docs/WORKFLOW.md) — comando a comando, emuladores,
  flujo de ramas/PR y gestión de secretos.
- [`docs/DATA_MODEL.md`](docs/DATA_MODEL.md) — colecciones de Firestore,
  contratos del dominio, reglas de negocio y seguridad.

## 5. Prerrequisitos

- **Node.js 22+** (CI usa la línea 22; `package.json` exige `>=22`).
- **pnpm 10** (versión exacta fijada en `packageManager`; `corepack enable`
  la respeta automáticamente).
- **Firebase CLI ≥ 15** (global) para el Emulator Suite; requiere **JDK 21+**
  a su vez (ver `docs/WORKFLOW.md`, sección de emuladores).
- **Git** para control de versiones.
- Un editor con soporte TypeScript (recomendado, no obligatorio).

Verificación:

```bash
node --version   # v22.x o superior
pnpm --version   # 10.x
firebase --version
```

## 6. Instalación inicial

```bash
# 1. Clonar el repositorio y situarse en la rama de trabajo
git clone <remoto-del-proyecto>
cd velmeya-pwa
git checkout main
git pull origin main

# 2. Instalar dependencias (app raíz + functions del workspace)
pnpm install --frozen-lockfile

# 3. Copiar el ejemplo de entorno y ajustarlo en local (ver sección 7)
cp .env.example .env.local

# 4. Arrancar el entorno local
pnpm dev     # http://localhost:5173
```

Verificación rápida post-instalación (todos los quality gates):

```bash
pnpm lint && pnpm typecheck && pnpm test:run && pnpm build
```

Si algo falla, detente y reporta el fallo con la salida completa; no se
salta ninguna comprobación (ver `AGENTS.md`).

## 7. Configuración local y variables de entorno

- Nunca se commitean secretos. Los archivos reales de entorno (`.env`,
  `.env.local`) están ignorados por `.gitignore` y solo viven en cada
  máquina.
- El repositorio incluye un archivo de ejemplo **`.env.example`** con claves
  y valores ficticios (`placeholder`), exactamente el contenido del bloque
  siguiente. No contiene ningún secreto real.

Contenido correlativo de `.env.example` (valores ficticios, solo ejemplo):

```bash
# Ejemplo de .env.example — VALORES FICTICIOS, no usar en producción.
# Copiar a .env.local y rellenar con valores locales / del Emulator Suite.

# Proyecto Firebase (identificadores públicos no sensibles del proyecto)
VITE_FIREBASE_API_KEY=placeholder-api-key
VITE_FIREBASE_AUTH_DOMAIN=placeholder-auth-domain.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=placeholder-project-id
VITE_FIREBASE_STORAGE_BUCKET=placeholder-storage-bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=placeholder-sender-id
VITE_FIREBASE_APP_ID=placeholder-app-id

# Indica si el frontend debe apuntar a los emuladores en local
VITE_USE_FIREBASE_EMULATORS=true
```

Reglas de uso:

1. `cp .env.example .env.local` y edita solo `.env.local`.
2. No copies valores de producción a `.env.local` salvo indicación explícita.
3. Si una clave falta en `.env.example`, se propone añadirla con valor
   `placeholder` en la misma PR que la necesite, sin incluir el valor real.

## 8. Comandos de desarrollo (operativos)

Todos los comandos existen en `package.json` y están en verde en CI:

| Comando | Descripción |
|---|---|
| `pnpm install` | Instala dependencias (app raíz + functions del workspace). |
| `pnpm dev` | Servidor Vite (`http://localhost:5173`). |
| `pnpm lint` | ESLint 10 sobre `src/`, `functions/` y configs. |
| `pnpm typecheck` | Verificación de tipos (`tsc -b`, app + configs). |
| `pnpm test` | Pruebas unitarias y smoke en una pasada (Vitest run). |
| `pnpm test:run` | Alias de `pnpm test`, útil en CI. |
| `pnpm test:watch` | Vitest en modo reloj para desarrollo. |
| `pnpm test:coverage` | Con informe de cobertura (v8). |
| `pnpm test:emuladores` | Suite de reglas y adaptadores contra el Emulator Suite (exige emuladores en marcha). |
| `pnpm build` | `tsc -b && vite build` → `dist/` (PWA lista para servir). |
| `pnpm preview` | Previsualiza el build de producción en local. |
| `pnpm emuladores` | Firebase Emulator Suite con proyecto `demo-velmeya-local`. |
| `pnpm sembrar:emulador` | Datos de DEMOSTRACIÓN (usuarios y clases) en los emuladores. |
| `pnpm build:functions` | Compila `functions/` (Cloud Functions v2). |
| `pnpm typecheck:functions` | Tipos de `functions/` sin emitir. |

Notas:

- `pnpm test` y `pnpm test:run` son equivalentes: ambas ejecutan `vitest run`
  (sin watch) para que ningún gate quede colgado de un proceso interactivo.
- `test:e2e` queda para issue futura (fuera de alcance del bootstrap
  `GEN-35`); no existe en `package.json` todavía.

## 9. Flujo de desarrollo con Linear

Linear es la **fuente de verdad** para el trabajo: todo cambio empieza en una
issue y termina con su transición de estado.

1. **Partir de la issue.** Todo trabajo se asocia a una issue `GEN-XXX`
   (por ejemplo `GEN-7` para este README). La issue describe el objetivo y sus
   criterios de aceptación; la PR debe referenciarla.
2. **Mover la issue en Linear.** Transición esperada:
   `Todo` → `In Progress` (al empezar) → `In Review` (al abrir la PR) →
   `Done` (al fusionar). Las transiciones las ejecuta el coordinador o
   persona responsable; los agentes no escriben en Linear por defecto
   (ver `AGENTS.md`).
3. **Crear una rama por issue** desde `main` actualizado, con la convención:
   - `feat/GEN-XXX-descripcion-corta` para funcionalidad.
   - `fix/GEN-XXX-descripcion-corta` para correcciones.
   - `docs/GEN-XXX-descripcion-corta` para documentación (como este README).
   
   Ejemplo: `docs/GEN-7-readme-comandos-desarrollo`.
4. **Gates antes de pedir revisión** (operativos, automatizados también en CI):
   - `pnpm lint` sin errores.
   - `pnpm typecheck` (y `typecheck:functions` si toca `functions/`).
   - `pnpm test:run` en verde.
   - `pnpm build` genera la PWA sin errores (y `build:functions` si toca).
   - Sin secretos ni credenciales en el diff; `.env.local` nunca se commitea.
   - CI de GitHub Actions en verde para el push (`.github/workflows/ci.yml`).
5. **Abrir la Pull Request** contra `main`, con título que cite la issue
   (p. ej. `docs(GEN-7): ...`) y descripción que la referencie (p. ej.
   `Closes GEN-7` o la sintaxis que use el equipo para Linear). Solicita
   revisión y comunica al coordinador para pasar la issue a `In Review`.
6. **Fusión y cierre.** Tras la aprobación y los checks en verde, quien revise
   fusiona y la issue pasa a `Done`. El detalle operativo de CI y fusiones
   está en `docs/WORKFLOW.md`.

## 10. Firebase Emulator Suite (configuración real)

- El Emulator Suite permite desarrollar y probar contra emuladores locales de
  Auth, Firestore y Functions **sin escribir en el proyecto real de Firebase**.
- Configuración en `firebase.json`: UI `4000`, Auth `9099`, Firestore
  `8080`, Functions `5001`, `singleProject: true`; reglas de Firestore en
  `firestore.rules` (deny-all inicial).
- Comando: `pnpm emulators`, equivalente a
  `firebase emulators:start --project demo-velmeya-local`. El prefijo
  `demo-` garantiza que nunca se toca producción y evita necesitar
  `firebase login` ni `.firebaserc`.
- Los datos del emulador son volátiles; exporta/importa con
  `--export-on-exit` / `--import` a una carpeta `.emulator-data`
  (ignorada por Git).
- Requisito: Firebase CLI ≥ 15 y **JDK 21+** (con JDK 17 el arranque falla
  con «firebase-tools no longer supports Java version before 21»; ver
  `docs/WORKFLOW.md`).
- Flujo: arranca los emuladores y usa `VITE_USE_FIREBASE_EMULATORS=true`
  en `.env.local` para que la app apunte a ellos. Con los emuladores en
  marcha, `pnpm sembrar:emulador` crea usuarios y clases de **demostración**
  (nada real); la app muestra esos horarios y permite iniciar sesión con los
  usuarios demo (`alumno@demo.local` / `demo1234`). Los datos del emulador
  son volátiles: vuelve a sembrar tras reiniciarlo.

## 11. Protección de credenciales

- **Nunca commitees secretos**: claves privadas, tokens, contraseñas, ficheros
  de cuentas de servicio ni el contenido real de `.env` / `.env.local`.
- Usa siempre valores `placeholder` en `.env.example` y en cualquier ejemplo de
  este README o de la futura documentación.
- Antes de cada commit, revisa el diff (`git status` / `git diff`) y confirma
  que no incluye archivos de entorno reales ni credenciales pegadas en código o
  comentarios.
- Si un secreto llega a commitearse por error, avisa al equipo de inmediato,
  rotalo en el proveedor correspondiente y limpia el historial según el
  procedimiento que defina el equipo (no basta con borrarlo en el siguiente
  commit).
- Las claves públicas de configuración web de Firebase (`apiKey`, `projectId`,
  etc.) no son secretos en sentido estricto, pero por prudencia se gestionan
  también vía variables de entorno y nunca se duplican en el código.

## 12. Desarrollo frente a producción

- **Desarrollo**: emuladores locales + `.env.local` con valores locales o
  ficticios. Ningún dato real de usuarios debe usarse para probar.
- **Producción**: proyecto Firebase real, variables gestionadas en el entorno de
  alojamiento/CI, fuera del repositorio. Nadie debe copiar valores de
  producción a archivos locales salvo procedimiento explícito del equipo.
- El conmutador entre ambos es `VITE_USE_FIREBASE_EMULATORS` (`true` en
  local, `false` o ausente contra el proyecto real), implementado en
  `src/infrastructure/firebase/config.ts` (`usarEmuladores`).
- En caso de duda sobre a qué entorno apunta tu copia, detente y verifica la
  configuración antes de ejecutar escrituras.

## 13. Alcance: lo que este README no cubre

- Este README **no incluye instrucciones de despliegue**. Cualquier paso de
  despliegue a Hosting / Functions queda pendiente de verificar y se
  documentará cuando exista la configuración y el procedimiento probado
  (en issue propia; `firebase.json` no incluye hosting por decisión del
  bootstrap).
- Las reservas y cancelaciones completas, el panel admin, los emails y los
  pagos siguen siendo alcance futuro; el dominio en `src/domain` define
  solo contratos y validaciones amparadas por tests.

---

*Documento original de `GEN-7` y actualizado por el bootstrap `GEN-35`
(`package.json`, `firebase.json`, `.env.example`, `AGENTS.md` y `docs/`).
Mantener en sincronía con el estado real del repo.*
