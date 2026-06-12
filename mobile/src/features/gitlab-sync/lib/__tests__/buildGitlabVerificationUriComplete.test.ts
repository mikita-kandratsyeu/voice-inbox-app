import { buildGitlabVerificationUriComplete } from '../gitlabVerificationUri';

describe('buildGitlabVerificationUriComplete', () => {
  it('uses verification_uri_complete when provided', () => {
    expect(
      buildGitlabVerificationUriComplete(
        'https://gitlab.com/login/device',
        'ABCD-1234',
        'https://gitlab.com/login/device?user_code=ABCD-1234',
      ),
    ).toBe('https://gitlab.com/login/device?user_code=ABCD-1234');
  });

  it('builds fallback url with encoded user code', () => {
    expect(buildGitlabVerificationUriComplete('https://gitlab.com/login/device', 'ABCD-1234')).toBe(
      'https://gitlab.com/login/device?user_code=ABCD-1234',
    );
  });
});
