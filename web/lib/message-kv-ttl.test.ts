import { MESSAGE_TTL_MIN_SECONDS, MESSAGE_TTL_SECONDS } from '../config/constants';
import { clampMessageTtlSeconds } from './message-kv-ttl';

describe('clampMessageTtlSeconds', () => {
  it('defaults to max when missing', () => {
    expect(clampMessageTtlSeconds(undefined)).toBe(MESSAGE_TTL_SECONDS);
    expect(clampMessageTtlSeconds('')).toBe(MESSAGE_TTL_SECONDS);
  });

  it('clamps to configured bounds', () => {
    expect(clampMessageTtlSeconds(60)).toBe(MESSAGE_TTL_MIN_SECONDS);
    expect(clampMessageTtlSeconds(999_999)).toBe(MESSAGE_TTL_SECONDS);
    expect(clampMessageTtlSeconds('1800')).toBe(1800);
  });
});
