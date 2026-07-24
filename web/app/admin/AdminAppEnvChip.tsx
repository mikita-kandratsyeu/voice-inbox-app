import type { AppEnv } from '@/lib/app-env';

import { AdminStatusBadge } from './admin-ui';

function appEnvTone(env: AppEnv): 'success' | 'warning' | 'info' {
  if (env === 'development') return 'warning';
  if (env === 'preview') return 'info';
  return 'success';
}

export function AdminAppEnvChip({ env }: { env: AppEnv }) {
  return (
    <AdminStatusBadge tone={appEnvTone(env)}>
      <span className="font-mono text-[10px] tracking-wide uppercase opacity-80">APP_ENV</span>
      <span className="font-mono">{env}</span>
    </AdminStatusBadge>
  );
}
