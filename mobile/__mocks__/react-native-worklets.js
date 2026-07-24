function runOnRuntimeAsync(_runtime, worklet, ...args) {
  return Promise.resolve(worklet(...args));
}

module.exports = {
  createWorkletRuntime: jest.fn(() => ({
    name: 'mock-graph-layout',
    runtimeId: 1,
  })),
  runOnRuntimeAsync: jest.fn(runOnRuntimeAsync),
  scheduleOnRN: jest.fn((fn, ...args) => {
    fn(...args);
  }),
};
