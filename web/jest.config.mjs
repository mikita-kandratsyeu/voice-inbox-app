import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/'],
  collectCoverageFrom: ['lib/**/*.ts', 'app/**/*.ts', '!**/*.test.ts', '!**/__tests__/**'],
  coverageDirectory: 'coverage',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@voice-inbox/ai-job-core$': '<rootDir>/../packages/ai-job-core/src/index.ts',
  },
};

export default createJestConfig(config);
