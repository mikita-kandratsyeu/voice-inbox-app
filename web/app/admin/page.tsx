import { isAdminPageSession } from '@/lib/admin-auth';

import { AdminDashboard } from './AdminDashboard';
import { AdminLogin } from './AdminLogin';

export default async function AdminPage() {
  const dbConfigured = !!process.env.DATABASE_URL?.trim();

  if (!dbConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="max-w-md text-center text-zinc-500">
          Admin is not configured. Set <code className="text-sm">DATABASE_URL</code> (Neon), run{' '}
          <code className="text-sm">yarn db:push</code> and{' '}
          <code className="text-sm">yarn db:seed</code> with{' '}
          <code className="text-sm">ADMIN_SEED_LOGIN</code> /{' '}
          <code className="text-sm">ADMIN_SEED_PASSWORD</code>.
        </p>
      </div>
    );
  }

  const isAdmin = await isAdminPageSession();

  if (isAdmin) {
    return <AdminDashboard />;
  }
  return <AdminLogin />;
}
