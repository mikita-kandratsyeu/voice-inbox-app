class ReactNativeFirebaseAppCheckProvider {
  configure() {}
}

module.exports = {
  getToken: jest.fn(async () => ({ token: 'mock-app-check-token' })),
  initializeAppCheck: jest.fn(async () => ({})),
  ReactNativeFirebaseAppCheckProvider,
  default: ReactNativeFirebaseAppCheckProvider,
};
