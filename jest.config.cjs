module.exports = {
  preset: 'jest-expo',
  // Do not depend on a system watchman install (a broken Homebrew watchman crashed Jest on the Mac).
  watchman: false,
  setupFilesAfterEnv: ['<rootDir>/scripts/jest-setup.ts'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.[jt]s?(x)'],
  collectCoverageFrom: ['src/content/**/*.ts', 'src/design/**/*.{ts,tsx}', 'src/screens/**/*.tsx'],
};
