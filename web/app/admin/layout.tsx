import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin · Voice Inbox AI',
  description: 'Voice Inbox AI admin panel',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-zinc-50 to-slate-100 text-zinc-900 antialiased dark:from-zinc-950 dark:via-zinc-900 dark:to-slate-950 dark:text-zinc-100">
      {children}
    </div>
  );
}
