import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { isMarketer } from '@/lib/marketer';
import { PaymentTrackerShell } from './_components/payment-tracker-shell';
import type { LeadPaymentEntry } from '@prisma/client';

export const dynamic = 'force-dynamic';

export type LeadWithPayments = {
  id: string;
  name: string;
  phone: string;
  email: string;
  courseInterest: string | null;
  agreedAmount: number | null;
  closureNote: string | null;
  closedAt: Date | string | null;
  paymentEntries: LeadPaymentEntry[];
  // computed
  totalPaid: number;
  totalWaived: number;
  outstanding: number;
  overallStatus: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'DEFAULTED';
};

function computeStatus(lead: {
  agreedAmount: number | null;
  paymentEntries: LeadPaymentEntry[];
}): LeadWithPayments['overallStatus'] {
  const entries = lead.paymentEntries;
  const totalPaid = entries.filter((e) => e.status === 'PAID').reduce((s, e) => s + e.amount, 0);
  const totalWaived = entries
    .filter((e) => e.status === 'WAIVED')
    .reduce((s, e) => s + e.amount, 0);
  const agreed = lead.agreedAmount ?? 0;
  const outstanding = agreed - totalPaid - totalWaived;

  if (outstanding <= 0 && agreed > 0) return 'PAID';

  const hasOverdue = entries.some(
    (e) =>
      e.status === 'OVERDUE' ||
      (e.status === 'PENDING' && e.dueDate && new Date(e.dueDate) < new Date())
  );
  if (hasOverdue) return 'OVERDUE';

  if (totalPaid > 0) return 'PARTIAL';
  return 'PENDING';
}

export default async function PaymentTrackerPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  const authorized = await isMarketer();
  if (!authorized) redirect('/');

  const rawLeads = await db.lead.findMany({
    where: { closureStatus: 'WON' },
    include: { paymentEntries: { orderBy: { createdAt: 'asc' } } },
    orderBy: { closedAt: 'desc' }
  });

  const leads: LeadWithPayments[] = rawLeads.map((lead) => {
    const totalPaid = lead.paymentEntries
      .filter((e) => e.status === 'PAID')
      .reduce((s, e) => s + e.amount, 0);
    const totalWaived = lead.paymentEntries
      .filter((e) => e.status === 'WAIVED')
      .reduce((s, e) => s + e.amount, 0);
    const outstanding = (lead.agreedAmount ?? 0) - totalPaid - totalWaived;

    return {
      id: lead.id,
      name: lead.name,
      phone: lead.phone,
      email: lead.email,
      courseInterest: lead.courseInterest,
      agreedAmount: lead.agreedAmount,
      closureNote: lead.closureNote,
      closedAt: lead.closedAt,
      paymentEntries: lead.paymentEntries,
      totalPaid,
      totalWaived,
      outstanding,
      overallStatus: computeStatus(lead)
    };
  });

  return <PaymentTrackerShell leads={leads} />;
}
