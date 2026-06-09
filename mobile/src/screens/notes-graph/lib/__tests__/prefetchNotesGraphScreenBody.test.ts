import { loadNotesGraphScreenBodyModule } from '../notesGraphScreenBodyLoader';
import {
  getPrefetchedNotesGraphScreenBody,
  prefetchNotesGraphScreenBody,
  releaseNotesGraphScreenBodyPrefetch,
} from '../prefetchNotesGraphScreenBody';

const mockScreenBody = jest.fn();

jest.mock('../notesGraphScreenBodyLoader', () => ({
  loadNotesGraphScreenBodyModule: jest.fn(),
}));

describe('prefetchNotesGraphScreenBody', () => {
  beforeEach(() => {
    releaseNotesGraphScreenBodyPrefetch();
    jest.mocked(loadNotesGraphScreenBodyModule).mockResolvedValue({
      NotesGraphScreenBody: mockScreenBody,
    } as Awaited<ReturnType<typeof loadNotesGraphScreenBodyModule>>);
  });

  it('returns null before prefetch completes', () => {
    expect(getPrefetchedNotesGraphScreenBody()).toBeNull();
  });

  it('caches the prefetched screen body module', async () => {
    const first = await prefetchNotesGraphScreenBody();
    const second = await prefetchNotesGraphScreenBody();

    expect(second).toBe(first);
    expect(getPrefetchedNotesGraphScreenBody()).toBe(mockScreenBody);
    expect(loadNotesGraphScreenBodyModule).toHaveBeenCalledTimes(1);
  });

  it('clears cached module on release', async () => {
    await prefetchNotesGraphScreenBody();
    expect(getPrefetchedNotesGraphScreenBody()).not.toBeNull();

    releaseNotesGraphScreenBodyPrefetch();

    expect(getPrefetchedNotesGraphScreenBody()).toBeNull();
  });
});
