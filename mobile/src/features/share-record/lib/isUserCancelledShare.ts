export function isUserCancelledShare(err: unknown): boolean {
  return err instanceof Error && err.message === 'User did not share';
}
