import {
  resolvePrivateRemoteAskMaxTokens,
  resolvePrivateRemoteAutoOrganizeMaxTokens,
  resolvePrivateRemoteMeetingDialogueMaxTokens,
  resolvePrivateRemoteSummaryMaxTokens,
} from '../private-remote/privateRemoteConstants';

describe('privateRemoteConstants', () => {
  it('returns higher caps than on-device defaults for balanced tier', () => {
    expect(resolvePrivateRemoteSummaryMaxTokens('balanced')).toBe(4096);
    expect(resolvePrivateRemoteAskMaxTokens('balanced')).toBe(1024);
    expect(resolvePrivateRemoteMeetingDialogueMaxTokens('balanced')).toBe(6144);
  });

  it('returns null for unlimited (omit max_tokens)', () => {
    expect(resolvePrivateRemoteSummaryMaxTokens('unlimited')).toBeNull();
    expect(resolvePrivateRemoteAskMaxTokens('unlimited')).toBeNull();
    expect(resolvePrivateRemoteMeetingDialogueMaxTokens('unlimited')).toBeNull();
  });

  it('scales auto-organize output above summary cap for large note sets', () => {
    expect(resolvePrivateRemoteAutoOrganizeMaxTokens('efficient', 53)).toBe(3608);
    expect(resolvePrivateRemoteAutoOrganizeMaxTokens('balanced', 5)).toBe(4096);
  });
});
