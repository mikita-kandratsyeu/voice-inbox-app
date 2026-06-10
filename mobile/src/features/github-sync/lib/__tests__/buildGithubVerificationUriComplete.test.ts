import { buildGithubVerificationUriComplete } from '../githubVerificationUri';

describe('buildGithubVerificationUriComplete', () => {
  it('uses verification_uri_complete when provided', () => {
    expect(
      buildGithubVerificationUriComplete(
        'https://github.com/login/device',
        'ABCD-1234',
        'https://github.com/login/device?user_code=ABCD-1234',
      ),
    ).toBe('https://github.com/login/device?user_code=ABCD-1234');
  });

  it('builds fallback url with encoded user code', () => {
    expect(buildGithubVerificationUriComplete('https://github.com/login/device', 'ABCD-1234')).toBe(
      'https://github.com/login/device?user_code=ABCD-1234',
    );
  });
});
