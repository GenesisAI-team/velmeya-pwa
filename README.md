# Velmeya PWA

> **Estado del repositorio: inicial.**
> Este `README.md` describe la visión y el flujo de trabajo previsto del proyecto.
> Todavía **no existe `package.json` ni código funcional** en la rama `main`;
> todos los comandos y configuraciones de este documento están marcados como
> **previstos / pendientes de implementación** y ninguno debe considerarse operativo.

PWA de reservas de clases de yoga: consultar horarios, reservar plaza y gestionar
reservas desde el móvil y el escritorio, con experiencia instalable y funcionamiento
base sin conexión.

Issue de Linear asociada: `GEN-7`.

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

## 2. Stack previsto

Stack previsto (pendiente de implementación; las versiones exactas se fijarán en
`package.json`, `pnpm-workspace.yaml` o equivalente cuando se cree el bootstrap
técnico):

- **React + TypeScript** como base de la interfaz.
- **Vite** como herramienta de desarrollo y construcción.
- **pnpm** como gestor de paquetes.
- **Firebase** como backend gestionado:
  - **Hosting** para servir la PWA.
  - **Auth** para autenticación de usuarios.
  - **Firestore** como base de datos principal.
  - **Functions v2** (segunda generación de Cloud Functions) para lógica de servidor.
  - **Emulator Suite** para desarrollo y pruebas en local sin tocar producción.

> Nota: todavía no existe `package.json`, `vite.config.*`, `firebase.json` ni
> ningún código funcional. Todo lo anterior es el stack **previsto**, no el
> stack instalado.

## 3. Estructura del repositorio (prevista)

Estructura orientativa. Ninguno de estos archivos o carpetas existe todavía;
se crearán en issues posteriores al bootstrap técnico:

```text
velmeya-pwa/
├── README.md              # Este archivo (único archivo actual además de .gitignore)
├── AGENTS.md              # Pendiente de creación
├── docs/                  # Pendiente de creación
│   ├── ARCHITECTURE.md    # Pendiente de creación
│   ├── WORKFLOW.md        # Pendiente de creación
│   └── DATA_MODEL.md      # Pendiente de creación
├── src/                   # Pendiente: código React + TypeScript
├── public/                # Pendiente: manifiesto PWA, iconos, estáticos
├── functions/             # Pendiente: Cloud Functions (v2)
├── .env.example           # Pendiente: ejemplo de variables de entorno (sin secretos)
└── package.json           # Pendiente: todavía no existe
```

La estructura definitiva se documentará en `docs/ARCHITECTURE.md` cuando exista.
Si algún elemento de la lista anterior ya existe en tu copia, tiene prioridad lo
que haya en disco frente a este esquema previsto.

## 4. Documentación complementaria (pendiente)

Los siguientes documentos **aún no existen** y por eso se citan como rutas en
texto (código) y no como enlaces activos, para no dejar enlaces rotos:

- `AGENTS.md` — pendiente de creación. Definirá normas para agentes y
  automatización (convenciones, permisos, límites).
- `docs/ARCHITECTURE.md` — pendiente de creación. Decisiones de arquitectura,
  PWA/offline, módulos y despliegue lógico.
- `docs/WORKFLOW.md` — pendiente de creación. Detalle operativo del flujo de
  ramas, revisiones y CI.
- `docs/DATA_MODEL.md` — pendiente de creación. Colecciones de Firestore,
  reglas y funciones vinculadas.

Cuando se creen, este README enlazará a ellos y este aviso se retirará.
Mientras tanto, este README es la única fuente de introducción al proyecto.

## 5. Prerrequisitos

Herramientas necesarias (se indican rangos genéricos; las versiones exactas
requeridas por el proyecto quedan pendientes de fijar en `package.json` /
`engines` cuando exista):

- **Node.js** en versión LTS reciente (rango genérico; versión exacta pendiente
  de definir).
- **pnpm** instalado globalmente (versión exacta pendiente de definir; seguir
  la documentación oficial de pnpm para la instalación).
- **Firebase CLI** instalada globalmente para emuladores y gestión del proyecto
  Firebase (versión exacta pendiente de definir; requiere una cuenta con acceso
  al proyecto Firebase correspondiente).
- **Git** para control de versiones.
- Un editor con soporte TypeScript (recomendado, no obligatorio).

Verificación orientativa (los comandos dependen de que cada herramienta esté
instalada; no verifican nada del proyecto porque el proyecto aún no tiene
dependencias):

```bash
node --version
pnpm --version
firebase --version
```

