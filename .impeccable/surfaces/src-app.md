---
version: 1
slug: "src-app"
primary_target: "src/app"
related_targets: []
---

# Superficie: app móvil (pantallas del MVP)

Modo: Operate. Audiencia: personas en Colombia que registran gastos en el momento y preguntan "¿me alcanza?". Inicio = estado de los presupuestos. Evitar: exceso de gráficos y regañar al usuario.

## Direction contract

THESIS: Cada presupuesto es un sobre con la plata del periodo; de un vistazo se ve cuánto queda adentro. Rechaza la lista de tarjetas blancas con barra de progreso verde/roja.

OWN-WORLD: Paleta A "Manila intenso" (elegida 2026-11-07). El manila es el color de marca y llena cabecera, sobres y acción principal; fondo gris neutro frío, nunca crema. Claro: ground #ECEEF1, surface #FFFFFF, line #D8DCE1, ink #14161A, mute #5C6570, manila #E3A21A (cabecera y relleno), CTA ink #14161A sobre blanco, over #C8331B, pos #1E8A52, link #2558C9. Oscuro: ground #0E1013, surface #191C20, line #2A2F36, ink #F1F2F4, mute #9AA3AE, manila #F2B33D (título, relleno, CTA con texto #14161A), over #FF7A5C, pos #4CC98A, link #7FA6FF. Ligas de categoría claro/oscuro: #D9452A/#FF7A5C, #2F66D8/#7FA6FF, #23955E/#4CC98A, #7A4FD0/#A98BFF. Excedido = borde y texto over + "Te pasaste", sin fondo rojo. Archivo con cifras tabulares; montos grandes en ancho condensado. Rejilla de sobres a dos columnas; controles nativos estándar.

STORY: La persona abre la app, ve qué sobre está por vaciarse, anota un gasto en segundos y entiende en qué sobre cayó cada parte.

FIRST VIEWPORT: Título "Tus sobres" y total restante por moneda; rejilla 2×N de sobres, cada uno lleno hasta lo que queda, con liga de su categoría, nombre, periodo y monto restante abajo; botón "Anotar gasto" abajo a la derecha; barra de 4 pestañas (Inicio, Movimientos, Presupuestos, Ajustes).

FORM: Sobres de la quincena, candidato 1 de la lista propia (IMPECCABLE'S PICK), seed:7dca1e9b7214f026. Firma: el nivel de llenado del sobre = lo que queda; los umbrales son ligas sobre el sobre.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
