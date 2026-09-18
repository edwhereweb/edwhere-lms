import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';
import { LeadsTable } from './_components/leads-table';
import { CreateLeadDialog } from './_components/create-lead-dialog';
import { ExportLeadsButton } from './_components/export-leads-button';
import { currentProfile } from '@/lib/current-profile';
import { Users, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MarketerPage({
  searchParams
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const page = parseInt((searchParams.page as string) || '1', 10);
  const pageSize = 50;
  const q = ((searchParams.q as string) || '').trim();
  const statusFilter = (searchParams.status as string) || 'ALL';
  const sourceFilter = (searchParams.source as string) || 'ALL';

  const where: Prisma.LeadWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } }
    ];
  }
  if (statusFilter !== 'ALL') {
    where.status = statusFilter;
  }
  if (sourceFilter !== 'ALL') {
    where.source = sourceFilter;
  }

  const profile = await currentProfile();
  const isAdmin = profile?.role === 'ADMIN';

  const [total, newLeads, paymentPending, notInterested, filteredTotal, leads] = await Promise.all([
    db.lead.count(),
    db.lead.count({ where: { status: 'NEW_LEAD' } }),
    db.lead.count({ where: { status: 'PAYMENT_PENDING' } }),
    db.lead.count({ where: { status: 'NOT_INTERESTED' } }),
    db.lead.count({ where }),
    db.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { campaign: true }
    })
  ]);

  const totalPages = Math.ceil(filteredTotal / pageSize);

  const stats = [
    {
      label: 'Total Leads',
      value: total,
      icon: Users,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
    },
    {
      label: 'New Leads',
      value: newLeads,
      icon: Clock,
      color: 'text-sky-600 bg-sky-100 dark:bg-sky-900/30'
    },
    {
      label: 'Payment Pending',
      value: paymentPending,
      icon: TrendingUp,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/30'
    },
    {
      label: 'Not Interested',
      value: notInterested,
      icon: CheckCircle2,
      color: 'text-red-600 bg-red-100 dark:bg-red-900/30'
    }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">Leads</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            All enquiries submitted through the contact form and other sources.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && <ExportLeadsButton />}
          <CreateLeadDialog />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border bg-white dark:bg-neutral-900 shadow-sm p-4 flex items-center gap-3"
          >
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}
            >
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{s.value}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Leads table */}
      <LeadsTable leads={leads} page={page} totalPages={totalPages} />
    </div>
  );
}
