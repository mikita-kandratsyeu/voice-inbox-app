export type GithubDeviceFlowChallenge = {
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
};

/** GitHub does not pre-fill device codes from URL query params (by design). */
export function buildGithubVerificationUriComplete(
  verificationUri: string,
  userCode: string,
  verificationUriComplete?: string,
): string {
  if (verificationUriComplete) {
    return verificationUriComplete;
  }
  const separator = verificationUri.includes('?') ? '&' : '?';
  return `${verificationUri}${separator}user_code=${encodeURIComponent(userCode)}`;
}

export function toGithubDeviceFlowChallenge(input: {
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
}): GithubDeviceFlowChallenge {
  return {
    userCode: input.user_code,
    verificationUri: input.verification_uri,
    verificationUriComplete: buildGithubVerificationUriComplete(
      input.verification_uri,
      input.user_code,
      input.verification_uri_complete,
    ),
  };
}
