'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function MarketerNav() {
  const pathname = usePathname();
  const isPayments = pathname.startsWith('/marketer/payments');

  return (
    <nav className="sticky top-14 z-30 border-b bg-white dark:bg-neutral-900 px-6">
      <div className="flex gap-0 -mb-px">
        <Link
          href="/marketer"
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            !isPayments
              ? 'border-[#F80602] text-[#F80602]'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          Leads
        </Link>
        <Link
          href="/marketer/payments"
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            isPayments
              ? 'border-[#F80602] text-[#F80602]'
              : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
          }`}
        >
          Payment Tracker
        </Link>
      </div>
    </nav>
  );
}
