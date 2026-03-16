import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin',
  description: 'Voice Inbox admin panel',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
      {children}
    </div>
  );
}
