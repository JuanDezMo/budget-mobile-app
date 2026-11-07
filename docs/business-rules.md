# App de presupuestos — Reglas de negocio MVP (Fase 1)

Nov 6, 2026 · @Natalia

## Contexto y alcance

La Fase 1 es una app móvil (React Native + Expo) que funciona 100% en el dispositivo con SQLite, sin backend. El usuario se registra una vez en el dispositivo y se protege con un PIN local (RN-42 a RN-47). Permite crear presupuestos por categoría y periodo, registrar movimientos (gastos, reembolsos e ingresos) que pueden repartirse entre varias categorías, y avisa con notificaciones locales cuando el uso cruza los umbrales definidos.

- Un solo usuario por dispositivo, con perfil y PIN locales.
- Idiomas: español e inglés. Tema claro, oscuro o del sistema.
- El backend (sincronización, grupo familiar) es un proyecto separado, posterior a esta fase.

Las reglas se numeran como RN-XX para poder referenciarlas en historias de usuario, pruebas y código.

## Glosario

| Término | Definición |
| --- | --- |
| Presupuesto | Monto máximo para una categoría, en una moneda, entre una fecha de inicio y una de fin. |
| Periodo de gracia | 5 días después de la fecha de fin en los que el presupuesto aún acepta movimientos. |
| Movimiento | Registro de dinero: gasto (`EXPENSE`), reembolso (`REFUND`) o ingreso (`INCOME`). |
| Línea de movimiento | Parte de un movimiento asignada a una categoría con su monto. Un movimiento tiene una o varias. |
| Umbral | Porcentaje de uso (1–100) que dispara una notificación. |
| Alerta enviada | Registro de que un umbral ya fue notificado, para no repetir el aviso. |
| Unidad menor | Forma entera de guardar montos: USD 10,50 = 1050; COP 50.000 = 50000. |

## Presupuestos

- **RN-01 — Datos obligatorios.** Categoría, moneda, monto mayor que 0, fecha de inicio y fecha de fin, con inicio ≤ fin.
- **RN-02 — Moneda fija.** La moneda se elige al crear el presupuesto y no se puede cambiar después.
- **RN-03 — Sin solapamiento.** No pueden existir dos presupuestos no borrados de la misma categoría cuyos rangos se crucen, sin importar la moneda. Hay cruce cuando `nuevo.inicio <= existente.fin` y `nuevo.fin >= existente.inicio`. Se valida en el dominio (mensaje claro) y en la base de datos (trigger), al crear y al editar.
- **RN-04 — Sin recurrencia automática.** El usuario crea manualmente un nuevo presupuesto para cada periodo y categoría que desee.
- **RN-05 — Estados.** `ACTIVE` mientras hoy ≤ fin; en gracia mientras fin < hoy ≤ fin + 5 días; `CLOSED` cuando hoy > fin + 5 días. El cierre se aplica al abrir la app (sin tareas en segundo plano) y congela el gastado final.
- **RN-06 — Editar monto.** Solo en estado activo. Si el nuevo monto es menor que lo gastado, se muestra un aviso pero se permite. Tras el cambio se reevalúan los umbrales (RN-27).
- **RN-07 — Editar fechas.** Solo en estado activo. Se valida de nuevo RN-03 y se recalculan uso y alertas.
- **RN-08 — Presupuesto cerrado.** No se edita y no admite crear, editar ni borrar movimientos que lo afecten.
- **RN-09 — Sobrante.** Al cerrar con dinero sin ejecutar, el sobrante se muestra como “ahorrado”. No se traslada a otro presupuesto en esta fase.
- **RN-10 — Borrado lógico.** Borrar un presupuesto lo marca con `deleted_at`. Sus movimientos se conservan, dejan de contar y sus umbrales dejan de evaluarse.
- **RN-11 — Exceder el presupuesto.** Se permite registrar gastos aunque se supere el 100%.

## Movimientos

