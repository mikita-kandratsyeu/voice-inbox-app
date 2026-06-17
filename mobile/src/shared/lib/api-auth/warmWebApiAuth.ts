import { getAuthHeaders } from './index';

/** Prefetch JWT after App Check is ready so parallel callers do not stampede `/api/token`. */
export async function warmWebApiAuth(): Promise<boolean> {
  try {
    await getAuthHeaders();
    return true;
  } catch {
    return false;
  }
}
