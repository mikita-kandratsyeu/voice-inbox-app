import AudioRecorderPlayer, { type PlayBackType } from 'react-native-nitro-sound';

import { diagWarn } from '@/shared/lib/appLogger';

export const PLAYBACK_SUBSCRIPTION_SEC = 0.1;

export type NativeAudioPlayer = {
  setSubscriptionDuration: (sec: number) => void;
  addPlayBackListener: (callback: (e: PlayBackType) => void) => void;
  removePlayBackListener: () => void;
  addPlaybackEndListener: (callback: () => void) => void;
  removePlaybackEndListener: () => void;
  startPlayer: (uri: string, audioSet?: Record<string, string>) => Promise<unknown>;
  pausePlayer: () => Promise<unknown>;
  resumePlayer: () => Promise<unknown>;
  stopPlayer: () => Promise<unknown>;
  seekToPlayer: (ms: number) => Promise<unknown>;
  setPlaybackSpeed: (speed: number) => Promise<unknown>;
};

export type AudioPlayerTransportDeps = {
  getAudioPath: () => string | undefined;
  getTotalSeconds: () => number;
  getPlaybackSpeed: () => number;
  getElapsedSecs: () => number;
  isScrubbing: () => boolean;
  onPlaybackTick: (positionMs: number) => void;
  onPlaybackEnded: () => void;
  onWantPlayingChanged?: (playing: boolean) => void;
};

type SeekTask = {
  ms: number;
  resolve: () => void;
  reject: (error: unknown) => void;
};

export class AudioPlayerTransport {
  private readonly deps: AudioPlayerTransportDeps;

  private readonly nativePlayer: NativeAudioPlayer;

  private listenersAttached = false;

  private isLoaded = false;

  private wantPlaying = false;

  private transportGen = 0;

  private transportRunning = false;

  private seekChain: Promise<void> = Promise.resolve();

  private seekQueue: SeekTask[] = [];

  private seekWorkerRunning = false;

  constructor(
    deps: AudioPlayerTransportDeps,
    nativePlayer: NativeAudioPlayer = AudioRecorderPlayer,
  ) {
    this.deps = deps;
    this.nativePlayer = nativePlayer;
  }

  getIsLoaded(): boolean {
    return this.isLoaded;
  }

  getWantPlaying(): boolean {
    return this.wantPlaying;
  }

  togglePlaying(): boolean {
    this.wantPlaying = !this.wantPlaying;
    this.scheduleTransport();
    return this.wantPlaying;
  }

  setPlaying(wantPlaying: boolean): boolean {
    this.wantPlaying = wantPlaying;
    this.scheduleTransport();
    return this.wantPlaying;
  }

  async stopAndReset(): Promise<void> {
    this.wantPlaying = false;
    this.transportGen += 1;
    await this.runStopAndReset();
  }