## 6. Instalación inicial (prevista)

> Secuencia prevista. Hoy **no es ejecutable** porque no existe `package.json`.
> Se documenta aquí para que el primer bootstrap la siga sin improvisar.

```bash
# 1. Clonar el repositorio y situarse en la rama de trabajo
git clone <remoto-del-proyecto>
cd velmeya-pwa
git checkout main
git pull origin main

# 2. Instalar dependencias (previsto; fallará hasta que exista package.json)
pnpm install

# 3. Copiar el ejemplo de entorno y ajustarlo en local (ver sección 7)
# El archivo .env.example aún no existe; se creará con el bootstrap.
cp .env.example .env.local

# 4. Arrancar el entorno local (previsto)
pnpm dev
```

Si el paso `pnpm install` falla con un error del tipo "no se encontró
`package.json`", es el comportamiento esperado en este punto del proyecto.

## 7. Configuración local y variables de entorno

- Nunca se commitean secretos. Los archivos reales de entorno (por ejemplo
  `.env`, `.env.local`) están o estarán ignorados por `.gitignore` y solo viven
  en cada máquina.
- El repositorio expondrá un archivo de ejemplo **`.env.example`** con claves y
  valores ficticios (`placeholder`). Ese archivo **aún no existe**; el bloque
  siguiente muestra el **contenido previsto** para cuando se cree, y sirve como
  contrato de nombres. No contiene ningún secreto real.

Contenido previsto de `.env.example` (valores ficticios, solo ejemplo):

```bash
# Ejemplo previsto de .env.example — VALORES FICTICIOS, no usar en producción.
# Copiar a .env.local y rellenar con valores locales / del Emulator Suite.

# Proyecto Firebase (identificadores públicos no sensibles del proyecto)
VITE_FIREBASE_API_KEY=placeholder-api-key
VITE_FIREBASE_AUTH_DOMAIN=placeholder-auth-domain
VITE_FIREBASE_PROJECT_ID=placeholder-project-id
VITE_FIREBASE_STORAGE_BUCKET=placeholder-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=placeholder-sender-id
VITE_FIREBASE_APP_ID=placeholder-app-id

# Indica si el frontend debe apuntar a los emuladores en local
VITE_USE_FIREBASE_EMULATORS=true
```

Reglas de uso:

1. `cp .env.example .env.local` (cuando ambos existan) y edita solo `.env.local`.
2. No copies valores de producción a `.env.local` salvo indicación explícita.
3. Si una clave falta en `.env.example`, propone añadirla con valor `placeholder`
   en la misma PR que la necesite, sin incluir el valor real.

## 8. Comandos de desarrollo (previstos, no operativos)

> ⚠️ **Aviso importante:** en este momento **no existe `package.json`** en el
> repositorio, por lo que **ninguno** de los comandos siguientes es operativo.
> La tabla completa describe comandos **previstos / pendientes de
> implementación**. Los nombres de script son la convención que seguirá el
> futuro `package.json`; pueden ajustarse en el bootstrap técnico.

| Comando | Estado | Descripción prevista |
|---|---|---|
| `pnpm install` | ⏳ Previsto / pendiente | Instalar dependencias (requiere `package.json`, aún inexistente). |
| `pnpm dev` | ⏳ Previsto / pendiente | Arrancar el servidor de desarrollo de Vite en local. |
| `pnpm lint` | ⏳ Previsto / pendiente | Ejecutar el linter sobre el código. |
| `pnpm typecheck` | ⏳ Previsto / pendiente | Verificación de tipos TypeScript sin emitir archivos. |
| `pnpm test` | ⏳ Previsto / pendiente | Lanzar la suite de pruebas unitarias (modo por defecto del runner previsto). |
| `pnpm test:run` | ⏳ Previsto / pendiente | Lanzar las pruebas una sola vez (modo CI / sin watch). |
| `pnpm test:e2e` | ⏳ Previsto / pendiente | Lanzar las pruebas end-to-end (herramienta concreta pendiente de definir). |
| `pnpm build` | ⏳ Previsto / pendiente | Construir la PWA para producción. |
| `pnpm preview` | ⏳ Previsto / pendiente | Previsualizar localmente la construcción de producción. |
| `pnpm emulators` | ⏳ Previsto / pendiente | Arrancar Firebase Emulator Suite (Firestore, Auth, Functions u otros por definir). |
| `pnpm test:coverage` | ⏳ Previsto / pendiente | Ejecutar pruebas con informe de cobertura. |

