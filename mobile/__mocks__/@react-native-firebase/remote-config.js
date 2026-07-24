const remoteConfigInstance = {
  settings: {},
  defaultConfig: {},
};

module.exports = {
  fetchAndActivate: jest.fn(async () => true),
  getRemoteConfig: jest.fn(() => remoteConfigInstance),
  getValue: jest.fn(() => ({ asString: () => '', asBoolean: () => false, asNumber: () => 0 })),
  setConfigSettings: jest.fn(),
  setDefaults: jest.fn(),
};
