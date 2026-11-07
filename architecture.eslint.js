// Architecture rules (T0.4). See the layer matrix in docs/work-plan.md.
//
// 1. eslint-plugin-boundaries: which layer may import which.
//    - Elements are folders: screens (src/app), one element per feature
//      (src/features/<feature>) and one per core module (src/core/<module>).
//    - File categories are the layer of each file inside a feature, read from
//      its name: *.types.ts, *.schemas.ts, *.rules.ts, *.repository.ts,
//      use*.ts (ViewModel) and components/**.
//    - Default is "disallow": every allowed import is listed below.
// 2. no-restricted-imports: which external libraries each layer may use.
const boundaries = require('eslint-plugin-boundaries');

const sameFeature = { feature: '{{ from.element.captured.feature }}' };

// Selectors -----------------------------------------------------------------
const screen = { element: { type: 'screen' } };
const featureFile = (category, captured) => ({
  element: { type: 'feature', ...(captured ? { captured } : {}) },
  file: { categories: category },
});
const core = (module) => ({ element: { type: 'core', captured: { module } } });
const coreForUi = [core('shared'), core('i18n'), core('theme'), core('notifications')];

// Policies ------------------------------------------------------------------
// One policy per allowed (from, to) pair keeps every rule easy to read.
const allow = (from, targets) => targets.map((to) => ({ from, allow: { to } }));

// Any feature may import types and rules from another feature (decided 2026-11-07).
const crossFeature = (from) => allow(from, [featureFile('types'), featureFile('rules')]);

const policies = [
  // Screens (Expo Router): ViewModels, components, types and core (never db).
  ...allow(screen, [
    screen,
    featureFile('viewmodel'),
    featureFile('component'),
    featureFile('types'),
    ...coreForUi,
  ]),
  // Components: same-feature ViewModel, components and types; core (never db).
  ...allow(featureFile('component'), [
    featureFile('viewmodel', sameFeature),
    featureFile('component', sameFeature),
    featureFile('types', sameFeature),
    ...coreForUi,
  ]),
  ...crossFeature(featureFile('component')),
  // ViewModel: same-feature rules, repository interface, types, schemas; core (never db).
  ...allow(featureFile('viewmodel'), [
    featureFile('rules', sameFeature),
    featureFile('repository', sameFeature),
    featureFile('types', sameFeature),
    featureFile('schemas', sameFeature),
    featureFile('viewmodel', sameFeature),
    ...coreForUi,
  ]),
  ...crossFeature(featureFile('viewmodel')),
  // Rules: pure functions over types and core/shared only.
  ...allow(featureFile('rules'), [
    featureFile('rules', sameFeature),
    featureFile('types', sameFeature),
    core('shared'),
  ]),
  ...crossFeature(featureFile('rules')),
  // Repository: types, core/db and core/shared. Never rules or ViewModels.
  ...allow(featureFile('repository'), [
    featureFile('types', sameFeature),
    core('db'),
    core('shared'),
  ]),
  ...allow(featureFile('repository'), [featureFile('types')]),
  // Types: only other types and core/shared.
  ...allow(featureFile('types'), [featureFile('types'), core('shared')]),
  // Schemas: types and other schemas of the same feature, core/shared.
  ...allow(featureFile('schemas'), [
    featureFile('schemas', sameFeature),
    featureFile('types'),
    core('shared'),
  ]),
  // Core modules: shared is the base; db never reaches UI modules.
  ...allow(core('shared'), [core('shared')]),
  ...allow(core('db'), [core('db'), core('shared')]),
  ...['i18n', 'theme', 'notifications'].flatMap((module) => allow(core(module), coreForUi)),
  // Tests may import anything local (in-memory repositories, fixtures...).
  { from: { file: { categories: 'test' } }, allow: { to: { module: { origin: 'local' } } } },
];

// Restricted libraries ------------------------------------------------------
const restrict = (paths) => ['error', { paths }];
const dbLibs = [
  { name: 'kysely', message: 'Only *.repository.ts and src/core/db may use Kysely.' },
  { name: 'kysely-expo', message: 'Only *.repository.ts and src/core/db may use Kysely.' },
  { name: 'expo-sqlite', message: 'Only *.repository.ts and src/core/db may use SQLite.' },
];
const uiLibs = (layer) => [
  { name: 'react', message: `${layer} must not depend on React.` },
  { name: 'react-native', message: `${layer} must not depend on React Native.` },
];

module.exports = [
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
        node: true,
      },
      'boundaries/elements': [
        { type: 'screen', pattern: 'src/app', partialMatch: false },
        { type: 'feature', pattern: 'src/features/*', partialMatch: false, capture: ['feature'] },
        { type: 'core', pattern: 'src/core/*', partialMatch: false, capture: ['module'] },
      ],
      'boundaries/files': [
        { pattern: 'src/features/*/*.types.ts', category: 'types' },
        { pattern: 'src/features/*/*.schemas.ts', category: 'schemas' },
        { pattern: 'src/features/*/*.rules.ts', category: 'rules' },
        { pattern: 'src/features/*/*.repository.ts', category: 'repository' },
        { pattern: 'src/features/*/use*.ts', category: 'viewmodel' },
        { pattern: 'src/features/*/components/**/*', category: 'component' },
        { pattern: 'src/**/*.test.{ts,tsx}', category: 'test' },
      ],
    },
    rules: {
      // checkInternals: also check imports between files of the same feature.
      'boundaries/dependencies': ['error', { default: 'disallow', checkInternals: true, policies }],
      'no-restricted-imports': restrict(dbLibs),
    },
  },
  {
    files: ['src/features/*/*.repository.ts', 'src/core/db/**/*.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },
  {
    files: ['src/features/*/*.rules.ts'],
    rules: { 'no-restricted-imports': restrict([...dbLibs, ...uiLibs('Business rules')]) },
  },
  {
    files: ['src/features/*/*.types.ts', 'src/features/*/*.schemas.ts'],
    rules: { 'no-restricted-imports': restrict([...dbLibs, ...uiLibs('Types and schemas')]) },
  },
  {
    files: ['src/features/*/*.repository.ts'],
    rules: { 'no-restricted-imports': restrict(uiLibs('Repositories')) },
  },
  {
    // Tests can use any library (e.g. an in-memory SQLite driver).
    files: ['src/**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-imports': 'off' },
  },
];
