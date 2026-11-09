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

`pnpm dev` arranca solo el frontend; para datos reales (futuro) hay que tener
los emuladores levantados y `VITE_USE_FIREBASE_EMULATORS=true` en
`.env.local`. Hoy la app no se conecta a ningún backend: muestra estados
vacíos y el aviso de entorno (`App.tsx`).

## 3. Comandos disponibles

| Comando                       | Descripción                                            |
| ----------------------------- | ------------------------------------------------------ |
| `pnpm dev`                    | Servidor Vite en `http://localhost:5173`.              |
| `pnpm preview`                | Sirve el build de producción en local.                 |
| `pnpm test` / `pnpm test:run` | Vitest una sola pasada (equivalentes, aptos para CI).  |
| `pnpm test:watch`             | Vitest en modo watch para el desarrollo.               |
| `pnpm test:coverage`          | Tests con informe de cobertura (v8).                   |
| `pnpm lint`                   | ESLint 10 (config plana en `eslint.config.js`).        |
| `pnpm typecheck`              | `tsc -b` (tsconfig app + node).                        |
| `pnpm build`                  | `tsc -b && vite build` → `dist/`.                      |
| `pnpm emulators`              | `firebase emulators:start --project demo-velmeya-local`. |
| `pnpm build:functions`        | Compila `functions/` (TS → `functions/dist`).          |
| `pnpm typecheck:functions`    | `tsc --noEmit` de `functions/`.                        |

`test:e2e` no existe todavía: queda para una issue futura (fuera de alcance
en el bootstrap).

## 4. Emuladores de Firebase

```bash
pnpm emulators
```

- Puertos fijados en `firebase.json`: UI 4000, Auth 9099, Firestore 8080,
  Functions 5001, `singleProject: true`.
- Siempre con `--project demo-velmeya-local`: el prefijo `demo-` impide que
  cualquier operación llegue a un proyecto real; no se necesita ni existe
  `firebase login` para esta fase.
- Los datos del emulador son **volátiles**; para persistencia en local usa
  `--export-on-exit=.emulator-data` / `--import=.emulator-data` (carpeta
  `.emulator-data` está en `.gitignore`).
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
