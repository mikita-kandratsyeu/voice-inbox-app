import {
  buildGithubVerificationUriComplete,
  toGithubDeviceFlowChallenge,
} from '../githubVerificationUri';

describe('toGithubDeviceFlowChallenge', () => {
  it('maps GitHub device code response fields', () => {
    expect(
      toGithubDeviceFlowChallenge({
        user_code: 'WDJB-MJHT',
        verification_uri: 'https://github.com/login/device',
        verification_uri_complete: 'https://github.com/login/device?user_code=WDJB-MJHT',
      }),
    ).toEqual({
      userCode: 'WDJB-MJHT',
      verificationUri: 'https://github.com/login/device',
      verificationUriComplete: 'https://github.com/login/device?user_code=WDJB-MJHT',
    });
  });

  it('builds verificationUriComplete when GitHub omits it', () => {
    const challenge = toGithubDeviceFlowChallenge({
      user_code: 'ABCD-1234',
      verification_uri: 'https://github.com/login/device',
    });

    expect(challenge.verificationUriComplete).toBe(
      buildGithubVerificationUriComplete('https://github.com/login/device', 'ABCD-1234'),
    );
  });
});
