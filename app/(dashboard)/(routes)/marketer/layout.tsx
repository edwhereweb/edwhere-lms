import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { isMarketer } from '@/lib/marketer';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function MarketerLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const authorized = await isMarketer();
  if (!authorized) redirect('/');

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Top bar */}
      <header className="h-14 border-b bg-white dark:bg-neutral-900 flex items-center px-6 gap-3 sticky top-0 z-40 shadow-sm">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors mr-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
        <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-[#F80602] flex items-center justify-center">
            <span className="text-white text-xs font-bold">M</span>
          </div>
          <span className="font-semibold text-neutral-800 dark:text-neutral-100">
            Marketing Dashboard
          </span>
        </div>
      </header>
      <main className="p-6 max-w-screen-2xl mx-auto">{children}</main>
    </div>
  );
}
