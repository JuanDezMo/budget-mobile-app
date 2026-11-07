# App de presupuestos — Fase 1 (MVP)

Contexto para Claude Code. Resume las decisiones tomadas en la sesión de planeación del 2026-11-06.
Documentos completos:
- `docs/business-rules.md` — Reglas de negocio MVP (RN-01 a RN-47)
- `docs/data-model.md` — Modelo entidad-relación MVP
- `docs/architecture.md` — Arquitectura MVP

## Cómo trabajar en este repo
- Conversa conmigo en español. **Todo el código va en inglés**: variables, funciones, tipos, tablas, columnas, archivos, commits y comentarios.
- Ningún texto visible al usuario se escribe en el código: todo sale de `src/core/i18n/locales/{es,en}.json`.
- Soy perfil junior aprendiendo React Native: explica las decisiones, avanza en pasos pequeños (un PR por regla o por capa) y no agregues capas ni librerías sin justificarlas.
- Cada regla de negocio RN-XX que implementes lleva al menos una prueba con su número en el nombre: `it('RN-03 rejects overlapping budgets')`.
- Antes de dar algo por terminado: `pnpm typecheck && pnpm lint && pnpm test`. En CI (GitHub Actions) los tres bloquean el merge.
- **Claude no hace commits ni push.** Al terminar una tarea: avisar que está lista, marcarla `[x]` en `docs/work-plan.md` y dar un resumen mínimo (qué se implementó, archivos tocados, RN cubiertas, resultado de typecheck/lint/test) con un mensaje de commit sugerido en Conventional Commits. El usuario hace los commits.
- Plan de trabajo e iteraciones: `docs/work-plan.md`.
- Diseño: producto en `docs/PRODUCT.md`; dirección visual "Sobres de la quincena", paleta A "Manila intenso" (claro/oscuro) en `.impeccable/surfaces/src-app.md`; bocetos en `.impeccable/mocks/`. Implementar tokens en T1.6; `DESIGN.md` se escribe al terminar las primeras pantallas.

## Pruebas
- Reglas (`*.rules.test.ts`): obligatorias, una o más por RN-XX.
- Jest se importa explícito: `import { describe, expect, it, jest } from '@jest/globals'` (TypeScript 6 no carga tipos globales de `@types/*`). Las pruebas no van en `src/app/` (Expo Router trata cada archivo como ruta); las de pantallas van en `src/__tests__/`.
- Repositorios: contra SQLite en memoria (migraciones, triggers, mappers). `expo-sqlite` es nativo y no corre en Jest/Node: usar un driver Node (p. ej. `better-sqlite3` + `SqliteDialect` de Kysely) como devDependency. Decidido en T1.11: `better-sqlite3` (devDependency, aprobado en `allowBuilds`).
- Componentes: solo pantallas con lógica de interacción (formulario de movimiento con líneas).
- Rendimiento: Android físico de gama baja (2–3 GB RAM) en modo release antes de cada entrega.

## Alcance
- App móvil Android + iOS, 100% local (SQLite en el dispositivo). Sin backend ni cuentas en línea; un usuario por dispositivo con registro local (nombre, correo, país) y PIN obligatorios (RN-42 a RN-47).
- Fuera de alcance en Fase 1: backend (proyecto separado), grupo familiar, conversión de monedas, recurrencia automática, adjuntos, push remoto. Respaldo/exportación = etapa final del MVP.

## Stack
- Expo + TypeScript + Expo Router. Gestor: **pnpm** con `nodeLinker: hoisted` en `pnpm-workspace.yaml` (pnpm ≥ 11 ya no lee esa opción de `.npmrc`) y versión fijada en `packageManager`.
- Persistencia: `expo-sqlite` + **Kysely** (`kysely-expo`), migraciones en código con `Migrator`.
- Zod (DTOs), React Hook Form, Zustand (solo estado global pequeño), i18next + react-i18next + expo-localization, `useColorScheme` + tokens (claro/oscuro/sistema), expo-notifications (solo locales), date-fns, expo-crypto (`randomUUID`), FlashList.
- Jest (`jest-expo`) + React Native Testing Library. ESLint (+ `eslint-plugin-boundaries` y `no-restricted-imports` para validar capas; matriz en `docs/work-plan.md`) + Prettier + Husky + lint-staged. GitHub Actions. EAS Build + EAS Update.

