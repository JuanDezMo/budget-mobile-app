# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

Una sola identidad visual propia en Android e iOS. Solo se adaptan las convenciones nativas esenciales de cada sistema: gesto y botón atrás, teclado, áreas seguras, hojas modales, permisos y notificaciones. No se usa Material Design en un sistema y estilo iOS en el otro.

## Users

Personas en Colombia que manejan su dinero personal o del hogar, sobre todo en pesos colombianos (COP), a veces también en USD o EUR. Registran los gastos en el momento, desde el celular, muchas veces con una mano y con prisa (en la caja, en la calle, después de pagar). Una parte usa equipos Android de gama baja (2–3 GB de RAM). Un solo usuario por dispositivo.

## Product Purpose

Ayudar a no pasarse del presupuesto. El usuario define cuánto quiere gastar por categoría en un periodo, registra cada movimiento y la app le dice en todo momento cuánto lleva, cuánto le queda y le avisa antes de llegar al límite. Éxito = el usuario registra sus gastos sin fricción y termina los periodos dentro de su presupuesto, o sabe exactamente dónde se excedió.

## Positioning

- Una compra se reparte entre varias categorías (mercado = alimentación + hogar + ocio) y cada parte cuenta para su presupuesto automáticamente; el usuario nunca elige el presupuesto.
- 100 % local: sin cuenta, sin backend, sin conexión. Los datos no salen del teléfono.
- Multimoneda honesta: COP, USD y EUR conviven sin conversión ni tasas inventadas; los totales siempre se agrupan por moneda.
- Avisos por umbral configurables (hasta 3 + el 100 % automático), un aviso por umbral.

## Operating Context

- Registro rápido en el momento del pago; consulta del estado antes de comprar ("¿me alcanza?").
- Revisión periódica del avance de cada presupuesto y del historial.
- Periodos definidos por el usuario (no recurrentes), con 5 días de gracia para registrar gastos atrasados.
- Uso en exteriores y en interiores, en tema claro, oscuro o del sistema.

## Capabilities and Constraints

- Fase 1 (MVP): categorías (6 del sistema + personalizadas con ícono y color), presupuestos por categoría y periodo, movimientos (gasto, reembolso, ingreso) con líneas por categoría, cálculo de uso, umbrales y notificaciones locales. Opcional: respaldo exportar/importar.
- Reglas de negocio completas en `docs/business-rules.md` (RN-01 a RN-47).
- Expo + React Native + TypeScript; textos en español e inglés (i18n), nunca escritos en el código.
- Rendimiento en gama baja es un requisito: listas largas fluidas, pocas dependencias, animaciones livianas.
- Fuera de alcance: cuentas, sincronización, grupo familiar, conversión de monedas, recurrencia, adjuntos.
- **Sin decidir:** logo, identidad de marca y nombre corto bajo el ícono (el nombre completo se corta en ~12 caracteres). Nombre no verificado como marca registrada.

## Brand Commitments

- Nombre: **Adjusting My Money** (elegido por el usuario el 2026-11-07). Aún no hay logo ni colores.
- Dirección pedida por el usuario: **minimalista y que genere impacto**.

## Evidence on Hand

- Documentos de producto en `docs/`. No hay usuarios, testimonios, métricas ni capturas reales; no se deben inventar.

## Product Principles

1. Registrar un gasto debe tomar segundos: el camino más corto de la app.
2. El estado del presupuesto se entiende de un vistazo: cuánto llevo, cuánto queda, si me pasé.
3. La app decide lo mecánico (asignar presupuesto, cerrar periodos, avisar); el usuario solo decide su dinero.
4. Nada se oculta ni se mezcla: cada moneda por separado, lo excedido se dice claro.
5. Funciona bien en un teléfono modesto.

## Accessibility & Inclusion

- Bilingüe español/inglés con textos que pueden crecer en inglés o español sin romper la interfaz.
- Montos legibles y con contraste suficiente en claro y oscuro; respetar el tamaño de texto del sistema.
- El estado de un presupuesto no depende solo del color (texto o ícono además del color).
