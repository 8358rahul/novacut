const { defineConfig } = require('eslint/config');
const expo = require('eslint-config-expo/flat');
module.exports = defineConfig([
  expo,
  { ignores: ['docs/**', 'engine/**', 'rea_apk/**', 'modules/**', 'tests/**'] },
]);
