# App de presupuestos — Arquitectura MVP (Fase 1)

Nov 6, 2026 · @Natalia

La Fase 1 es una app Expo en TypeScript estricto, organizada por features con capas ligeras (pantalla, ViewModel, reglas y repositorio) y persistencia local con Kysely sobre SQLite. Complementa los documentos de reglas de negocio y de modelo entidad-relación.

## Principios

- **Todo el código en inglés.** Variables, funciones, tipos, tablas, columnas, archivos, carpetas, commits y comentarios.
- **Textos al usuario según el idioma elegido.** Ningún texto visible se escribe directo en el código: todo sale de archivos de traducción (español e inglés) según la configuración de la app (RN-37).
- **100% local.** SQLite en el dispositivo, sin backend ni red. El backend es un proyecto separado posterior.
- **Capas ligeras por feature.** Cada feature tiene sus tipos, reglas, repositorio, ViewModel y componentes; nada más hasta que se necesite.
- **TypeScript estricto, sin `any` en ningún caso.**
- **Reglas de negocio puras y probadas.** Cada RN-XX vive en una función sin React ni base de datos, con al menos una prueba.
- **Pocas dependencias.** Cada librería nueva se justifica, pensando en equipos de gama baja.

## Capas

&#91;embedded content: capas de una feature · 5 bloques\]

Las flechas indican quién llama a quién, siempre hacia abajo. Los tipos y DTOs (`*.types.ts`, `*.schemas.ts`) y el núcleo compartido (`core/`: i18n, tema, notificaciones, `Result`, `Money`) los pueden usar todas las capas.

## Estructura de carpetas

```
src/
├── app/                          # screens and routes (Expo Router)
├── core/
│   ├── db/                       # Kysely: connection, Database types, migrations
│   ├── i18n/                     # i18next setup + locales/es.json, locales/en.json
│   ├── theme/                    # color tokens, light/dark
│   ├── notifications/            # expo-notifications wrapper
│   └── shared/                   # Result, Money, date helpers
└── features/
    ├── budgets/
    │   ├── budget.types.ts       # entity + DTOs
    │   ├── budget.schemas.ts     # Zod schemas for DTOs
    │   ├── budget.rules.ts       # pure business rules
    │   ├── budget.rules.test.ts
    │   ├── budget.repository.ts  # interface + Kysely implementation + mapper
    │   ├── useBudgets.ts         # ViewModel
    │   └── components/
    ├── movements/
    ├── categories/
    ├── alerts/                   # thresholds + alert evaluation
    └── settings/
```

| Archivo | Responsabilidad | No puede |
| --- | --- | --- |
| `*.types.ts` | Entidades del dominio y DTOs de entrada | Importar nada de React ni de la base |
| `*.schemas.ts` | Validar DTOs con Zod e inferir sus tipos | Contener lógica de negocio |
| `*.rules.ts` | Reglas RN-XX como funciones puras | Leer ni escribir datos |
| `*.repository.ts` | Consultas Kysely y conversión fila ↔ entidad | Decidir reglas de negocio |
| `use*.ts` | ViewModel: estado, acciones y orquestación | Escribir SQL |
| `app/` y `components/` | Pintar y capturar eventos | Llamar al repositorio directo |

## Stack

| Área | Elección | Nota |
| --- | --- | --- |
| Base | Expo + TypeScript + Expo Router | Una sola base para Android e iOS |
| Dependencias | pnpm | `nodeLinker: hoisted` en `pnpm-workspace.yaml` y versión fijada en `packageManager` |
| Persistencia | `expo-sqlite` + Kysely (`kysely-expo`) | Migraciones en código con el `Migrator` de Kysely |
| Validación | Zod | Valida DTOs y genera sus tipos |
| Formularios | React Hook Form + Zod |  |
| Estado de UI | Zustand | Solo estado global pequeño (tema, filtros) |
| Multi-idioma | `i18next` + `react-i18next` + `expo-localization` | Español e inglés |
| Tema | `useColorScheme` + tokens propios | Claro, oscuro o del sistema |
| Notificaciones | `expo-notifications` | Solo locales |
| Fechas | `date-fns` |  |
| IDs | `expo-crypto` (`randomUUID`) |  |
| Listas | FlashList | Rendimiento en gama baja |
| Pruebas | Jest (`jest-expo`) + React Native Testing Library |  |
| Calidad | ESLint + Prettier + Husky + lint-staged |  |
| Builds | EAS Build + EAS Update |  |

## TypeScript y lint

`any` está prohibido en todos los casos, incluido el que llega desde librerías o `JSON.parse`. Los datos de tipo desconocido se reciben como `unknown` y se validan con Zod.

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

Reglas de ESLint con *typed linting* (`@typescript-eslint`), todas en `error`:

