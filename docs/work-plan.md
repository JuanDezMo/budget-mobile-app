# Plan de trabajo — Fase 1 (MVP)

Cada iteración termina con algo que se puede **instalar y usar** en el teléfono. Cada tarea es un PR pequeño y se marca `[x]` cuando pasa `pnpm typecheck && pnpm lint && pnpm test`.

Avance: contar `[x]` / total de tareas por iteración.

| # | Iteración | Entrega de valor | RN |
|---|---|---|---|
| 0 | Cimientos | La app abre en Android e iOS; CI verde; las reglas de arquitectura se validan solas | — |
| 1 | Núcleo, base de datos y configuración | Cambiar idioma y tema, y que se recuerde al reabrir | RN-32, RN-37 |
| 1B | Registro y PIN | Registrarme (nombre, correo, país), crear mi PIN y que la app se bloquee | RN-42–47 |
| 2 | Categorías | Ver categorías del sistema, crear y archivar las propias | RN-34–36, RN-40 |
| 3 | Presupuestos | Crear, editar, borrar y ver presupuestos con su estado | RN-01–11, RN-38 |
| 4 | Movimientos | Registrar gastos/reembolsos/ingresos con líneas y ver a qué presupuesto cuentan | RN-12–21, RN-39–41 |
| 5 | Uso del presupuesto | Ver gastado, disponible, %, ahorrado y excedido | RN-22, RN-23, RN-33 |
| 6 | Umbrales y notificaciones | Recibir alertas al cruzar umbrales | RN-24–31 |
| 7 | Pruebas en dispositivos *(opcional)* | Versión candidata probada en gama baja | — |
| 8 | Respaldo *(opcional)* | Exportar e importar datos | — |

Las iteraciones 0–6 (incluida la 1B) son obligatorias y forman el MVP funcional. Las 7 y 8 son opcionales.

---

## Iteración 0 — Cimientos

