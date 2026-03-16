import { cookies } from 'next/headers';

import { ADMIN_COOKIE_NAME } from '@/config/constants';

import { AdminDashboard } from './AdminDashboard';
import { AdminLogin } from './AdminLogin';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

export default async function AdminPage() {
  if (!ADMIN_SECRET?.trim()) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-center text-zinc-500">Admin not configured (set ADMIN_SECRET)</p>
      </div>
    );
  }

  const cookieStore = await cookies();
  const adminKey = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const isAdmin = adminKey === ADMIN_SECRET;

  if (isAdmin) {
    return <AdminDashboard />;
  }
  return <AdminLogin />;
}
