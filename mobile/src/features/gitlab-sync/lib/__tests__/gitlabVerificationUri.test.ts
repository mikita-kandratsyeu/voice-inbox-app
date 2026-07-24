import {
  buildGitlabVerificationUriComplete,
  toGitlabDeviceFlowChallenge,
} from '../gitlabVerificationUri';

describe('toGitlabDeviceFlowChallenge', () => {
  it('maps GitHub device code response fields', () => {
    expect(
      toGitlabDeviceFlowChallenge({
        user_code: 'WDJB-MJHT',
        verification_uri: 'https://gitlab.com/login/device',
        verification_uri_complete: 'https://gitlab.com/login/device?user_code=WDJB-MJHT',
      }),
    ).toEqual({
      userCode: 'WDJB-MJHT',
      verificationUri: 'https://gitlab.com/login/device',
      verificationUriComplete: 'https://gitlab.com/login/device?user_code=WDJB-MJHT',
    });
  });

  it('builds verificationUriComplete when GitHub omits it', () => {
    const challenge = toGitlabDeviceFlowChallenge({
      user_code: 'ABCD-1234',
      verification_uri: 'https://gitlab.com/login/device',
    });

    expect(challenge.verificationUriComplete).toBe(
      buildGitlabVerificationUriComplete('https://gitlab.com/login/device', 'ABCD-1234'),
    );
  });
});