- **RN-12 — Tipo en la cabecera.** Cada movimiento es `EXPENSE`, `REFUND` o `INCOME`. Un mismo movimiento no mezcla tipos.
- **RN-13 — Datos de la cabecera.** Tipo, moneda, monto total, fecha y hora, medio de pago y nota opcional.
- **RN-14 — Líneas.** Todo movimiento tiene al menos una línea, cada una con categoría (si el usuario no elige, se usa SIN\_CLASIFICAR, RN-40) y monto mayor que 0. La suma de las líneas debe ser igual al total. Ejemplo: mercado por USD 100 = 50 Alimentación + 20 Entretenimiento + 30 Obligaciones hogar.
- **RN-15 — Fecha y hora.** Se graba la fecha y hora local del dispositivo con su desfase UTC (por ejemplo `2026-11-06T23:10:00-05:00`). Para asignar presupuestos se usa la fecha local de ese registro, no la fecha UTC, así un gasto de las 11 p. m. no cambia de día. El usuario puede ajustar fecha y hora al registrar.
- **RN-16 — Sin fechas futuras.** La fecha y hora no puede ser posterior al momento actual del dispositivo.
- **RN-17 — Asignación a presupuesto.** Cada línea guarda su categoría y el presupuesto al que cuenta. La app asigna ese presupuesto automáticamente al guardar, buscando el que cumple todo: misma categoría, misma moneda que el movimiento, fecha local dentro de \[inicio, fin\], no borrado y en estado activo o en gracia. Por RN-03 hay como máximo uno; si no hay ninguno, la línea queda sin presupuesto. El usuario nunca elige el presupuesto: en el formulario solo ve “Cuenta para: Ocio · 01–15 nov” o “Sin presupuesto activo”.
- **RN-18 — Fecha en un presupuesto cerrado.** El movimiento se registra, pero esa línea no afecta ningún presupuesto y se muestra un aviso. Un movimiento con líneas que cuentan en un presupuesto cerrado no se puede editar ni borrar (RN-08).
- **RN-19 — Medio de pago.** Obligatorio, con valores fijos: `CASH`, `DEBIT_CARD`, `CREDIT_CARD`, `TRANSFER`, `OTHER`.
- **RN-20 — Montos.** Siempre mayores que 0, con los decimales que permite la moneda (RN-32) y un máximo de 12 dígitos enteros para evitar errores de digitación.
- **RN-21 — Borrado lógico.** Borrar un movimiento lo marca con `deleted_at`, recalcula el uso de los presupuestos afectados y reevalúa sus umbrales.
- **RN-39 — Reasignación automática.** La app recalcula el presupuesto de las líneas, dentro de la misma transacción, cuando: (1) se edita la fecha, la categoría o la moneda de un movimiento; (2) se crea un presupuesto, asignándole las líneas sin presupuesto de su categoría, moneda y fechas; (3) se editan las fechas de un presupuesto, reasignando las líneas afectadas; (4) se borra un presupuesto, dejando sus líneas sin presupuesto. Después de reasignar se reevalúan los umbrales de los presupuestos afectados.

## Cálculo de uso

El uso de un presupuesto se calcula solo con las líneas asignadas según RN-17 y no borradas.

```
gastado    = Σ líneas EXPENSE − Σ líneas REFUND   (mínimo 0)
disponible = monto del presupuesto + Σ líneas INCOME
% de uso   = gastado / disponible × 100
sobrante   = disponible − gastado                 (puede ser negativo = excedido)
```

Ejemplo, Entretenimiento USD 55: gastos 40, reembolso 10 e ingreso 15 dan gastado 30, disponible 70 y uso de 42,9%.

- **RN-22 — Reembolso.** Un `REFUND` reduce lo gastado de la categoría; el gastado nunca baja de 0.
- **RN-23 — Ingreso al presupuesto.** Un `INCOME` aumenta el cupo disponible del presupuesto al que se asigna.

## Umbrales y notificaciones

- **RN-24 — Configuración.** De 0 a 3 umbrales por presupuesto, enteros entre 1 y 100, sin repetidos.
- **RN-25 — Alerta del 100%.** Siempre existe una alerta automática al llegar al 100%, aunque no se haya configurado.
- **RN-26 — Cuándo se evalúa.** Al crear, editar o borrar un movimiento y al editar monto o fechas de un presupuesto. No hay procesos en segundo plano.
- **RN-27 — Un aviso por umbral.** Cada umbral se notifica una sola vez por presupuesto y queda registrado como alerta enviada. Si el uso vuelve a quedar por debajo (reembolso, borrado, aumento de monto o ingreso), se elimina ese registro y el umbral puede volver a notificar.
- **RN-28 — Varios umbrales a la vez.** Si un solo cambio cruza varios umbrales, se envía una sola notificación con el más alto y todos quedan registrados.
- **RN-29 — Por encima del 100%.** No se envían más alertas; el presupuesto se marca visualmente como “excedido”.
- **RN-30 — Estados que notifican.** Notifican los presupuestos activos y en gracia; los cerrados y borrados no.
- **RN-31 — Permiso denegado.** Si el usuario no concede permiso de notificaciones, la alerta se muestra como banner dentro de la app.

Ejemplo con Entretenimiento USD 55 y umbrales de 50% y 90%:

| Gastado acumulado | % de uso | Resultado |
| --- | --- | --- |
| USD 30 | 54,5% | Alerta del 50% |
| USD 50 | 90,9% | Alerta del 90% |
| USD 56 | 101,8% | Alerta automática del 100% |
| USD 70 | 127,3% | Sin alerta; marcado como excedido |

## Monedas, categorías y configuración

