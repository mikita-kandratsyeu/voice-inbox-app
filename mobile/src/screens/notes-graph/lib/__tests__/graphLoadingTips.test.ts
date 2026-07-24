import { NOTES_GRAPH_LOADING_TIP_KEYS, pickRandomGraphLoadingTipIndex } from '../graphLoadingTips';

describe('pickRandomGraphLoadingTipIndex', () => {
  afterEach(() => {
    jest.spyOn(Math, 'random').mockRestore();
  });

  it('maps random values into tip index range', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    expect(pickRandomGraphLoadingTipIndex()).toBe(NOTES_GRAPH_LOADING_TIP_KEYS.length - 1);

    jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(pickRandomGraphLoadingTipIndex()).toBe(0);
  });
});
