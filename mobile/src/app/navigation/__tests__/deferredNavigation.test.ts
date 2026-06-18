import { useAppLockStore } from '@/entities/app-lock';

import {
  flushDeferredNavigation,
  resetDeferredNavigationForTests,
  runNavigationWhenUnlocked,
} from '../deferredNavigation';
import { navigationRef } from '../navigationRef';

jest.mock('../navigationRef', () => ({
  navigationRef: {
    isReady: jest.fn(),
    navigate: jest.fn(),
  },
}));

jest.mock('@/entities/app-lock', () => ({
  useAppLockStore: {
    getState: jest.fn(),
  },
}));

const mockIsReady = jest.mocked(navigationRef.isReady);
const mockNavigate = jest.mocked(navigationRef.navigate);
const mockGetState = jest.mocked(useAppLockStore.getState);

describe('deferredNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetDeferredNavigationForTests();
    mockIsReady.mockReturnValue(true);
    mockGetState.mockReturnValue({
      isEnabled: false,
      isLocked: false,
    } as ReturnType<typeof useAppLockStore.getState>);
  });

  it('runs navigation immediately when unlocked and ready', () => {
    runNavigationWhenUnlocked(() => {
      navigationRef.navigate('RecordModal');
    });

    expect(mockNavigate).toHaveBeenCalledWith('RecordModal');
  });

  it('defers navigation while app lock is active', () => {
    mockGetState.mockReturnValue({
      isEnabled: true,
      isLocked: true,
    } as ReturnType<typeof useAppLockStore.getState>);

    runNavigationWhenUnlocked(() => {
      navigationRef.navigate('RecordingDetail', { record: { id: 'r1' } as never });
    });

    expect(mockNavigate).not.toHaveBeenCalled();

    mockGetState.mockReturnValue({
      isEnabled: true,
      isLocked: false,
    } as ReturnType<typeof useAppLockStore.getState>);

    flushDeferredNavigation();

    expect(mockNavigate).toHaveBeenCalledWith('RecordingDetail', { record: { id: 'r1' } });
  });

  it('defers navigation until navigation container is ready', () => {
    mockIsReady.mockReturnValue(false);

    runNavigationWhenUnlocked(() => {
      navigationRef.navigate('AllTasks');
    });

    expect(mockNavigate).not.toHaveBeenCalled();

    mockIsReady.mockReturnValue(true);
    flushDeferredNavigation();

    expect(mockNavigate).toHaveBeenCalledWith('AllTasks');
  });
});
