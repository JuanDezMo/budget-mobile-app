// Generates src/core/i18n/country-names.json from the full ICU data of Node.
// Why: Hermes (the JS engine on the phone) has no country names in Intl.DisplayNames, so the
// app ships its own table. Run again only if the country list in core/shared/countries.ts changes:
//   node scripts/generate-country-names.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/core/shared/countries.ts', import.meta.url), 'utf8');
const codes = [...source.matchAll(/'([A-Z]{2})',/g)].map((match) => match[1]);

const names = { es: {}, en: {} };
for (const language of Object.keys(names)) {
  const display = new Intl.DisplayNames([language], { type: 'region' });
  for (const code of codes) names[language][code] = display.of(code) ?? code;
}

writeFileSync(
  new URL('../src/core/i18n/country-names.json', import.meta.url),
  `${JSON.stringify(names, null, 2)}\n`,
);
console.log(`Wrote ${codes.length} countries in ${Object.keys(names).length} languages`);
