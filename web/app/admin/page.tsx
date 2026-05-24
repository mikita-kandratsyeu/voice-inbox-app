import { getAdminSession } from '@/lib/admin-session';

import { AdminDashboard } from './AdminDashboard';
import { AdminLogin } from './AdminLogin';

export default async function AdminPage() {
  const dbConfigured = !!process.env.DATABASE_URL?.trim();

  if (!dbConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 py-12">
        <div className="max-w-lg rounded-2xl border border-zinc-200/90 bg-white/90 p-8 shadow-lg shadow-zinc-950/5 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/90 dark:shadow-black/30">
          <h1 className="text-center text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Admin is not configured
          </h1>
          <p className="mt-3 text-center text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Set{' '}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
              DATABASE_URL
            </code>{' '}
            (Neon), run{' '}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
              yarn db:push
            </code>{' '}
            and{' '}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
              yarn db:seed
            </code>{' '}
            with{' '}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
              ADMIN_SEED_LOGIN
            </code>{' '}
            /{' '}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-800">
              ADMIN_SEED_PASSWORD
            </code>
            .
          </p>
        </div>
      </div>
    );
  }

  const session = await getAdminSession();
  const isAdmin = session !== null;

  if (isAdmin) {
    return <AdminDashboard adminLogin={session.login} />;
  }
  return <AdminLogin />;
}
