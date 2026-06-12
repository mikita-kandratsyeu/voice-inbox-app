export type GitlabDeviceFlowChallenge = {
  userCode: string;
  verificationUri: string;
  verificationUriComplete: string;
};

/** GitLab supports verification_uri_complete with user_code in the query string. */
export function buildGitlabVerificationUriComplete(
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

export function toGitlabDeviceFlowChallenge(input: {
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
}): GitlabDeviceFlowChallenge {
  return {
    userCode: input.user_code,
    verificationUri: input.verification_uri,
    verificationUriComplete: buildGitlabVerificationUriComplete(
      input.verification_uri,
      input.user_code,
      input.verification_uri_complete,
    ),
  };
}
