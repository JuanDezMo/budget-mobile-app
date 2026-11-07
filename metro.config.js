// Metro (React Native bundler) configuration.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Kysely's "kysely/migration" entry also exports FileMigrationProvider, which uses a dynamic
// `import()`. Hermes (the JS engine on the phone) cannot compile that, and the export fails.
// We only need the Migrator, so on the device we load its file directly. Jest and TypeScript
// keep using the normal "kysely/migration" entry.
const kyselyMigrator = path.resolve(__dirname, 'node_modules/kysely/dist/migration/migrator.js');
const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'kysely/migration') {
    return { type: 'sourceFile', filePath: kyselyMigrator };
  }

  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
