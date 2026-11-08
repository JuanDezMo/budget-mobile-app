# Design — Adjusting My Money

Derived from what ships (2026-11-07), not from intentions. Direction: **"Sobres de la quincena"**,
palette A "Manila intenso". Source of the direction: `.impeccable/surfaces/src-app.md` and the
sketches in `.impeccable/mocks/`. Screenshots of the real app on an Android 14 emulator are kept
locally in `validation-screenshots/` (not committed).

## Idea

Every budget is an **envelope** holding the money of the period. The envelope is filled up to what is
**left**, so one look says what is about to run out. We do not use a list of white cards with a
green/red progress bar.

## Colors (`src/core/theme/tokens.ts`)

| Token    | Light     | Dark      | Use                                           |
| -------- | --------- | --------- | --------------------------------------------- |
| ground   | `#ECEEF1` | `#0E1013` | Screen background (cool grey, never cream)    |
| surface  | `#FFFFFF` | `#191C20` | Envelopes, cards, inputs                      |
| line     | `#D8DCE1` | `#2A2F36` | Borders, dividers, flap lines                 |
| ink      | `#14161A` | `#F1F2F4` | Text; dark call to action in light mode       |
| mute     | `#5C6570` | `#9AA3AE` | Secondary text                                |
| manila   | `#E3A21A` | `#F2B33D` | Brand: envelope fill, primary action          |
| onManila | `#14161A` | `#14161A` | Text over manila                              |
| over     | `#C8331B` | `#FF7A5C` | Exceeded: border and text only                |
| positive | `#1E8A52` | `#4CC98A` | Saved, "to assign ✓", refunds and incomes     |
| link     | `#2558C9` | `#7FA6FF` | Text links ("＋ Split into another category") |

Category colors are fixed hex values (12 choices) stored with the category.

## Typography (`src/core/theme/typography.ts`, `AppText`)

- **Archivo** 400/500/600/700/800 for all text. Titles extra bold (30), body 16, secondary 14, small 12–13.
- **Archivo Narrow Bold** for big amounts (envelope cards 26, detail 56, form 52): it stands in for
  Archivo's condensed width, which a phone cannot use (variable axis).
- Figures are always tabular (`fontVariant: tabular-nums`) so amounts line up.
- One font file = one weight on the phone, so the weight is part of the family name; never set
  `fontWeight` on a custom font.

## The envelope (`features/budgets/components/Envelope*.tsx`)

- **Frame:** surface, 1 px line border (2 px and `over` when exceeded), radius 10 (card) / 14 (detail),
  clipped. Flap = two lines from the top corners to the middle of a 46 px band.
- **Fill = what is left** (`remaining / available`), from the bottom. Exceeded = empty.
  Light: solid manila. Dark: manila at 30 % with a solid 2 px edge on top, so light text stays readable.
- **Band ("liga"):** vertical strip in the category color, 8 px in the card, 10 px in the detail.
- **Card (200 px high, 2 columns, 12 px gap):** name (bold 15) and short period (12) at the top;
  caption ("Queda" / "Te pasaste" / "Ahorrado") and the amount at the bottom left. Text over the fill is
  `ink` (never `mute`: not enough contrast on manila).
- **Bands (`ThresholdBands`, shared by the detail and the form preview):** each line is the top edge of a
  12 px dashed box clipped to 2 px (Android only dashes a border that goes all around); the label sits
  outside the clip.
- **Detail (250 px):** caption, big amount, "de {available} · {period} · {phase}". The **alert
  thresholds are bands across the envelope** at the height of what would be left (90 % used = 10 %
  left). Dashed while not reached, solid with a dark label once crossed. The automatic 100 % is always
  there. Text keeps 80 px free on the right so a label never covers the amount.
- **States:** exceeded (RN-29) = `over` border and text, "Te pasaste", no red fill. Saved (RN-09) = closed
  with money left, "Ahorrado". Grace and closed show their phase under the period.

## Screens

- **Home:** app name · date (13), title "Tus sobres" (30), sentence "Quedan COP 390.000 y USD 50,00"
  (one amount per currency, never added), grid of open envelopes, **"＋ Anotar gasto"** pill bottom right.
