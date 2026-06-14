import {
  REMOTE_SYNC_BASE_TIMEOUT_MS,
  REMOTE_SYNC_DEFAULT_CONCURRENCY,
  REMOTE_SYNC_MAX_CONCURRENCY,
  REMOTE_SYNC_MAX_TIMEOUT_MS,
  REMOTE_SYNC_MIN_CONCURRENCY,
  REMOTE_SYNC_PER_FILE_TIMEOUT_MS,
} from '../constants';
import { calculateOptimalConcurrency, calculateSyncTimeout } from '../syncOptimization';

describe('syncOptimization', () => {
  describe('calculateOptimalConcurrency', () => {
    it('should return minimum concurrency for zero files', () => {
      expect(calculateOptimalConcurrency(0)).toBe(REMOTE_SYNC_MIN_CONCURRENCY);
    });

    it('should return minimum concurrency for negative files', () => {
      expect(calculateOptimalConcurrency(-5)).toBe(REMOTE_SYNC_MIN_CONCURRENCY);
    });

    it('should return minimum concurrency for small file counts (1-5)', () => {
      expect(calculateOptimalConcurrency(1)).toBe(REMOTE_SYNC_MIN_CONCURRENCY);
      expect(calculateOptimalConcurrency(3)).toBe(REMOTE_SYNC_MIN_CONCURRENCY);
      expect(calculateOptimalConcurrency(5)).toBe(REMOTE_SYNC_MIN_CONCURRENCY);
    });

    it('should return default concurrency for medium file counts (6-20)', () => {
      expect(calculateOptimalConcurrency(6)).toBe(REMOTE_SYNC_DEFAULT_CONCURRENCY);
      expect(calculateOptimalConcurrency(10)).toBe(REMOTE_SYNC_DEFAULT_CONCURRENCY);
      expect(calculateOptimalConcurrency(20)).toBe(REMOTE_SYNC_DEFAULT_CONCURRENCY);
    });

    it('should scale concurrency for larger file counts', () => {
      expect(calculateOptimalConcurrency(30)).toBe(3);
      expect(calculateOptimalConcurrency(50)).toBe(5);
      expect(calculateOptimalConcurrency(70)).toBe(7);
    });

    it('should cap at maximum concurrency', () => {
      expect(calculateOptimalConcurrency(100)).toBe(REMOTE_SYNC_MAX_CONCURRENCY);
      expect(calculateOptimalConcurrency(200)).toBe(REMOTE_SYNC_MAX_CONCURRENCY);
      expect(calculateOptimalConcurrency(1000)).toBe(REMOTE_SYNC_MAX_CONCURRENCY);
    });

    it('should follow scaling formula: ceil(fileCount / 10) for files > 20', () => {
      expect(calculateOptimalConcurrency(21)).toBe(Math.ceil(21 / 10));
      expect(calculateOptimalConcurrency(35)).toBe(Math.ceil(35 / 10));
      expect(calculateOptimalConcurrency(55)).toBe(Math.ceil(55 / 10));
    });
  });

  describe('calculateSyncTimeout', () => {
    it('should return base timeout for zero files', () => {
      expect(calculateSyncTimeout(0)).toBe(REMOTE_SYNC_BASE_TIMEOUT_MS);
    });

    it('should return base timeout for negative files', () => {
      expect(calculateSyncTimeout(-5)).toBe(REMOTE_SYNC_BASE_TIMEOUT_MS);
    });

    it('should scale linearly with file count', () => {
      const fileCount = 10;
      const expected = REMOTE_SYNC_BASE_TIMEOUT_MS + fileCount * REMOTE_SYNC_PER_FILE_TIMEOUT_MS;
      expect(calculateSyncTimeout(fileCount)).toBe(expected);
    });

    it('should calculate timeout correctly for various file counts', () => {
      expect(calculateSyncTimeout(1)).toBe(REMOTE_SYNC_BASE_TIMEOUT_MS + 1 * 2000);
      expect(calculateSyncTimeout(5)).toBe(REMOTE_SYNC_BASE_TIMEOUT_MS + 5 * 2000);
      expect(calculateSyncTimeout(50)).toBe(REMOTE_SYNC_BASE_TIMEOUT_MS + 50 * 2000);
    });

    it('should cap at maximum timeout', () => {
      const largeFileCount = 1000;
      expect(calculateSyncTimeout(largeFileCount)).toBe(REMOTE_SYNC_MAX_TIMEOUT_MS);
    });

    it('should respect max timeout for extremely large file counts', () => {
      expect(calculateSyncTimeout(10000)).toBe(REMOTE_SYNC_MAX_TIMEOUT_MS);
      expect(calculateSyncTimeout(Number.MAX_SAFE_INTEGER)).toBe(REMOTE_SYNC_MAX_TIMEOUT_MS);
    });

    it('should reach max timeout at expected file count', () => {
      const filesAtMax =
        (REMOTE_SYNC_MAX_TIMEOUT_MS - REMOTE_SYNC_BASE_TIMEOUT_MS) /
        REMOTE_SYNC_PER_FILE_TIMEOUT_MS;
      expect(calculateSyncTimeout(filesAtMax)).toBe(REMOTE_SYNC_MAX_TIMEOUT_MS);
      expect(calculateSyncTimeout(filesAtMax + 1)).toBe(REMOTE_SYNC_MAX_TIMEOUT_MS);
    });
  });

  describe('integration scenarios', () => {
    it('should provide reasonable values for typical use cases', () => {
      const smallSync = 3;
      expect(calculateOptimalConcurrency(smallSync)).toBe(2);
      expect(calculateSyncTimeout(smallSync)).toBe(66_000);

      const mediumSync = 15;
      expect(calculateOptimalConcurrency(mediumSync)).toBe(4);
      expect(calculateSyncTimeout(mediumSync)).toBe(90_000);

      const largeSync = 100;
      expect(calculateOptimalConcurrency(largeSync)).toBe(8);
      expect(calculateSyncTimeout(largeSync)).toBe(260_000);
    });

    it('should handle edge case transitions smoothly', () => {
      expect(calculateOptimalConcurrency(5)).toBe(2);
      expect(calculateOptimalConcurrency(6)).toBe(4);

      expect(calculateOptimalConcurrency(20)).toBe(4);
      expect(calculateOptimalConcurrency(21)).toBe(3);
      expect(calculateOptimalConcurrency(30)).toBe(3);
    });
  });
});