| Regla | Qué evita |
| --- | --- |
| `no-explicit-any` | Escribir `any` |
| `no-unsafe-assignment`, `no-unsafe-member-access`, `no-unsafe-call`, `no-unsafe-return`, `no-unsafe-argument` | Que un `any` implícito se propague |
| `ban-ts-comment` | `@ts-ignore` y `@ts-nocheck` |
| `no-non-null-assertion` | El operador `!` para saltarse nulos |
| `switch-exhaustiveness-check` | Olvidar un caso al agregar un valor, p. ej. un nuevo `kind` |
| `consistent-type-imports` | Mezclar imports de tipos y de valores |
| `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps` | Errores comunes con hooks |
| `i18next/no-literal-string` | Textos visibles escritos directo en JSX |

## Convenciones

**Idioma.** El código está en inglés; lo que ve el usuario sale de `core/i18n/locales/{es,en}.json`.

- Claves de traducción por feature, en inglés: `budgets.form.amountLabel`, `alerts.thresholdReached`.
- Los errores de negocio usan un código estable en inglés (`BUDGET_OVERLAP`) que se traduce en la pantalla: `t('errors.BUDGET_OVERLAP')`.
- Las notificaciones locales también se traducen con el idioma vigente al momento de enviarlas.
- Los nombres de las categorías del sistema se traducen por su `code`: `t('categories.TRANSPORTE')`.
- Montos y fechas se formatean según el idioma con `Intl.NumberFormat` y `date-fns`.

**Nombres.**

| Elemento | Formato | Ejemplo |
| --- | --- | --- |
| Archivos de feature | `feature.role.ts` | `budget.rules.ts` |
| Componentes | PascalCase | `BudgetCard.tsx` |
| Hooks / ViewModels | `use` + camelCase | `useBudgets` |
| Tipos e interfaces | PascalCase | `Budget`, `CreateBudgetDto` |
| Tablas y columnas | snake\_case | `movement_line.amount_minor` |
| Propiedades en TypeScript | camelCase | `amountMinor` (el mapper convierte) |
| Códigos de error | UPPER\_SNAKE\_CASE | `THRESHOLD_LIMIT_EXCEEDED` |

**Errores de negocio sin excepciones.** Las reglas y los repositorios devuelven `Result<T, E>`: `ok(value)` o `err('BUDGET_OVERLAP')`. Las excepciones quedan para fallos inesperados (base de datos corrupta, error de programación).

**Dinero.** Un tipo `Money = { amountMinor: number; currency: CurrencyCode }` con funciones `add`, `subtract` y `format`. Sumar dos monedas distintas devuelve error, nunca un número.

**Dependencias.** Un contexto de React entrega los repositorios; las pruebas usan implementaciones en memoria de la misma interfaz.

**Commits.** Conventional Commits en inglés (`feat(budgets): reject overlapping budgets`) y PRs pequeños, uno por regla o por capa.

## Calidad

- **Pruebas de reglas (obligatorias).** Cada RN-XX tiene al menos una prueba con su número en el nombre: `it('RN-03 rejects overlapping budgets')`.
- **Pruebas de repositorios.** Contra SQLite en memoria, verificando migraciones, triggers y mappers.
- **Pruebas de componentes.** Solo para pantallas con lógica de interacción (formulario de movimiento con líneas).
- **Antes de cada commit.** Husky + lint-staged ejecutan Prettier y ESLint sobre los archivos cambiados.
- **En cada PR.** GitHub Actions ejecuta `pnpm typecheck`, `pnpm lint` y `pnpm test`; si alguno falla, no se fusiona.
- **Rendimiento.** Probar en un Android físico de gama baja (2–3 GB de RAM) en modo release antes de cada entrega.

## Orden de implementación

Cada paso es un PR pequeño y revisable. Dentro de cada feature se avanza de adentro hacia afuera: tipos, reglas con pruebas, repositorio, ViewModel y pantalla.

1. **Proyecto base.** Expo + pnpm + TypeScript estricto + ESLint + Prettier + Husky + CI.
2. **Núcleo compartido.** `Result`, `Money`, utilidades de fechas, i18n (es/en) y tema claro/oscuro.
3. **Base de datos.** Conexión Kysely, tipos `Database`, migración inicial con las 8 tablas, triggers y datos precargados (monedas y categorías del sistema).
4. **Configuración.** Pantalla de idioma y tema (RN-37).
5. **Categorías.** Listar, crear, archivar (RN-34 a RN-36, RN-40).
6. **Presupuestos.** Crear, editar, borrar, estados y cierre con gracia (RN-01 a RN-11, RN-38).
7. **Movimientos.** Cabecera con líneas, asignación y reasignación de presupuesto (RN-12 a RN-21, RN-39, RN-41).
8. **Cálculo de uso.** Gastado, disponible y porcentaje (RN-22, RN-23).
9. **Umbrales y notificaciones.** Configuración, evaluación, notificación local y banner (RN-24 a RN-31).
10. **Pruebas en dispositivos.** APK interno en Android y Expo Go en iOS; rendimiento en gama baja.
11. **Respaldo.** Exportar e importar datos (etapa final del MVP).
