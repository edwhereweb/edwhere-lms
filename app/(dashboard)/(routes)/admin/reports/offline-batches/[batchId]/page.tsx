import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import getSafeProfile from '@/actions/get-safe-profile';
import { getBatchReportDetail } from '@/actions/get-batch-reports';
import { ArrowLeft, Download, Calendar } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BatchTimelineChart } from './_components/batch-timeline-chart';
import { SessionListInteractive } from './_components/session-list-interactive';

const BatchReportDetailPage = async ({ params }: { params: Promise<{ batchId: string }> }) => {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  const profile = await getSafeProfile();
  if (profile?.role !== 'ADMIN') return redirect('/');

  const { batchId } = await params;
  const report = await getBatchReportDetail(batchId);

  if (!report) return redirect('/admin/reports/offline-batches');

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <Link
        href="/admin/reports/offline-batches"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Reports
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{report.title}</h1>
          <p className="text-muted-foreground mt-1 max-w-3xl">
            {report.description || 'No description provided for this batch.'}
          </p>
        </div>
        <a href={`/api/admin/reports/offline-batches/${batchId}/export`} download>
          <Button className="bg-sky-600 hover:bg-sky-700 text-white shadow-sm">
            <Download className="h-4 w-4 mr-2" />
            Export Batch Data
          </Button>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 border rounded-xl p-6 bg-card/50 backdrop-blur-sm shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-sky-500" />
              Attendance Timeline
            </h3>
          </div>
          <BatchTimelineChart sessions={report.sessions} />
        </div>

        {/* Sessions List (Interactive) */}
        <div className="border rounded-xl bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="p-4 border-b bg-muted/30">
            <h3 className="font-semibold text-lg">Session Log</h3>
            <p className="text-xs text-muted-foreground">Click to view IE Score & Feedback</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SessionListInteractive sessions={report.sessions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchReportDetailPage;
