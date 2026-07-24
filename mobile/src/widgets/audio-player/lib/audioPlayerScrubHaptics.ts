import { hapticLight, hapticPlaybackMarkCrossed, hapticSelection } from '@/shared/lib';

export class AudioPlayerScrubHapticFeedback {
  private lastSec = -1;
  private crossedMarks = new Set<number>();

  constructor(private readonly markOffsetsMs: readonly number[]) {}

  resetAt(positionMs: number) {
    this.lastSec = Math.floor(positionMs / 1000);
    this.crossedMarks.clear();
    for (let index = 0; index < this.markOffsetsMs.length; index += 1) {
      if (this.markOffsetsMs[index] <= positionMs) {
        this.crossedMarks.add(index);
      }
    }
  }

  onStart(positionMs: number) {
    hapticLight();
    this.resetAt(positionMs);
  }

  onMove(positionMs: number, prevPositionMs: number) {
    const sec = Math.floor(positionMs / 1000);
    if (sec !== this.lastSec) {
      hapticSelection();
      this.lastSec = sec;
    }

    if (positionMs > prevPositionMs) {
      for (let index = 0; index < this.markOffsetsMs.length; index += 1) {
        if (this.crossedMarks.has(index)) continue;
        const markMs = this.markOffsetsMs[index];
        if (prevPositionMs < markMs && positionMs >= markMs) {
          this.crossedMarks.add(index);
          hapticPlaybackMarkCrossed();
        }
      }
      return;
    }

    if (positionMs < prevPositionMs) {
      for (let index = 0; index < this.markOffsetsMs.length; index += 1) {
        if (this.markOffsetsMs[index] >= positionMs) {
          this.crossedMarks.delete(index);
        }
      }
    }
  }

  onEnd() {
    hapticLight();
  }
}
