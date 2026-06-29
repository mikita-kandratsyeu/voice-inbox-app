const noop = () => {};

const presetFn = () => noop;

const systemPresets = new Proxy(
  {},
  {
    get: () => presetFn,
  },
);

systemPresets.Android = new Proxy(
  {},
  {
    get: () => presetFn,
  },
);

const Presets = new Proxy(
  { System: systemPresets },
  {
    get: (target, prop) => {
      if (prop === 'System') {
        return systemPresets;
      }
      return presetFn;
    },
  },
);

module.exports = {
  Presets,
  Settings: {
    preloadPresets: noop,
    enableHaptics: noop,
    stopHaptics: noop,
  },
  usePatternComposer: () => ({
    play: noop,
    parse: noop,
    stop: noop,
    isParsed: () => true,
  }),
  useRealtimeComposer: () => ({
    set: noop,
    playDiscrete: noop,
    stop: noop,
    isActive: () => false,
  }),
  useAdaptiveHaptics: () => ({
    play: noop,
  }),
  HapticSupport: {},
  RealtimeComposerStrategy: {},
};