- **RN-32 — Monedas soportadas.** COP (0 decimales), USD (2) y EUR (2). Todos los montos se guardan como enteros en unidad menor.
- **RN-33 — Sin conversión.** No se convierten monedas. Los totales y resúmenes se muestran agrupados por moneda, nunca sumados entre sí.
- **RN-34 — Categorías del sistema.** Vienen precargadas: ALIMENTACION, TRANSPORTE, ENTRETENIMIENTO, URGENCIAS, OBLIGACIONES\_HOGAR y SIN\_CLASIFICAR. No se pueden borrar ni renombrar; su nombre visible se traduce según el idioma usando su código.
- **RN-35 — Categorías personalizadas.** El usuario puede crear las suyas con nombre, ícono y color. El nombre es único sin distinguir mayúsculas.
- **RN-36 — Archivar categorías.** Una categoría personalizada con historial no se borra, se archiva. Una categoría archivada no admite nuevos presupuestos ni líneas, pero su historial se conserva.
- **RN-37 — Configuración de la app.** Idioma (español o inglés) y tema (`LIGHT`, `DARK`, `SYSTEM`). No hay moneda por defecto: se elige en cada presupuesto.
- **RN-38 — Días de gracia fijos.** El periodo de gracia es de 5 días para todos los presupuestos y no es configurable en esta fase.
- **RN-40 — Categoría SIN\_CLASIFICAR.** Toda línea tiene categoría; la categoría nunca es nula. Si el usuario no elige una, la línea queda en SIN\_CLASIFICAR, sin presupuesto. No se pueden crear presupuestos para SIN\_CLASIFICAR. El usuario puede reclasificar la línea después, lo que dispara la reasignación (RN-39). En los reportes aparece como el grupo “Sin clasificar”.
- **RN-41 — Líneas sin presupuesto.** Se permiten: una línea cuya categoría no tiene presupuesto activo para su fecha y moneda se guarda con presupuesto vacío y se ve en el historial y en los reportes por categoría. Ejemplo: de una compra de USD 100, 70 cuentan para Alimentación y 30 quedan en Mascotas sin presupuesto. Un ingreso general, como el salario, es un INCOME sin presupuesto y no aumenta el cupo de ninguno.

## Perfil y seguridad

- **RN-42 — Registro obligatorio.** En el primer arranque el usuario debe registrar nombre, correo electrónico y país antes de usar la app. El nombre no puede estar vacío, el correo debe tener formato válido y el país es un código ISO 3166-1 alfa-2. El perfil se guarda solo en el dispositivo; el correo no se verifica ni se envía nada a él. El país no cambia ninguna regla de la app (no define moneda, RN-37).
- **RN-43 — PIN obligatorio.** El registro incluye crear un PIN de 4 a 6 dígitos, confirmado dos veces. Se guarda únicamente como hash con sal en el almacenamiento seguro del sistema; nunca en texto plano ni en la base de datos. El PIN bloquea el acceso a la app, pero no cifra la base: quien tenga acceso al archivo del dispositivo podría leerla. Si al registrarse existe un hash de PIN de una instalación anterior sin perfil (en iOS el Keychain puede sobrevivir a una reinstalación), se descarta.
- **RN-44 — Bloqueo.** La app pide el PIN al abrirse y al volver de segundo plano después de 30 segundos (fijo en esta fase). Mientras esté bloqueada no muestra datos, tampoco en la vista previa del selector de apps.
- **RN-45 — Intentos fallidos.** Tras 5 PIN incorrectos seguidos se aplica una espera que crece (30 s, 1 min, 2 min…, hasta un máximo de 15 minutos). El contador se guarda en el almacenamiento seguro, así que cerrar la app no lo reinicia, y rige para cualquier pantalla que pida el PIN. Un PIN correcto reinicia el contador.
- **RN-46 — PIN olvidado.** El PIN no se puede recuperar. La opción "Olvidé mi PIN" borra todos los datos de la app (perfil, presupuestos, movimientos) tras una confirmación explícita y devuelve al registro. El usuario recibe este aviso al crear el PIN.
- **RN-47 — Editar perfil y PIN.** El usuario puede cambiar nombre, correo y país, y cambiar su PIN, siempre pidiendo el PIN actual. No puede quitar el PIN.

## Fuera de alcance y fases futuras

| Tema | Fase prevista |
| --- | --- |
| Respaldo, exportación e importación de datos | Etapa final del MVP |
| Grupo familiar y presupuestos compartidos | Fase posterior (requiere backend) |
| Backend, cuentas en línea, verificación del correo, recuperación del PIN, sincronización y push remoto | Proyecto separado |
| Conversión entre monedas y tasas de cambio | Futuro |
| Recurrencia automática de presupuestos | Futuro |
| Trasladar el sobrante a otro presupuesto | Futuro |
| Biometría y cifrado de la base (SQLCipher) | Futuro |
| Adjuntos (foto del recibo) y comercio o lugar | Futuro |
| Historial de cambios de monto | Futuro |
