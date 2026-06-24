/**
 * Tests target the pure, framework-free logic (generators, RNG, scoring).
 * These modules never import React Native, so ts-jest runs them directly
 * with a CommonJS override — fast and free of the RN/babel transform chain.
 */
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
  },
};
