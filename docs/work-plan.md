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

- [x] T3.1 `budget.types.ts` + `budget.schemas.ts`
- [x] T3.2 Reglas: datos obligatorios (RN-01), moneda fija (RN-02), solapamiento (RN-03) + pruebas
- [x] T3.3 Reglas: estado activo / en gracia / cerrado con 5 días (RN-05, RN-38) + pruebas de bordes de fecha
- [x] T3.4 Reglas: editar monto y fechas solo activo, aviso si monto < gastado (RN-06, RN-07, RN-08) + pruebas
- [x] T3.5 Repositorio: crear, editar, borrado lógico (RN-10), listar con filtros + pruebas (incluye trigger)
- [x] T3.6 Cierre perezoso al abrir la app: pasa a `CLOSED` y congela `spent_final_minor` (RN-05)
- [x] T3.7 `useBudgets` + lista agrupada por estado
- [x] T3.8 Formulario crear/editar (categoría, moneda, monto, fechas) con errores traducidos
- [x] T3.9 Detalle de presupuesto con acción de borrar

**Hecho cuando:** creo "Entretenimiento USD 55, 1–15 nov", un segundo presupuesto cruzado se rechaza con mensaje claro, y uno vencido hace más de 5 días aparece cerrado.

## Iteración 4 — Movimientos

- [x] T4.1 `movement.types.ts` + schemas (cabecera + líneas)
- [x] T4.2 Reglas de cabecera y líneas: tipo único, ≥1 línea, suma = total, medio de pago, sin fechas futuras, montos válidos (RN-12–16, RN-19, RN-20) + pruebas
- [x] T4.3 Regla de asignación de presupuesto por línea (RN-17, RN-18, RN-41) + pruebas
- [x] T4.4 Repositorio: guardar cabecera + líneas en una transacción, borrado lógico (RN-21) + pruebas
- [x] T4.5 Reasignación RN-39 al editar movimiento y al crear / editar fechas / borrar presupuesto (en la misma transacción) + pruebas
- [x] T4.6 Bloqueo de edición y borrado si afecta un presupuesto cerrado (RN-08, RN-18)
- [x] T4.7 `useMovementForm` con React Hook Form: líneas dinámicas, total restante, "Cuenta para: …"
- [x] T4.8 Pantalla de formulario de movimiento + prueba de componente
- [x] T4.9 Historial de movimientos con FlashList, filtros básicos y totales por moneda (RN-33)
- [x] T4.10 Editar y borrar movimiento desde el historial

**Hecho cuando:** registro un mercado USD 100 repartido en 3 categorías, cada línea muestra a qué presupuesto cuenta, y al crear después un presupuesto que lo cubre la línea se asigna sola.

## Iteración 5 — Uso del presupuesto

- [x] T5.1 Regla de cálculo: gastado (mín. 0), disponible, %, sobrante (RN-22, RN-23) + prueba del ejemplo USD 55 → 42,9 %
- [x] T5.2 Consulta agregada en el repositorio por `budget_id` + pruebas
- [x] T5.3 Barra de progreso en lista y detalle; estados "ahorrado" (RN-09) y "excedido" (RN-29)
- [x] T5.4 Detalle de presupuesto con sus líneas
- [x] T5.5 Resumen general agrupado por moneda, nunca sumado entre monedas (RN-33)

**Hecho cuando:** el detalle muestra el mismo gastado y % que se calcula a mano.

## Iteración 6 — Umbrales y notificaciones

- [x] T6.1 Reglas de umbrales: 0–3, enteros 1–100, sin repetir; umbral automático 100 % (RN-24, RN-25) + pruebas
- [x] T6.2 Repositorio de `budget_threshold` y `alert_sent` + pruebas
- [x] T6.3 Evaluador: cruces, un aviso por umbral, borrar registro si baja, notificar solo el más alto, nada sobre 100 %, solo activos/en gracia (RN-27–30) + pruebas con la tabla de ejemplo
- [x] T6.4 Llamar al evaluador en todos los puntos de RN-26 y RN-39
- [x] T6.5 Envoltorio de `expo-notifications` en `core/notifications` con textos traducidos
- [x] T6.6 Permiso de notificaciones y banner en la app si se niega (RN-31)
- [x] T6.7 Umbrales en el formulario de presupuesto

**Hecho cuando:** con umbrales 50 % y 90 % llegan las alertas de la tabla de ejemplo de `business-rules.md`, sin repetirse.

## Mejora de UI — "Sobres de la quincena" (entre las iteraciones 6 y 7)