## TypeScript: prohibido `any` en todos los casos
- tsconfig: `strict`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noUnusedLocals`, `noUnusedParameters`.
- ESLint (typed linting) en `error`: `no-explicit-any`, `no-unsafe-*` (assignment, member-access, call, return, argument), `ban-ts-comment`, `no-non-null-assertion`, `switch-exhaustiveness-check`, `consistent-type-imports`, `react-hooks/*`, `i18next/no-literal-string`.
- Datos desconocidos entran como `unknown` y se validan con Zod.

## Arquitectura: features con capas ligeras (MVVM)
```
src/
├── app/                 # screens + routes (Expo Router)
├── core/{db,i18n,theme,notifications,shared}
└── features/{budgets,movements,categories,alerts,settings}/
    ├── <x>.types.ts       # entity + DTOs (no React, no DB)
    ├── <x>.schemas.ts     # Zod schemas
    ├── <x>.rules.ts       # pure business rules RN-XX (+ .test.ts)
    ├── <x>.repository.ts  # interface + Kysely impl + row<->entity mapper
    ├── use<X>.ts          # ViewModel
    └── components/
```
- Dependencias: Pantalla → ViewModel → (Reglas | Repositorio) → Kysely/SQLite. Las pantallas nunca llaman al repositorio; solo el repositorio conoce Kysely.
- Entre features: solo se importan `*.types.ts` y `*.rules.ts` de otra feature; nunca su repositorio, ViewModel ni componentes.
- Errores de negocio con `Result<T, E>` (`ok(v)` / `err('BUDGET_OVERLAP')`), códigos UPPER_SNAKE_CASE traducidos en pantalla con `t('errors.<CODE>')`. Excepciones solo para fallos inesperados.
- `Money = { amountMinor: number; currency: CurrencyCode }`; sumar monedas distintas devuelve error.
- Repositorios inyectados por contexto de React; en pruebas, implementaciones en memoria.
- i18n: claves por feature en inglés (`budgets.form.amountLabel`); categorías del sistema con `t('categories.<CODE>')`; montos con `Intl.NumberFormat` y fechas con date-fns según idioma; notificaciones en el idioma vigente al enviarlas.
- Nombres: tablas/columnas snake_case, propiedades TS camelCase (el mapper convierte), componentes PascalCase, hooks `useX`, archivos `feature.role.ts`. Conventional Commits en inglés.

## Modelo de datos (9 tablas, IDs UUID texto, montos enteros en unidad menor)
- `currency(code PK, name, decimals)` — COP 0, USD 2, EUR 2.
- `category(id, code UK nullable [sistema], name nullable [personalizadas, único lower()], icon, color, is_system, archived_at, created_at, updated_at)`.
  Sistema: ALIMENTACION, TRANSPORTE, ENTRETENIMIENTO, URGENCIAS, OBLIGACIONES_HOGAR, SIN_CLASIFICAR.
- `budget(id, category_id FK, currency_code FK, amount_minor>0, start_date, end_date [YYYY-MM-DD, start<=end], status ACTIVE|CLOSED, spent_final_minor, closed_at, created_at, updated_at, deleted_at)`.
- `budget_threshold(id, budget_id FK, percentage 1..100, is_automatic)` — UNIQUE(budget_id, percentage).
- `alert_sent(id, threshold_id FK UNIQUE, sent_at)`.
- `movement(id, kind EXPENSE|REFUND|INCOME, currency_code FK, total_minor>0, occurred_at [ISO local con desfase], local_date [YYYY-MM-DD], payment_method CASH|DEBIT_CARD|CREDIT_CARD|TRANSFER|OTHER, note, created_at, updated_at, deleted_at)`.
- `movement_line(id, movement_id FK, category_id FK NOT NULL, budget_id FK nullable [lo asigna la app], amount_minor>0)`.
- `settings(id=1, language es|en, theme LIGHT|DARK|SYSTEM, updated_at)`.
- `user_profile(id=1, full_name, email, country_code, created_at, updated_at)`. El PIN (hash con sal) va en `expo-secure-store`, nunca en SQLite.
- Triggers `BEFORE INSERT` y `BEFORE UPDATE ON budget` que abortan con `BUDGET_OVERLAP` si se cruza con otro presupuesto no borrado de la misma categoría. **El de UPDATE debe excluir `id = NEW.id`** (si no, choca consigo mismo).
- Únicos: `budget_threshold(budget_id, percentage)`, `alert_sent(threshold_id)`, `category(lower(name)) WHERE name IS NOT NULL`.
- Solo en dominio (misma transacción del guardado): suma de líneas = total, máx. 3 umbrales configurables, fecha no futura, 12 dígitos enteros, bloqueo por presupuesto cerrado, reasignación RN-39.
- Índices: budget(category_id, start_date, end_date), movement(local_date), movement_line(movement_id), (category_id), (budget_id).

## Reglas de negocio (resumen; detalle en docs/business-rules.md)
Presupuestos
- RN-01 Categoría, moneda, monto>0, inicio<=fin. RN-02 Moneda no editable.
- RN-03 Sin solapamiento por categoría (sin importar moneda): `nuevo.inicio <= existente.fin AND nuevo.fin >= existente.inicio`. Validar en dominio y trigger.
- RN-04 Sin recurrencia automática.
- RN-05 Estados: activo (hoy<=fin), en gracia (fin<hoy<=fin+5, calculado), CLOSED (hoy>fin+5). Cierre perezoso al abrir la app; congela spent_final_minor.
- RN-06 Editar monto solo activo; aviso si queda bajo lo gastado; reevaluar umbrales. RN-07 Editar fechas solo activo; revalidar RN-03.
- RN-08 Cerrado: no se edita ni admite cambios en movimientos que lo afecten. RN-09 Sobrante se muestra como "ahorrado". RN-10 Borrado lógico: sus movimientos se conservan pero dejan de contar y sus umbrales no se evalúan. RN-11 Se permite exceder el 100%.

Movimientos
- RN-12 Tipo en cabecera, sin mezclar. RN-13 Cabecera: tipo, moneda, total, fecha y hora, medio de pago, nota.
- RN-14 ≥1 línea; categoría (por defecto SIN_CLASIFICAR) y monto>0; suma de líneas = total.
- RN-15 Guardar fecha y hora local con desfase; asignar presupuesto por la fecha local. RN-16 Sin fechas futuras.
- RN-17 `budget_id` lo asigna la app: misma categoría + misma moneda + local_date en [inicio, fin] + no borrado + activo o en gracia. Máximo uno; si no hay, nulo. El usuario nunca lo elige.
- RN-18 Fecha en presupuesto cerrado: se registra sin afectarlo. RN-19 Medio de pago obligatorio. RN-20 Montos con decimales de la moneda, máx. 12 dígitos enteros. RN-21 Borrado lógico + recálculo.
- RN-39 Reasignar budget_id, dentro de la misma transacción, al editar fecha/categoría/moneda de un movimiento, al crear un presupuesto (toma líneas sin presupuesto que encajen), al editar sus fechas y al borrarlo (sus líneas quedan sin presupuesto); luego reevaluar umbrales de los afectados.

Cálculo
- gastado = Σ EXPENSE − Σ REFUND (mín. 0); disponible = monto + Σ INCOME; % = gastado/disponible×100; sobrante = disponible − gastado (negativo = excedido). Solo líneas con ese budget_id, no borradas.
- RN-22 REFUND reduce gastado. RN-23 INCOME con budget_id aumenta el cupo.

Umbrales y notificaciones
- RN-24 0–3 umbrales, enteros 1–100, sin repetir. RN-25 Alerta automática del 100% siempre (is_automatic=1).
- RN-26 Evaluar al crear/editar/borrar movimientos y al editar monto/fechas; sin procesos en segundo plano.
- RN-27 Un aviso por umbral (alert_sent); si el uso baja del umbral se borra el registro. RN-28 Varios umbrales a la vez → una notificación con el más alto.
- RN-29 >100% sin más alertas, marcado "excedido". RN-30 Notifican activos y en gracia. RN-31 Sin permiso → banner en la app.

Monedas, categorías y configuración
- RN-32 COP/USD/EUR en unidad menor. RN-33 Sin conversión; totales agrupados por moneda.
- RN-34 Categorías del sistema no se borran ni renombran; se traducen por `code`. RN-35 Personalizadas con nombre único, ícono y color. RN-36 Con historial se archivan; archivada no admite nuevos presupuestos ni líneas.
- RN-37 Idioma es/en y tema; sin moneda por defecto. RN-38 Gracia fija de 5 días.
- RN-40 Categoría nunca nula; SIN_CLASIFICAR no admite presupuestos; reclasificar dispara RN-39.
- RN-41 Se permiten líneas sin presupuesto (budget_id nulo); un ingreso general no aumenta ningún cupo.

Perfil y seguridad
- RN-42 Registro obligatorio al primer arranque (nombre, correo sin verificar, país ISO). El país no cambia reglas.
- RN-43 PIN obligatorio de 4–6 dígitos, solo hash con sal en secure-store; bloquea la pantalla pero no cifra la base.
- RN-44 Bloqueo al abrir y tras 30 s en segundo plano; sin datos en la vista previa. RN-45 5 fallos → espera creciente.
- RN-46 PIN olvidado = borrar todos los datos con confirmación; no hay recuperación. RN-47 Editar perfil/PIN pidiendo el PIN actual.

## Orden de implementación
1. Proyecto base (Expo, pnpm, TS estricto, ESLint, Prettier, Husky, CI)
2. core/shared (Result, Money, fechas), i18n es/en, tema
3. DB: conexión Kysely, tipos `Database`, migración inicial, triggers, seeds (monedas y categorías del sistema). Verificar compatibilidad de `kysely-expo` con la versión de `expo-sqlite` del SDK.
4. Settings → 4B. Registro y PIN (iteración 1B) → 5. Categorías → 6. Presupuestos → 7. Movimientos (+ asignación RN-17/RN-39) → 8. Cálculo de uso → 9. Umbrales y notificaciones
10. *(Opcional)* Pruebas en dispositivos (APK interno Android, Expo Go iOS, gama baja) → 11. *(Opcional)* Respaldo
