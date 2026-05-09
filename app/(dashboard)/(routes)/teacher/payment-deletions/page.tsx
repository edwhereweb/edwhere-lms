import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { currentProfile } from '@/lib/current-profile';
import { PaymentDeletionsClient } from './_components/payment-deletions-client';

export const dynamic = 'force-dynamic';

export default async function PaymentDeletionsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const profile = await currentProfile();
  if (profile?.role !== 'ADMIN') redirect('/');

  const entries = await db.leadPaymentEntry.findMany({
    where: { status: 'DELETION_REQUESTED' },
    include: { lead: true },
    orderBy: { deletionRequestedAt: 'asc' }
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
          Payment Entry Deletion Requests
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Review and approve or reject deletion requests from marketers.
        </p>
      </div>
      <PaymentDeletionsClient entries={entries} />
    </div>
  );
}