Se aplicó la dirección visual de `.impeccable/surfaces/src-app.md` y los bocetos de `.impeccable/mocks/sobres-pantallas.html`. Cada punto se verificó en el emulador (capturas en `validation-screenshots/`, ignoradas por git).

- [x] U1 Tipografía Archivo (+ Archivo Narrow para montos grandes), cifras tabulares, carga de fuentes al arrancar
- [x] U2 Sobres: marco con solapa, relleno = lo que queda, liga del color de la categoría; rejilla de 2 columnas en Inicio y Presupuestos
- [x] U3 Inicio: encabezado con fecha, frase "Quedan …" por moneda, botón "＋ Anotar gasto" abajo a la derecha
- [x] U4 Detalle del sobre: sobre grande con ligas de umbrales (cruzada = sólida), tres datos, movimientos con chip "1 de N", "Editar" en el encabezado
- [x] U5 Barra de pestañas con íconos (activo relleno, inactivo contorno)
- [x] U6 Formulario de movimiento según bocetos 3 y 4: control Gasto/Reembolso/Ingreso, fecha y hora en la esquina, monto grande con moneda, chips de pago, líneas con liga de color y "Cuenta para…", "Por repartir ✓", nota punteada, botón "Guardar gasto/reembolso/ingreso"; ingreso con "¿Es para un sobre?" y nota del cupo nuevo (RN-23, RN-41)
- [x] U7 Modo oscuro de los sobres (relleno translúcido con borde manila) y barra de estado que sigue el tema de la app
- [ ] U8 Pantallas sin boceto (historial de Movimientos, formulario de presupuesto, Categorías, Ajustes, Perfil, Registro, Bloqueo): hoy solo usan tipografía y colores nuevos; decidir si se alinean con el lenguaje de sobres
  - [x] U8.1 Historial de Movimientos: agrupado por día (Hoy / Ayer / fecha), un bloque continuo por día, fila igual a la del detalle del sobre con liga de color partida según lo que se llevó cada categoría y chip "N partes"; totales por moneda en una línea (RN-33)
  - [x] U8.2 Formulario de presupuesto: sobre en vivo arriba (liga de la categoría, periodo, cupo y alertas como ligas punteadas), categorías en chips horizontales, monto grande con chip de moneda (bloqueado al editar, RN-02), fechas lado a lado, alertas como chips (RN-24/RN-25) y botón oscuro fijo abajo
  - [x] U8.3 Categorías: secciones en mayúsculas con un bloque continuo cada una y la liga del color en cada fila (archivadas atenuadas, RN-36; "Quitar" solo en las tuyas, RN-34); formulario con sobre pequeño en vivo, colores en círculos y botón oscuro fijo; el amarillo `#E3A21A` (igual al manila) se cambió por índigo `#283593` en la paleta (RN-35)
  - [x] U8.4 Ajustes: secciones PREFERENCIAS y TU CUENTA como bloques; idioma y tema con control segmentado (RN-37); Categorías y Perfil como filas con descripción y "›"; encabezado de sección compartido (`SectionHeading`) también en historial y Categorías
  - [ ] U8.5 Registro, Bloqueo y Perfil
