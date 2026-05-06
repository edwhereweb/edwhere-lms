import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import getSafeProfile from '@/actions/get-safe-profile';
import { getBatchReportsList } from '@/actions/get-batch-reports';
import { BatchReportDataTable } from './_components/batch-report-data-table';
import { columns } from './_components/batch-report-columns';
import { BarChart } from 'lucide-react';

const AdminBatchReportsPage = async () => {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  const profile = await getSafeProfile();
  if (profile?.role !== 'ADMIN') return redirect('/');

  const batches = await getBatchReportsList();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-x-2">
        <div className="p-2 bg-sky-100 rounded-md">
          <BarChart className="h-6 w-6 text-sky-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Admin Reports: Offline Batches</h1>
          <p className="text-sm text-muted-foreground">Global overview of all offline batches.</p>
        </div>
      </div>
      <BatchReportDataTable columns={columns} data={batches} />
    </div>
  );
};

export default AdminBatchReportsPage;
