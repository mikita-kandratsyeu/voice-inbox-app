module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|react-native-css-interop|nativewind|lucide-react-native|react-native-svg)/)',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.test.{ts,tsx}', '!src/**/__tests__/**'],
  coverageDirectory: 'coverage',
  moduleNameMapper: {
    '^@react-native-firebase/app$': '<rootDir>/__mocks__/@react-native-firebase/app.js',
    '^@react-native-firebase/app-check$': '<rootDir>/__mocks__/@react-native-firebase/app-check.js',
    '^@react-native-firebase/app-check/dist/module/ReactNativeFirebaseAppCheckProvider$':
      '<rootDir>/__mocks__/@react-native-firebase/app-check.js',
    '^@react-native-firebase/remote-config$':
      '<rootDir>/__mocks__/@react-native-firebase/remote-config.js',
    '^react-native-worklets$': '<rootDir>/__mocks__/react-native-worklets.js',
    '^react-native-nitro-haptics$': '<rootDir>/__mocks__/react-native-nitro-haptics.js',
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
