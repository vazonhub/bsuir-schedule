/**
 * Jest configuration for unit tests.
 *
 * Uses the official `jest-expo` preset so Expo/React Native modules are
 * transformed and mocked correctly. Import aliases (`@utils/…`, `@theme`, …)
 * resolve through the babel `module-resolver` plugin in `babel.config.js`,
 * which is the single source of truth for aliases — no duplication here.
 *
 * Scope: unit tests of the core logic under `src/utils`.
 */
module.exports = {
  preset: 'jest-expo',
  // Only pick up files that opt in via `.test.ts(x)` — keeps fixtures/helpers out.
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  clearMocks: true,
  // Coverage is collected for reporting only; no threshold gate (yet).
  collectCoverageFrom: ['src/utils/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
};
