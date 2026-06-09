import { clearGraphSessionLayout } from '../graphSessionLayout';
import { clearNotesGraphLayoutCache } from '../notesGraphLayoutCache';
import { releaseNotesGraphScreenBodyPrefetch } from '../prefetchNotesGraphScreenBody';
import { unloadNotesGraphScreen } from '../unloadNotesGraphScreen';

jest.mock('../graphSessionLayout', () => ({
  clearGraphSessionLayout: jest.fn(),
}));

jest.mock('../notesGraphLayoutCache', () => ({
  clearNotesGraphLayoutCache: jest.fn(),
}));

jest.mock('../prefetchNotesGraphScreenBody', () => ({
  releaseNotesGraphScreenBodyPrefetch: jest.fn(),
}));

describe('unloadNotesGraphScreen', () => {
  it('clears session layout, cache, and prefetch state', () => {
    unloadNotesGraphScreen();

    expect(clearGraphSessionLayout).toHaveBeenCalledTimes(1);
    expect(clearNotesGraphLayoutCache).toHaveBeenCalledTimes(1);
    expect(releaseNotesGraphScreenBodyPrefetch).toHaveBeenCalledTimes(1);
  });
});