Notas:

- No ejecutes estos comandos esperando un resultado útil hasta que exista
  `package.json` y la documentación del bootstrap confirme cada script.
- Si un comando de la tabla no existe tras el bootstrap, tiene prioridad el
  `package.json` real y este README deberá actualizarse.
- Los flags, puertos y opciones concretas (por ejemplo el puerto de `dev` o de
  los emuladores) quedan pendientes de definir en la configuración futura.

## 9. Flujo de desarrollo con Linear

Linear es la **fuente de verdad** para el trabajo: todo cambio empieza en una
issue y termina con su transición de estado.

1. **Partir de la issue.** Todo trabajo se asocia a una issue `GEN-XXX`
   (por ejemplo `GEN-7` para este README). La issue describe el objetivo y sus
   criterios de aceptación; la PR debe referenciarla.
2. **Mover la issue en Linear.** Transición esperada:
   `Todo` → `In Progress` (al empezar) → `In Review` (al abrir la PR) →
   `Done` (al fusionar). Mueve la issue a `In Progress` antes de programar y a
   `In Review` al solicitar revisión.
3. **Crear una rama por issue** desde `main` actualizado, con la convención:
   - `feat/GEN-XXX-descripcion-corta` para funcionalidad.
   - `fix/GEN-XXX-descripcion-corta` para correcciones.
   - `docs/GEN-XXX-descripcion-corta` para documentación (como este README).
   
   Ejemplo: `docs/GEN-7-readme-comandos-desarrollo`.
4. **Checks antes de pedir revisión** (cuando las herramientas existan; hoy son
   objetivos pendientes, no gates operativos):
   - `pnpm lint` sin errores.
   - `pnpm typecheck` sin errores.
   - `pnpm test:run` (y `pnpm test:e2e` si la issue toca flujos críticos) en verde.
   - `pnpm build` genera la PWA sin errores.
   - Sin secretos ni credenciales en el diff; `.env.local` nunca se commitea.
5. **Abrir la Pull Request** contra `main`, con título que cite la issue
   (p. ej. `docs(GEN-7): ...`) y descripción que la referencie (p. ej.
   `Closes GEN-7` o la sintaxis que use el equipo para Linear). Solicita
   revisión y mueve la issue a `In Review`.
6. **Fusión y cierre.** Tras la aprobación y los checks en verde, fusiona y la
   issue pasa a `Done`. El detalle operativo de CI y fusiones se definirá en
   `docs/WORKFLOW.md` cuando exista.

## 10. Firebase Emulator Suite (notas breves)

- La Emulator Suite permite desarrollar y probar contra emuladores locales de
  Firestore, Auth, Functions y otros servicios, **sin escribir en el proyecto
  real de Firebase**.
- El comando previsto es `pnpm emulators` (pendiente de implementación; la
  configuración concreta de puertos y servicios emulados se definirá en el
  futuro `firebase.json` y en `docs/ARCHITECTURE.md`).
- Flujo previsto: arranca los emuladores, luego `pnpm dev` con
  `VITE_USE_FIREBASE_EMULATORS=true` (ver sección 7) para que el frontend apunte
  a local. Los datos de los emuladores son volátiles salvo que se configure
  exportación/importación (pendiente de definir).
- Si algo falla al arrancar los emuladores, revisa primero que Firebase CLI esté
  instalada y que `firebase.json` exista; hoy ninguno de esos requisitos está
  cumplido porque el bootstrap aún no se ha hecho.

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
- El conmutador previsto entre ambos es `VITE_USE_FIREBASE_EMULATORS`
  (`true` en local, `false` o ausente contra el proyecto real), pendiente de
  implementación en el código.
- En caso de duda sobre a qué entorno apunta tu copia, detente y verifica la
  configuración antes de ejecutar escrituras.

## 13. Alcance: lo que este README no cubre

- Este README **no incluye instrucciones de despliegue**. Cualquier paso de
  despliegue a Hosting / Functions queda pendiente de verificar y se
  documentará cuando exista la configuración y el procedimiento probado.
- Tampoco define versiones exactas, URLs definitivas, el esquema de Firestore
  ni las reglas de seguridad: todo ello corresponde a `package.json`,
  `docs/ARCHITECTURE.md` y `docs/DATA_MODEL.md` cuando se creen.

---

*Documento creado para `GEN-7`. Actualizar cuando se complete el bootstrap
técnico (`package.json`, `firebase.json`, `.env.example`) y cuando se creen
`AGENTS.md` y `docs/`.*