- [x] U9 Montos con separador de miles mientras se escriben

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
- Presupuestos (it. 3): fechas con `@react-native-community/datetimepicker` (incluido en Expo Go; diálogo en Android, selector compacto en iOS), guardadas como `YYYY-MM-DD`. Solo se edita monto y fechas; categoría y moneda quedan fijas al editar. El borrado (RN-10) solo marca `deleted_at`: la reasignación de las líneas a "sin presupuesto" llega con T4.5. El gastado ya se calcula en el repositorio (`getSpentMinor`, gastos − reembolsos, mín. 0) porque lo necesitan el cierre y el aviso de RN-06; el uso completo (disponible, %, sobrante) es la Iteración 5. El cierre perezoso corre al abrir la app (arranque), no al volver de segundo plano.
- Los componentes y pantallas de una feature no pueden usar los de otra: `OptionGroup`, `CategoryAvatar` y los emojis de íconos se movieron a `core/theme`. Las pantallas combinan ViewModels de varias features (p. ej. presupuestos + categorías) y pasan los datos por props.
- Movimientos (it. 4): la asignación RN-17 y la reasignación RN-39 usan funciones puras de `movement.rules.ts` que la raíz de composición inyecta a los repositorios (`BudgetAssignmentRules`), porque un repositorio no puede importar reglas. `createBudgetRepository` recibe un `LineReassigner` y lo ejecuta dentro de la misma transacción que crear / editar fechas / borrar el presupuesto. El reasignador deja intactas las líneas de presupuestos cerrados (RN-08) y devuelve los ids de presupuestos afectados para la Iteración 6.
- Un presupuesto solo recibe líneas mientras está activo o en gracia **hoy** (RN-17): un movimiento con fecha vieja dentro de un presupuesto ya cerrado queda sin presupuesto (RN-18).
- Las listas se recargan al volver a la pantalla (`useRefreshOnFocus` + `refreshKey`); sin eso mostraban datos viejos tras cerrar un formulario.
- El historial usa FlashList 2 (`@shopify/flash-list`, incluido en Expo Go); Jest necesita `setupFiles` y transformar el paquete. Paginado de 20 en 20 (`MOVEMENT_PAGE_SIZE`): el repositorio elige primero los movimientos de la página y luego sus líneas, para no partir un movimiento; los totales por moneda (RN-33) salen de una consulta aparte sobre todo el historial filtrado, no de la página cargada. Medir igual con 1 000+ en T7.2.
- Punto de control en emulador (Android 14, Expo Go, 2026-11-07): registro, PIN, bloqueo, presupuesto con selector de fecha nativo y movimiento USD 100 en 3 líneas funcionan con `expo-sqlite` real y los datos sobreviven al reinicio. Hallazgos corregidos: `enableAppSwitcherProtectionAsync` solo existe en iOS (ahora `useScreenPrivacy`, solo en builds de release, ignora fallos); `Intl.DisplayNames` no trae nombres de país en Hermes (tabla propia `country-names.json`, generada con `scripts/generate-country-names.mjs`); botón principal de las listas fijo abajo (`FloatingAction`).
- Filtros del historial compactos (`OptionGroup compact`: una fila de chips con desplazamiento lateral, etiqueta solo para lectores de pantalla) y totales en una sola tarjeta por moneda; verificado en el emulador. Pendiente de pulir: los formularios largos dejan un espacio grande bajo el título.
- Uso del presupuesto (it. 5): `calculateUsage` (`budget-usage.rules.ts`) saca gastado, disponible, % y sobrante de las sumas por tipo que entrega el repositorio (`listUsageTotals`, una consulta para toda la lista; `listLines`, paginado de 20 en 20). Un presupuesto cerrado muestra el gastado congelado (`spent_final_minor`, RN-05). "Excedido" (RN-29) = restante negativo; "Ahorrado" (RN-09) = cerrado con restante positivo. La barra se llena hasta 100 % y el excedido se marca con borde y texto de color de alerta, sin relleno rojo (dirección visual). El resumen del inicio suma solo presupuestos abiertos (activos y en gracia) y por moneda (RN-33). Verificado en el emulador: USD 20 de 55 = 36,4 %, queda 35.
- UI (mejora "Sobres"): las pruebas pasaban mientras el emulador mostraba defectos reales; por eso cada pantalla se mira en el emulador antes de darla por buena. Hallazgos corregidos así: arranque roto por el canal de notificaciones en Expo Go (ahora no es fatal y el error se registra), `Intl.DisplayNames` sin países en Hermes, categoría por defecto vacía al abrir el formulario, monto de la línea en 0 en el aviso del ingreso, monto grande pisado por la etiqueta de una liga, texto claro ilegible sobre el relleno en modo oscuro y barra de estado oscura sobre fondo oscuro.
- Notificaciones: en Expo Go de Android no se puede conceder el permiso (el canal falla con un error nativo), así que allí las alertas salen como aviso dentro de la app (RN-31). Probar notificaciones del sistema requiere un build de desarrollo (EAS).
- Un ingreso "general" (sueldo) se guarda como una línea en SIN_CLASIFICAR (RN-41); "para un sobre" abre las líneas y se asigna por categoría, moneda y fecha como cualquier otra (RN-17, RN-23).
- Estado de ajustes en un store Zustand (`useSettingsStore`) para que la raíz y la pantalla compartan idioma y tema.

## Decisiones pendientes

- Cifrado de la base de datos con SQLCipher: no entra en Fase 1; el PIN solo bloquea la pantalla (ver riesgo en RN-43).
- Verificación del correo y recuperación del PIN: requieren backend (proyecto separado).
- Respaldo (T8.1): decidir si incluye `user_profile`; nunca incluye el PIN.
- ~~Driver SQLite para pruebas en Node (T1.11)~~: decidido `better-sqlite3` + `SqliteDialect` de Kysely (2026-11-07). `kysely-expo` 56 declara `expo-sqlite ^56` pero solo usa APIs públicas que existen en el 58; las pruebas lo confirman a nivel SQL, falta verificarlo en un dispositivo (T7).
- Diseño de pantallas y navegación: no hay maquetas; se definirán al llegar a cada pantalla.
- Formato del respaldo (T8.1).
