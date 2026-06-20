module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-css-interop|nativewind|lucide-react-native|react-native-svg)/)',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.test.{ts,tsx}', '!src/**/__tests__/**'],
  coverageDirectory: 'coverage',
  moduleNameMapper: {
    '^react-native-worklets$': '<rootDir>/__mocks__/react-native-worklets.js',
    '^react-native-in-app-review$': '<rootDir>/__mocks__/react-native-in-app-review.js',
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@entities/(.*)$': '<rootDir>/src/entities/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
    '^@widgets/(.*)$': '<rootDir>/src/widgets/$1',
  },
};
