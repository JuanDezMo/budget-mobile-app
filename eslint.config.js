// ESLint flat config.
// Base: eslint-config-expo (React, React Hooks, TypeScript parser, import rules).
// On top: typed linting rules that enforce the "no any" policy and i18n rules
// from docs/CLAUDE.md. Every custom rule is an error, never a warning.
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const i18next = require('eslint-plugin-i18next');
const architecture = require('./architecture.eslint.js');
const prettierConfig = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  globalIgnores([
    'node_modules/**',
    '.expo/**',
    'dist/**',
    'android/**',
    'ios/**',
    '.impeccable/**',
    'expo-env.d.ts',
  ]),
  expoConfig,
  ...architecture,
  {
    // Config files run in Node (CommonJS), not in the app.
    files: ['*.config.js', 'architecture.eslint.js'],
    languageOptions: {
      globals: { __dirname: 'readonly', module: 'writable', require: 'readonly' },
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        // Typed linting: rules can read TypeScript types through tsconfig.json.
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    // User-facing text must come from src/core/i18n/locales/{es,en}.json.
    files: ['src/**/*.tsx'],
    plugins: { i18next },
    rules: {
      'i18next/no-literal-string': [
        'error',
        {
          mode: 'jsx-only',
          'jsx-attributes': {
            // Props that hold identifiers or config values, not visible text.
            exclude: [
              'className',
              'style',
              'type',
              'key',
              'id',
              'testID',
              'accessibilityRole',
              'role',
              'nativeID',
              'name',
              'href',
              'keyboardType',
              'autoCapitalize',
              'autoComplete',
              'textContentType',
              'returnKeyType',
              'resizeMode',
              'pointerEvents',
            ],
          },
        },
      ],
    },
  },
  {
    // Tests use ids and test data in JSX props; they are not user-facing text.
    files: ['src/**/*.test.tsx', 'src/__tests__/**/*.tsx'],
    rules: { 'i18next/no-literal-string': 'off' },
  },
  // Last: turn off any rule that would fight with Prettier's formatting.
  prettierConfig,
]);