- **Movements (history, no sketch; chosen 2026-11-07):** title "Movimientos", one line of totals per
  currency ("Gastos COP 118.000 · Reembolsos …", a total at zero is left out, never added across
  currencies), kind and currency chips, then the movements **grouped by day** under small headings
  (HOY, AYER, "6 nov"; the year only when it is not this one). Each day is one continuous block of rows,
  not separate cards. A row is the detail row (icon of the biggest category, title = note or kind,
  "payment · categories" — payment first so it is never cut —, signed amount, chip "3 partes" when
  split) plus the **band** on the left edge (6 px) in the category color; a split movement splits the
  band by what each category took.
- **Budget form (no sketch; chosen 2026-11-07):** a live **envelope preview** at the top (190 px, full —
  nothing is spent yet —, band in the category color, name, period, "Cupo del sobre" and the amount,
  the alerts as dashed bands with the automatic 100 %). Below: categories as one row of chips that
  scrolls sideways, the big amount with its currency chip (shared `AmountInput`; locked when editing,
  RN-02), start and end dates side by side, alerts as chips ("50 % ✕", dashed "＋ Alerta", up to 3),
  and the dark save button pinned at the bottom.
- **Budgets:** envelopes grouped Activos / En periodo de gracia / Cerrados; full-width "Nuevo presupuesto"
  pinned at the bottom.
- **Detail:** big envelope, three figures (Gastado, Reembolsos, Usado), "MOVIMIENTOS · {currency}" with a
  row per line (category icon, title = note or kind, date · payment method, signed amount, chip "1 de 3"
  when the purchase was split). "Editar" lives in the header; "Borrar" at the end.
- **Add movement (sketches 3 and 4):** ✕ and title "Anotar"; segmented control Gasto/Reembolso/Ingreso;
  "Hoy 7:42 p. m." in the corner; big amount with the currency chip; five payment chips; the lines card
  (band of the category, name, "✉ Cuenta para: … · 7–21 nov" or "Sin sobre activo en COP", amount);
  "＋ Dividir en otra categoría"; "Por repartir COP 0 ✓"; dashed note; the dark **"Guardar …"** button
  pinned at the bottom. An income shows "¿Es para un sobre?" and, if it is, the note "El sobre pasará de
  USD 55,00 a USD 70,00 de cupo. Quedarán USD 50,00."
- **Tabs:** Inicio, Movimientos, Presupuestos (envelope icon), Ajustes. Active = filled icon and ink label.

## Components

- `PrimaryButton`: manila (primary), ink (dark call to action; manila with dark text in dark mode), danger.
- `FloatingAction`: `wide` (bottom, full width) and `pill` (bottom right).
- `AmountInput`: big condensed amount with the currency chip beside it; used by the movement and budget
  forms (`currencyLocked` for a budget being edited).
- `SegmentedControl`, `ChoiceChips`, `OptionGroup` (compact = one row of chips that scrolls sideways),
  `TextField`, `DateField`, `TimeField`, `DateTimeChip` (system pickers; value kept as text).
- `CategoryAvatar`: emoji over the category color (no icon font, light on low-end phones).
- `InAppAlertBanner`: alerts shown inside the app when the system notification cannot be used (RN-31).

## Rules of use

- Never hard-code a color or a font: tokens and `AppText`.
- Touch targets are at least 44 px; labels and roles are set for screen readers.
- Dates are `YYYY-MM-DD` text; money is an integer in the minor unit, formatted only for display.
- Amount fields show the thousands separator while typing (`core/i18n/amount-input.ts`): "1.500.000,5" in
  Spanish, "1,500,000.5" in English. The form keeps plain text with a dot ("1500000.5").
- Screens under a stack header use `<Screen topInset={false}>` (the header already covers the status bar).

## Known gaps

- Screens without a sketch (Categories, Settings, Profile, Registration,
  Lock) only share the colors and the font; they have not been redesigned.
- iOS has not been run. Release build and low-end phone performance are pending (iteration 7).
- Notifications of the system cannot be tested in Expo Go on Android.
