jest.mock('react-native-nitro-sound', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('@/shared/lib/appLogger', () => ({
  diagWarn: jest.fn(),
}));

import type { PlayBackType } from 'react-native-nitro-sound';

import { AudioPlayerTransport, type NativeAudioPlayer } from '../audioPlayerTransport';

function createMockNativePlayer(): NativeAudioPlayer & {
  playbackListener: ((event: PlayBackType) => void) | null;
  calls: string[];
} {
  const mock = {
    playbackListener: null as ((event: PlayBackType) => void) | null,
    calls: [] as string[],
    setSubscriptionDuration(sec: number) {
      mock.calls.push(`setSubscriptionDuration:${sec}`);
    },
    addPlayBackListener(callback: (event: PlayBackType) => void) {
      mock.playbackListener = callback;
      mock.calls.push('addPlayBackListener');
    },
    removePlayBackListener() {
      mock.playbackListener = null;
      mock.calls.push('removePlayBackListener');
    },
    addPlaybackEndListener() {
      mock.calls.push('addPlaybackEndListener');
    },
    removePlaybackEndListener() {
      mock.calls.push('removePlaybackEndListener');
    },
    async startPlayer() {
      mock.calls.push('startPlayer');
    },
    async pausePlayer() {
      mock.calls.push('pausePlayer');
    },
    async resumePlayer() {
      mock.calls.push('resumePlayer');
    },
    async stopPlayer() {
      mock.calls.push('stopPlayer');
    },
    async seekToPlayer(ms: number) {
      mock.calls.push(`seekToPlayer:${ms}`);
    },
    async setPlaybackSpeed(speed: number) {
      mock.calls.push(`setPlaybackSpeed:${speed}`);
    },
  };

  return mock;
}

describe('AudioPlayerTransport', () => {
  it('serializes rapid play/pause into the final paused state', async () => {
    const native = createMockNativePlayer();
    let elapsedSecs = 0;
    let wantPlaying = false;

    const transport = new AudioPlayerTransport(
      {
        getAudioPath: () => '/audio.m4a',
        getTotalSeconds: () => 120,
        getPlaybackSpeed: () => 1,
        getElapsedSecs: () => elapsedSecs,
        isScrubbing: () => false,
        onPlaybackTick: () => {},
        onPlaybackEnded: () => {},
        onWantPlayingChanged: (playing) => {
          wantPlaying = playing;
        },
      },
      native,
    );

    transport.setPlaying(true);
    transport.setPlaying(false);

    await new Promise<void>((resolve) => {
      queueMicrotask(resolve);
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(wantPlaying).toBe(false);
    expect(native.calls).toContain('pausePlayer');
    expect(native.calls.filter((call) => call === 'resumePlayer').length).toBeLessThanOrEqual(1);
  });

  it('queues seek commands in order', async () => {
    const native = createMockNativePlayer();
    const transport = new AudioPlayerTransport(
      {
        getAudioPath: () => '/audio.m4a',
        getTotalSeconds: () => 120,
        getPlaybackSpeed: () => 1,
        getElapsedSecs: () => 0,
        isScrubbing: () => false,
        onPlaybackTick: () => {},
        onPlaybackEnded: () => {},
      },
      native,
    );

    await Promise.all([transport.seek(1000), transport.seek(2000), transport.seek(3000)]);

    const seekCalls = native.calls.filter((call) => call.startsWith('seekToPlayer:'));
    expect(seekCalls).toEqual(['seekToPlayer:1000', 'seekToPlayer:2000', 'seekToPlayer:3000']);
  });
});
