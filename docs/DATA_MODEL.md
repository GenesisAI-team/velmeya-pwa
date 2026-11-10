# Modelo de datos inicial — Firestore (Velmeya PWA)

Descripción del modelo previsto para el dominio de reservas en el bootstrap
(`GEN-35`). Las colecciones no se crean todavía en producción; el único
entorno es el emulador con el proyecto `demo-velmeya-local`.

---

## 1. Convenciones generales

- Identificadores: `id` generado por Firestore para `classes` y
  `reservations`; para `users` se usa el `uid` de Auth como id de documento.
- Fechas: **ISO 8601 instantáneo con offset** (`2026-12-01T10:00:00Z`). El
  dominio valida el formato (`esFechaISO` en `src/domain/fechas.ts`). El
  almacenamiento como `Timestamp` de Firestore es compatible; convertir
  únicamente en la capa de infraestructura, nunca en el dominio.
- Errores: códigos estables en mayúsculas (`CLASE_COMPLETA`,
  `YA_RESERVADA`, ...). Fuente canónica: exclusivamente los tests en
  `src/domain/*.test.ts`; cualquier cambio exige actualizar los tests.

- Espejo de tipos: `src/domain/tipos.ts` es la verdad de los contratos;
  el modelo Firestore replica sus campos (mismos nombres y tipos).

## 2. Colecciones

### `users/{uid}` — usuario (espejo de `Usuario`)

| Campo    | Tipo   | Reglas del dominio                                   |
| -------- | ------ | ---------------------------------------------------- |
| `id`     | string | obligatorio (`ID_REQUERIDO`)                           |
| `nombre` | string | no vacío tras trim (`NOMBRE_REQUERIDO`)                |
| `email`  | string | formato `x@y.z`, trim + lowercase (`EMAIL_INVALIDO`)   |
| `rol`    | string | `alumno` \| `profesor` \| `admin` (`ROL_INVALIDO`)     |

Notas: los roles definen permisos futuros (reservar = alumno+, administrar
clases = profesor/admin). Un usuario `alumno` no ve datos de terceros.

### `classes/{id}` — clase de yoga (espejo de `Clase`)

| Campo             | Tipo    | Reglas del dominio                                        |
| ----------------- | ------- | --------------------------------------------------------- |
| `id`              | string  | obligatorio (`ID_REQUERIDO`)                              |
| `titulo`          | string  | no vacío (`TITULO_REQUERIDO`)                             |
| `fechaInicio`     | string  | ISO 8601 (`FECHA_INVALIDA`)                               |
| `duracionMinutos` | number  | entero 1..480 (`DURACION_INVALIDA`)                       |
| `capacidadPlazas` | number  | entero 1..200 (`CAPACIDAD_INVALIDA`)                      |
| `profesorId`      | string? | opcional; si existe no vacío (`PROFESOR_INVALIDO`)        |

### `reservations/{id}` — reserva (espejo de `Reserva`)

| Campo        | Tipo   | Reglas del dominio                                     |
| ------------ | ------ | ------------------------------------------------------ |
| `id`         | string | obligatorio (`ID_REQUERIDO`)                           |
| `claseId`    | string | referencia a `classes/{id}` (`CLASE_REQUERIDO`)        |
| `usuarioId`  | string | referencia a `users/{uid}` (`USUARIO_REQUERIDO`)       |
| `estado`     | string | `confirmada` \| `cancelada` (lo fija el dominio)       |
| `creadaEn`   | string | ISO 8601 (`FECHA_INVALIDA`)                            |
| `canceladaEn`| string?| obligatoria si `estado = cancelada` (`CANCELADA_SIN_FECHA`) |

## 3. Reglas de negocio del dominio (funciones puras)

Localizadas en `src/domain/reserva.ts` (reglas en el momento de reservar o
cancelar; equivalentes a las comprobaciones que harán Functions v2 como
intérprete autorizado):

- **Reservar**: la clase no puede haber empezado (`CLASE_INICIADA`),
  deben quedar plazas (`CLASE_COMPLETA`) y el usuario no puede tener esa
  clase activa (`YA_RESERVADA`). Las reservas `cancelada` liberan plaza y
  permiten volver a reservar. Errores acumulables (se listan todos).
- **Conteo**: `plazasDisponibles` cuenta solo `confirmada` de esa clase y
  trata una sobreasignación como 0 plazas (defensa ante datos corruptos).
- **Cancelar**: idempotencia protegida (`YA_CANCELADA`), clase iniciada
  bloqueada (`CLASE_INICIADA`); la cancelación actualiza `canceladaEn`.

Las escrituras a Firestore de las funciones `reservar` / `cancelar` llegarán
con las issues de funcionalidad completa (transacción de capacidad en
Functions v2); este bootstrap solo define y valida los contratos.

## 4. Índices previstos (fase de implementación)

- `reservations`: compuesto por `claseId` + `estado` (recuento de plazas)
  y por `usuarioId` + `creadaEn` (reservas de un alumno).
- `classes`: `fechaInicio` ascendente para el horario semanal.

## 5. Reglas de seguridad (implementadas en GEN-46)

`firestore.rules` mantiene la **denegación por defecto** y abre solo los
caminos probados por la suite de reglas (`src/test/emuladores/reglas-firestore.test.ts`):

- **`classes`**: lectura pública (el horario se pinta sin sesión); ninguna
  escritura desde el cliente (`create`, `update`, `delete` denegados). La
  siembra de datos usa el acceso de propietario del emulador, equivalente al
  intérprete autorizado que serán las Functions.
- **`users/{uid}`**: lectura y escritura solo para el propio uid
  (`request.auth.uid == uid`); el documento de otro usuario es inaccesible.
- **`reservations`**: lectura solo si `request.auth.uid ==
  resource.data.usuarioId` (puntual y por consulta); escrituras de cliente
  denegadas porque la transacción de capacidad se ejecutará vía Functions v2
  en la fase de reservas.
- **Cualquier otra ruta**: denegada por el `match /{document=**}` final.

Cualquier relajación adicional exige issue propia con sus tests de reglas.

## 6. Migración / evolución

- Cambios de esquema que impliquen colecciones nuevas, campos que rompan
  validaciones o reglas nuevas requieren issue separada (ver `AGENTS.md`).
- Mantener el tipo del dominio y el doc de Firestore en sincronía es
  requisito de revisión; no se acepta duplicar la verdad: los tests de
  `src/domain` preceden a cambios de `docs/DATA_MODEL.md`.