- [x] T0.1 Crear proyecto Expo + TypeScript + Expo Router con pnpm (`nodeLinker: hoisted` en `pnpm-workspace.yaml`, `packageManager` fijado)
- [x] T0.2 `tsconfig` estricto (`strict`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`) y alias `@/` → `src/`
- [x] T0.3 ESLint con typed linting y las reglas de CLAUDE.md en `error` (incluye `i18next/no-literal-string`)
- [x] T0.4 Reglas de arquitectura con `eslint-plugin-boundaries` + `no-restricted-imports` (ver matriz al final)
- [x] T0.5 Prettier + Husky + lint-staged
- [x] T0.6 Jest (`jest-expo`) + React Native Testing Library con una prueba de humo
- [x] T0.7 Scripts `typecheck`, `lint`, `test` en `package.json`
- [x] T0.8 GitHub Actions: los tres scripts en cada PR
- [x] T0.9 Estructura de carpetas vacía (`src/app`, `src/core/*`, `src/features/*`)

**Hecho cuando:** la app abre en un Android físico y en Expo Go (iOS), y un import prohibido a propósito hace fallar `pnpm lint`.

## Iteración 1 — Núcleo, base de datos y configuración

Núcleo compartido
- [x] T1.1 `Result<T, E>` con `ok` / `err` + pruebas
- [x] T1.2 `Money`, `CurrencyCode`, `add`/`subtract` (error si las monedas son distintas) + pruebas
- [x] T1.3 Conversión texto ↔ unidad menor según decimales, máx. 12 dígitos enteros (RN-20, RN-32) + pruebas
- [x] T1.4 Utilidades de fechas: `occurred_at` con desfase, `local_date`, comparación de `YYYY-MM-DD` + pruebas
- [x] T1.5 i18n: i18next + `expo-localization`, `locales/es.json` y `en.json`, formateo de montos y fechas
- [x] T1.6 Tema: tokens claro/oscuro, proveedor con `LIGHT | DARK | SYSTEM`

Base de datos
- [x] T1.7 Conexión Kysely + `expo-sqlite` y tipos `Database` de las 9 tablas
- [x] T1.8 Migración inicial (incluye `user_profile`): tablas, CHECKs, índices y únicos
- [x] T1.9 Triggers `BUDGET_OVERLAP` de INSERT y UPDATE (el de UPDATE excluye `NEW.id`)
- [x] T1.10 Seeds: monedas (RN-32) y categorías del sistema (RN-34) como migración; la fila de `settings` se crea al arrancar con el idioma del dispositivo (T1.13)
- [x] T1.11 Decidir e instalar driver SQLite para pruebas en Node; probar migraciones y triggers
- [x] T1.12 Contexto de React que entrega repositorios (con implementación en memoria para pruebas)

Configuración (feature `settings`)
- [x] T1.13 Tipos, schema Zod y repositorio de `settings`
- [x] T1.14 `useSettings` (ViewModel) + pantalla de idioma y tema (RN-37)
- [x] T1.15 Navegación base (pestañas o stack) con pantallas vacías traducidas

**Hecho cuando:** cambio idioma y tema, cierro la app, la abro y se mantienen.

## Iteración 1B — Registro y PIN

Feature `profile`. Depende de T1.7–T1.15. Detalle: RN-42 a RN-47. La app queda tras una puerta: sin perfil → registro; con perfil → bloqueo por PIN.

- [x] T1B.1 Verificar en la documentación del SDK 58 `expo-secure-store`, rutas protegidas y vista previa del selector de apps (hallazgos abajo); falta solo instalar con `npx expo install expo-secure-store expo-screen-capture` al empezar T1B.5
- [x] T1B.2 `profile.types.ts` + `profile.schemas.ts` (nombre, correo, país ISO 3166-1 alfa-2, PIN 4–6 dígitos) + pruebas
- [x] T1B.3 `profile.rules.ts`: registro obligatorio (RN-42), formato del PIN (RN-43), espera por intentos fallidos (RN-45) + pruebas RN
- [x] T1B.4 `profile.repository.ts` (`user_profile`) + mapper + pruebas contra SQLite; implementación en memoria
- [x] T1B.5 Servicio de PIN en `core/security`: hash con sal (sal aleatoria con `expo-crypto`), guardado con `setItemAsync` y `keychainAccessible: WHEN_UNLOCKED_THIS_DEVICE_ONLY`, verificación; descartar hash huérfano al registrarse; nunca en SQLite (RN-43) + pruebas con almacenamiento falso
- [x] T1B.6 `useRegistration` + pantalla de registro (nombre, correo, país, PIN y confirmación) con aviso de que el PIN no se recupera (RN-42, RN-46)
- [x] T1B.7 Puerta con `Stack.Protected` y `useAppLock`: pantalla de PIN al abrir y al volver de segundo plano tras 30 s; ocultar vista previa con `expo-screen-capture` (RN-44)
- [x] T1B.8 Intentos fallidos con espera creciente y opción "Olvidé mi PIN" que borra todos los datos con confirmación (RN-45, RN-46)
- [x] T1B.9 Editar perfil y cambiar PIN desde Ajustes, pidiendo el PIN actual (RN-47)
- [x] T1B.10 Textos es/en (incluye nombres de país con `Intl.DisplayNames`) y modo oscuro

Hallazgos de T1B.1 (documentación del SDK 58, 2026-11-07):
- `expo-secure-store` (~58.0.2): `getItemAsync`, `setItemAsync`, `deleteItemAsync`; usar las asíncronas, las síncronas bloquean el hilo de JS. Claves solo con letras, números, `.`, `-` y `_`. Funciona en Expo Go.
- Android guarda en SharedPreferences cifradas con Keystore y se borra al desinstalar; el plugin excluye el dato del Auto Backup por defecto. iOS usa Keychain y **puede sobrevivir a una reinstalación**: por eso el hash huérfano se descarta al registrarse.
- No usar `requireAuthentication` (es para biometría y no entra en esta fase).
- Rutas protegidas: `<Stack.Protected guard={...}>` en el layout raíz de Expo Router (reemplaza las redirecciones antiguas). Hay que esperar a leer el estado (perfil y PIN) antes de renderizar, manteniendo el splash con `SplashScreen.preventAutoHideAsync()` y `hide()`.
- Vista previa del selector de apps: en iOS, `enableAppSwitcherProtectionAsync()` (desenfoque); en Android no hay equivalente, `preventScreenCaptureAsync()` / `usePreventScreenCapture()` usa FLAG_SECURE, que además bloquea capturas de pantalla.

**Hecho cuando:** instalo la app limpia, me registro con PIN, la cierro, la abro y me pide el PIN; con PIN erróneo no entro; con "Olvidé mi PIN" se borran los datos y vuelve el registro.

## Iteración 2 — Categorías

- [x] T2.1 `category.types.ts` + `category.schemas.ts`
- [x] T2.2 `category.rules.ts`: nombre único sin mayúsculas (RN-35), sistema no editable (RN-34), archivar vs. borrar según historial (RN-36), SIN_CLASIFICAR sin presupuesto (RN-40) + pruebas RN
- [x] T2.3 `category.repository.ts` + mapper + pruebas contra SQLite
- [x] T2.4 `useCategories` (listar, crear, archivar)
- [x] T2.5 Pantalla de lista (sistema traducidas por `code`, personalizadas, archivadas aparte)
- [x] T2.6 Formulario de creación con ícono y color

**Hecho cuando:** creo "Mascotas" con ícono y color, no puedo crear "mascotas" otra vez y no puedo renombrar "Transporte".

## Iteración 3 — Presupuestos

- [ ] T3.1 `budget.types.ts` + `budget.schemas.ts`
- [ ] T3.2 Reglas: datos obligatorios (RN-01), moneda fija (RN-02), solapamiento (RN-03) + pruebas
- [ ] T3.3 Reglas: estado activo / en gracia / cerrado con 5 días (RN-05, RN-38) + pruebas de bordes de fecha
- [ ] T3.4 Reglas: editar monto y fechas solo activo, aviso si monto < gastado (RN-06, RN-07, RN-08) + pruebas
- [ ] T3.5 Repositorio: crear, editar, borrado lógico (RN-10), listar con filtros + pruebas (incluye trigger)
- [ ] T3.6 Cierre perezoso al abrir la app: pasa a `CLOSED` y congela `spent_final_minor` (RN-05)
- [ ] T3.7 `useBudgets` + lista agrupada por estado
- [ ] T3.8 Formulario crear/editar (categoría, moneda, monto, fechas) con errores traducidos
- [ ] T3.9 Detalle de presupuesto con acción de borrar

**Hecho cuando:** creo "Entretenimiento USD 55, 1–15 nov", un segundo presupuesto cruzado se rechaza con mensaje claro, y uno vencido hace más de 5 días aparece cerrado.

## Iteración 4 — Movimientos

- [ ] T4.1 `movement.types.ts` + schemas (cabecera + líneas)
- [ ] T4.2 Reglas de cabecera y líneas: tipo único, ≥1 línea, suma = total, medio de pago, sin fechas futuras, montos válidos (RN-12–16, RN-19, RN-20) + pruebas
- [ ] T4.3 Regla de asignación de presupuesto por línea (RN-17, RN-18, RN-41) + pruebas
- [ ] T4.4 Repositorio: guardar cabecera + líneas en una transacción, borrado lógico (RN-21) + pruebas
- [ ] T4.5 Reasignación RN-39 al editar movimiento y al crear / editar fechas / borrar presupuesto (en la misma transacción) + pruebas
- [ ] T4.6 Bloqueo de edición y borrado si afecta un presupuesto cerrado (RN-08, RN-18)
- [ ] T4.7 `useMovementForm` con React Hook Form: líneas dinámicas, total restante, "Cuenta para: …"
- [ ] T4.8 Pantalla de formulario de movimiento + prueba de componente
- [ ] T4.9 Historial de movimientos con FlashList, filtros básicos y totales por moneda (RN-33)
- [ ] T4.10 Editar y borrar movimiento desde el historial

**Hecho cuando:** registro un mercado USD 100 repartido en 3 categorías, cada línea muestra a qué presupuesto cuenta, y al crear después un presupuesto que lo cubre la línea se asigna sola.

## Iteración 5 — Uso del presupuesto

- [ ] T5.1 Regla de cálculo: gastado (mín. 0), disponible, %, sobrante (RN-22, RN-23) + prueba del ejemplo USD 55 → 42,9 %
- [ ] T5.2 Consulta agregada en el repositorio por `budget_id` + pruebas
- [ ] T5.3 Barra de progreso en lista y detalle; estados "ahorrado" (RN-09) y "excedido" (RN-29)
- [ ] T5.4 Detalle de presupuesto con sus líneas
- [ ] T5.5 Resumen general agrupado por moneda, nunca sumado entre monedas (RN-33)

**Hecho cuando:** el detalle muestra el mismo gastado y % que se calcula a mano.

## Iteración 6 — Umbrales y notificaciones

- [ ] T6.1 Reglas de umbrales: 0–3, enteros 1–100, sin repetir; umbral automático 100 % (RN-24, RN-25) + pruebas
- [ ] T6.2 Repositorio de `budget_threshold` y `alert_sent` + pruebas
- [ ] T6.3 Evaluador: cruces, un aviso por umbral, borrar registro si baja, notificar solo el más alto, nada sobre 100 %, solo activos/en gracia (RN-27–30) + pruebas con la tabla de ejemplo
- [ ] T6.4 Llamar al evaluador en todos los puntos de RN-26 y RN-39
- [ ] T6.5 Envoltorio de `expo-notifications` en `core/notifications` con textos traducidos
- [ ] T6.6 Permiso de notificaciones y banner en la app si se niega (RN-31)
- [ ] T6.7 Umbrales en el formulario de presupuesto

**Hecho cuando:** con umbrales 50 % y 90 % llegan las alertas de la tabla de ejemplo de `business-rules.md`, sin repetirse.

## Iteración 7 — Pruebas en dispositivos (opcional)

- [ ] T7.1 Configurar EAS Build (perfil `preview` → APK interno)
- [ ] T7.2 Probar en Android de gama baja (2–3 GB RAM) en release: arranque, historial con 1 000+ movimientos
- [ ] T7.3 Probar en iOS (Expo Go o development build)
- [ ] T7.4 Revisar textos sin traducir y modo oscuro en todas las pantallas
- [ ] T7.5 Corregir hallazgos (una tarea por hallazgo)

**Hecho cuando:** no hay errores bloqueantes y el historial se desplaza fluido en gama baja.

## Iteración 8 — Respaldo (opcional)

- [ ] T8.1 Definir formato de respaldo (JSON versionado) y validarlo con Zod
- [ ] T8.2 Exportar a archivo y compartir
- [ ] T8.3 Importar con validación y transacción (todo o nada)
- [ ] T8.4 Pruebas de ida y vuelta (exportar → importar → mismos datos)
- [ ] T8.5 Configurar EAS Update

**Hecho cuando:** exporto en un teléfono, importo en otro y veo los mismos presupuestos y movimientos.

---

## Reglas de arquitectura (T0.4)

| Capa (desde) | Puede importar | No puede importar |
|---|---|---|
| `app/`, `components/` | ViewModel, types, `core/` (excepto `db`) | repository, `kysely`, `expo-sqlite` |
| `use*.ts` (ViewModel) | rules, repository (interfaz vía contexto), types, schemas, `core/` | `kysely`, `expo-sqlite` |
| `*.rules.ts` | types, `core/shared` | repository, `react`, `kysely`, `core/db` |
| `*.repository.ts` | types, `core/db`, `core/shared` | rules, ViewModel, `react` |
| `*.types.ts` | `core/shared` (tipos) | `react`, `kysely`, cualquier otra capa |
| `*.schemas.ts` | types, `zod` | lógica de otras capas |

**Entre features (decidido 2026-11-07):** una feature solo puede importar `*.types.ts` y `*.rules.ts` de otra feature; nunca su repositorio, ViewModel ni componentes.

## Decisiones tomadas en la implementación

- Kysely 0.29 exporta `Migrator` desde `kysely/migration`, que incluye un `import()` dinámico que Hermes no compila. `metro.config.js` apunta ese import al archivo `migrator.js` en el dispositivo (2026-11-07). Revisar al actualizar Kysely.
- Las migraciones usan SQL crudo con `STRICT` explícito para que el esquema sea idéntico en el teléfono y en las pruebas.
- `src/composition/AppProviders.tsx` es la raíz de composición: abre la base, carga ajustes e inyecta repositorios; es el único lugar que conoce la base y las features.
- Repositorios por contexto: `createRepositoryContext` en `core/shared`, un contexto por repositorio.
- Perfil y PIN (1B): el hash del PIN es un SHA-256 con sal (expo-crypto no ofrece PBKDF2); la defensa real es el almacenamiento seguro y la espera por intentos (RN-45). Un perfil sin PIN guardado (p. ej. Keystore limpiado) queda bloqueado y solo se sale con "Olvidé mi PIN".
- La puerta de acceso usa `Stack.Protected` en `src/app/_layout.tsx` y el formulario de registro vive en `useRegistration` (las capas no dejan que un componente importe un schema).
- Categorías (it. 2): los íconos se guardan como clave (`paw`, `bus`…) y se dibujan como emoji (sin fuente de íconos, más liviano); el color es uno de 12 fijos. Quitar una personalizada la archiva si tiene presupuestos o líneas y la elimina si no (RN-36). Renombrar existe en reglas, repositorio y ViewModel (RN-34/RN-35) pero aún no tiene pantalla. El nombre de una personalizada no se compara con los nombres traducidos de las del sistema.
- Los ids los genera `newId` (expo-crypto) desde la raíz de composición; en Jest `randomUUID` devuelve `undefined`, por eso los repositorios reciben el generador.
- Estado de ajustes en un store Zustand (`useSettingsStore`) para que la raíz y la pantalla compartan idioma y tema.

## Decisiones pendientes

- Cifrado de la base de datos con SQLCipher: no entra en Fase 1; el PIN solo bloquea la pantalla (ver riesgo en RN-43).
- Verificación del correo y recuperación del PIN: requieren backend (proyecto separado).
- Respaldo (T8.1): decidir si incluye `user_profile`; nunca incluye el PIN.
- ~~Driver SQLite para pruebas en Node (T1.11)~~: decidido `better-sqlite3` + `SqliteDialect` de Kysely (2026-11-07). `kysely-expo` 56 declara `expo-sqlite ^56` pero solo usa APIs públicas que existen en el 58; las pruebas lo confirman a nivel SQL, falta verificarlo en un dispositivo (T7).
- Diseño de pantallas y navegación: no hay maquetas; se definirán al llegar a cada pantalla.
- Formato del respaldo (T8.1).