  seek(ms: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.seekQueue.push({ ms, resolve, reject });
      void this.pumpSeekQueue();
    });
  }

  async pauseForScrub(): Promise<void> {
    if (!this.wantPlaying) return;
    this.wantPlaying = false;
    try {
      await this.nativePlayer.pausePlayer();
      this.removePlaybackListeners();
    } catch (error) {
      diagWarn('[AudioPlayerTransport] pause for scrub failed:', error);
      throw error;
    }
  }

  async resumeAfterScrub(): Promise<void> {
    if (!this.isLoaded) return;
    this.wantPlaying = true;
    try {
      this.ensurePlaybackListeners();
      await this.nativePlayer.resumePlayer();
      void this.nativePlayer.setPlaybackSpeed(this.deps.getPlaybackSpeed());
    } catch (error) {
      diagWarn('[AudioPlayerTransport] resume after scrub failed:', error);
      this.wantPlaying = false;
      throw error;
    }
  }

  async startAtSecs(startSecs: number): Promise<void> {
    const audioPath = this.deps.getAudioPath();
    if (!audioPath) return;

    try {
      this.nativePlayer.setSubscriptionDuration(PLAYBACK_SUBSCRIPTION_SEC);
      this.ensurePlaybackListeners();

      await this.nativePlayer.startPlayer(audioPath, {
        AVAudioSessionCategoryKey: 'AVAudioSessionCategoryPlayback',
        AVAudioSessionModeKey: 'AVAudioSessionModeDefault',
        AVAudioSessionCategoryOptionKey: 'AVAudioSessionCategoryOptionDefaultToSpeaker',
      });

      await this.nativePlayer.setPlaybackSpeed(this.deps.getPlaybackSpeed());

      if (startSecs > 0) {
        await this.nativePlayer.seekToPlayer(startSecs * 1000);
      }

      this.isLoaded = true;
      this.wantPlaying = true;
    } catch (error) {
      diagWarn('[AudioPlayerTransport] startPlayer failed:', error);
      this.wantPlaying = false;
      this.deps.onWantPlayingChanged?.(false);
      throw error;
    }
  }

  setPlaybackSpeed(speed: number): void {
    if (!this.isLoaded || !this.wantPlaying) return;
    void this.nativePlayer.setPlaybackSpeed(speed).catch(() => {});
  }

  dispose(): void {
    this.transportGen += 1;
    this.wantPlaying = false;
    this.removePlaybackListeners();
    void this.nativePlayer.stopPlayer().catch(() => {});
    this.isLoaded = false;
    this.seekQueue = [];
  }

  private scheduleTransport(): void {
    this.transportGen += 1;
    const generation = this.transportGen;
    queueMicrotask(() => {
      void this.runTransport(generation);
    });
  }

  private async runTransport(generation: number): Promise<void> {
    if (this.transportRunning) return;

    this.transportRunning = true;
    try {
      let activeGen = generation;
      do {
        activeGen = this.transportGen;
        await this.applyWantPlaying(activeGen);
      } while (activeGen !== this.transportGen);
    } finally {
      this.transportRunning = false;
      if (generation !== this.transportGen) {
        void this.runTransport(this.transportGen);
      }
    }
  }

  private async applyWantPlaying(generation: number): Promise<void> {
    const audioPath = this.deps.getAudioPath();
    if (!audioPath) return;

    const totalSeconds = this.deps.getTotalSeconds();
    const wantPlaying = this.wantPlaying;

    try {
      if (wantPlaying) {
        if (this.transportGen !== generation) return;

        if (this.deps.getElapsedSecs() >= totalSeconds && totalSeconds > 0) {
          await this.runStopAndReset();
          if (this.transportGen !== generation) return;
          await this.startAtSecs(0);
          return;
        }

        if (this.isLoaded) {
          this.ensurePlaybackListeners();
          await this.nativePlayer.resumePlayer();
          if (this.transportGen !== generation) return;
          void this.nativePlayer.setPlaybackSpeed(this.deps.getPlaybackSpeed());
        } else {
          await this.startAtSecs(this.deps.getElapsedSecs());
        }
        return;
      }

      if (this.transportGen !== generation) return;
      await this.nativePlayer.pausePlayer();
    } catch (error) {
      diagWarn('[AudioPlayerTransport] transport failed:', error);
      this.wantPlaying = !wantPlaying;
      this.deps.onWantPlayingChanged?.(this.wantPlaying);
      throw error;
    }
  }

  private async runStopAndReset(): Promise<void> {
    try {
      this.removePlaybackListeners();
      await this.nativePlayer.stopPlayer();
    } catch (error) {
      diagWarn('[AudioPlayerTransport] stopPlayer failed:', error);
    }
    this.isLoaded = false;
    this.wantPlaying = false;
  }

  private async pumpSeekQueue(): Promise<void> {
    if (this.seekWorkerRunning) return;

    this.seekWorkerRunning = true;
    while (this.seekQueue.length > 0) {
      const task = this.seekQueue.shift();
      if (!task) break;

      try {
        await this.nativePlayer.seekToPlayer(task.ms);
        task.resolve();
      } catch (error) {
        diagWarn('[AudioPlayerTransport] seekToPlayer failed:', error);
        task.reject(error);
      }
    }
    this.seekWorkerRunning = false;
  }

  private removePlaybackListeners(): void {
    this.nativePlayer.removePlayBackListener();
    this.nativePlayer.removePlaybackEndListener();
    this.listenersAttached = false;
  }

  private ensurePlaybackListeners(): void {
    if (this.listenersAttached) return;

    this.nativePlayer.addPlayBackListener((event: PlayBackType) => {
      if (this.deps.isScrubbing() || !this.wantPlaying) return;
      this.deps.onPlaybackTick(event.currentPosition);
    });

    this.nativePlayer.addPlaybackEndListener(() => {
      if (this.deps.isScrubbing()) return;
      this.removePlaybackListeners();
      this.wantPlaying = false;
      this.deps.onWantPlayingChanged?.(false);
      this.deps.onPlaybackEnded();
    });

    this.listenersAttached = true;
  }
}
