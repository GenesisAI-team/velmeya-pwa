# Flujo de trabajo — Velmeya PWA

Detalle operativo para humanos y agentes. Complementa a `AGENTS.md` y al
[protocolo del proyecto](https://linear.app/genesisnavarra/document/protocolo-de-trabajo-ultimate-coding-chatgpt-codex-y-opencode-12e289b81826).

---

## 1. Prerrequisitos

- Node.js LTS reciente (CI usa 22; el repo exige `>=22` en `engines`).
- pnpm 10 (versión fijada en `packageManager` de `package.json`; con
  `corepack enable` se respeta automáticamente).
- Firebase CLI ≥ 15 para los emuladores (`npm i -g firebase-tools`).
  Requiere **JDK 21+** para arrancar el Emulator Suite (con JDK 17 falla
  con el mensaje «firebase-tools no longer supports Java version before 21»).
- Git y editor con soporte TypeScript.

## 2. Arranque en local

```bash
pnpm install --frozen-lockfile   # instala app raíz + functions del workspace
cp .env.example .env.local       # placeholders; editar solo .env.local
pnpm dev                         # http://localhost:5173 ( HTTP 200 con el shell )
```

`pnpm dev` arranca solo el frontend. Con `VITE_USE_FIREBASE_EMULATORS=true`
en `.env.local` (valor por defecto de `.env.example`), la app conecta Auth y
Firestore a los emuladores locales: sin emuladores en marcha, los horarios
muestran error de carga y la sesión no se puede iniciar. Para poblar el
emulador con datos de demostración: `pnpm sembrar:emulador` (ver sección 4).

## 3. Comandos disponibles

| Comando                       | Descripción                                            |
| ----------------------------- | ------------------------------------------------------ |
| `pnpm dev`                    | Servidor Vite en `http://localhost:5173`.              |
| `pnpm preview`                | Sirve el build de producción en local.                 |
| `pnpm test` / `pnpm test:run` | Vitest una sola pasada (equivalentes, aptos para CI).  |
| `pnpm test:watch`             | Vitest en modo watch para el desarrollo.               |
| `pnpm test:coverage`          | Tests con informe de cobertura (v8).                   |
| `pnpm test:emuladores`        | Suite que exige el Emulator Suite en marcha (reglas Firestore y adaptadores reales). |
| `pnpm lint`                   | ESLint 10 (config plana en `eslint.config.js`).        |
| `pnpm typecheck`              | `tsc -b` (tsconfig app + node).                        |
| `pnpm build`                  | `tsc -b && vite build` → `dist/`.                      |
| `pnpm emuladores`             | `firebase emulators:start --project demo-velmeya-local`. |
| `pnpm sembrar:emulador`       | Crea usuarios y clases de DEMOSTRACIÓN en los emuladores. |
| `pnpm build:functions`        | Compila `functions/` (TS → `functions/dist`).          |
| `pnpm typecheck:functions`    | `tsc --noEmit` de `functions/`.                        |

`test:e2e` no existe todavía: queda para una issue futura (fuera de alcance
en el bootstrap).

## 4. Emuladores de Firebase

```bash
pnpm emuladores
```

- Puertos fijados en `firebase.json`: UI 4000, Auth 9099, Firestore 8080,
  Functions 5001, `singleProject: true`.
- Siempre con `--project demo-velmeya-local`: el prefijo `demo-` impide que
  cualquier operación llegue a un proyecto real; no se necesita ni existe
  `firebase login` para esta fase.
- Los datos del emulador son **volátiles**; para persistencia en local usa
  `--export-on-exit=.emulator-data` / `--import=.emulator-data` (carpeta
  `.emulator-data` está en `.gitignore`).
- Requisito **JDK 21+** para arrancar el Emulator Suite: con JDK 17 en el
  `PATH` falla con «firebase-tools no longer supports Java version before 21».
  En Windows verificado (noviembre 2026): basta con poner primero en `PATH`
  un JDK 21+ disponible, p. ej. el JBR de Android Studio:
  `$env:Path = 'C:\Program Files\Android\Android Studio\jbr\bin;' + $env:Path`
  antes de `pnpm emuladores`. En CI (ubuntu) se instala con `setup-java`
  (temurin 21), ver `.github/workflows/ci.yml`.
- `pnpm sembrar:emulador` crea usuarios y clases de **DEMOSTRACIÓN**
  (títulos marcados como «demo», fechas de 2027; nada de ello es real ni se
  presenta como real): usuarios `alumno@demo.local` y
  `profesora@demo.local` con contraseña `demo1234`, y tres clases en
  `classes`. Las clases se escriben por la REST del emulador con la cabecera
  de propietario (equivalente a Functions/admin), porque las reglas de
  Firestore no permiten al cliente escribir esa colección.
- Con los emuladores en marcha: `pnpm test:emuladores` ejecuta la suite de
  reglas y adaptadores reales (`src/test/emuladores`); es la que corre dentro
  de `firebase emulators:exec` en el job `emuladores` de CI. Sin emuladores,
  esa suite falla por diseño (no hay backend contra el que verificar).
- Prohibido apuntar a producción y enviar credenciales reales al repo; si
  algo del Emulator Suite no arranca (p. ej. JDK), detente y reporta el
  fallo con la salida completa.

## 5. TDD obligatorio (rojo → verde → refactor)

1. **ROJO**: escribe primero los tests junto al módulo (`*.test.ts(x)` con
   `src/test` para smoke transversal). Ejecuta y captura la salida mostrando
   el fallo esperado; esa es la evidencia en la PR.
2. **VERDE**: implementación mínima suficiente para los tests.
3. **REFACTOR**: mejora el diseño (nombres, duplicación, archivos) sin
   cambiar el contrato; la suite debe quedar verde.

Los commits pueden agrupar la fase en un único commit; el historial y la PR
deben poder reconstruir el ciclo. Las fases rojas intermedias se documentan
en el mensaje de commit o en la PR (p. ej. «test: ... (rojo)»).

## 6. Git, Linear y Pull Requests

- Rama por issue desde `main` con formato
  `feat|fix|refactor|chore|docs|perf/GEN-XXX-descripcion-corta`.
- Conventional Commits con la issue en el asunto:
  `feat(GEN-35): modifica el shell responsive...`.
- PR hacia `main` con `GEN-XXX` en título y cuerpo; nunca merge directo.
- Transiciones de la issue (`Todo` → `In Progress` → `In Review` → `Done`)
  las realiza el coordinador o humano responsable.
- Los agentes no escriben en Linear y no hacen merge (salvo que su tarea lo
  ordene expresamente).

## 7. Quality gates antes de pedir revisión

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm typecheck:functions   # si se tocan functions/
pnpm test:run
pnpm build
pnpm build:functions       # si se tocan functions/
```

- CI (`.github/workflows/ci.yml`) ejecuta exactamente esas comprobaciones
  con Node 22 y lockfile congelado; el PR no se revisa sin CI verde.
- Adicionalmente, el job `emuladores` de CI arranca el Emulator Suite con
  JDK 21 y ejecuta `pnpm test:emuladores` dentro de
  `firebase emulators:exec`; esas pruebas no forman parte de `pnpm test:run`
  para que los gates locales no exijan JDK ni emuladores en marcha.
- Si un gate falla: para, reproduce el fallo, reporta la salida completa y
  propón la causa. **No** se relajan umbrales ni se saltan tests.

## 8. Secretos y variables de entorno

- `.env` y `.env.local` están en `.gitignore`; solo se commitea
  `.env.example` con placeholders.
- Nombres de variables de contrato en `.env.example`; añadir una nueva
  variable exige añadirla allí con valor `placeholder` en la misma PR.
- Al detectar un secreto commiteado por error: rotar la credencial y avisar
  al equipo de inmediato (basta con borrarlo en un commit posterior, pero
  el historial exige rotación).
