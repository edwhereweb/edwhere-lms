import { db } from '@/lib/db';
import { LeadsTable } from './_components/leads-table';
import { CreateLeadDialog } from './_components/create-lead-dialog';
import { Users, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function MarketerPage() {
  const leads = await db.lead.findMany({
    orderBy: { createdAt: 'desc' }
  });

  type Lead = (typeof leads)[number];

  const total = leads.length;
  const newLeads = leads.filter((l: Lead) => l.status === 'NEW_LEAD').length;
  const paymentPending = leads.filter((l: Lead) => l.status === 'PAYMENT_PENDING').length;
  const notInterested = leads.filter((l: Lead) => l.status === 'NOT_INTERESTED').length;

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
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Leads</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            All enquiries submitted through the contact form and other sources.
          </p>
        </div>
        <CreateLeadDialog />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border bg-white dark:bg-slate-900 shadow-sm p-4 flex items-center gap-3"
          >
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color}`}
            >
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{s.value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Leads table */}
      <LeadsTable leads={leads} />
    </div>
  );
}
