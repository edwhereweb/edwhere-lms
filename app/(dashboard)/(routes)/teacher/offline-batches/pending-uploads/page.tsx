import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { db } from '@/lib/db';
import { PendingUploadActions } from './_components/pending-upload-actions';

const PendingUploadsPage = async () => {
  const { userId } = await (await import('@clerk/nextjs/server')).auth();
  if (!userId) return redirect('/sign-in');

  const profile = await db.profile.findUnique({ where: { userId }, select: { role: true } });
  if (profile?.role !== 'ADMIN') return redirect('/teacher/offline-batches');

  const pending = await db.sessionUpload.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: {
      session: {
        select: {
          scheduledAt: true,
          item: {
            select: {
              title: true,
              module: { select: { title: true, batch: { select: { id: true, title: true } } } }
            }
          }
        }
      },
      logs: { where: { isLate: true }, orderBy: { uploadedAt: 'desc' } }
    }
  });

  function formatDateTime(d: Date) {
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Link
        href="/teacher/offline-batches"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Batches
      </Link>
      <div className="flex items-center gap-2 mb-6">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        <h1 className="text-xl font-semibold">Pending Upload Approvals</h1>
        <span className="ml-auto text-sm text-muted-foreground">{pending.length} pending</span>
      </div>

      {pending.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">All caught up — no pending uploads.</p>
        </div>
      ) : (
        <div className="divide-y border rounded-lg">
          {pending.map((upload) => {
            const session = upload.session;
            const lateCount = upload.logs.length;
            return (
              <div key={upload.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">
                      {session.item.module.batch.title} › {session.item.module.title} ›{' '}
                      {session.item.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Session: {formatDateTime(session.scheduledAt)} · File type:{' '}
                      <span className="capitalize font-medium">{upload.type}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Filename: {upload.filename}</p>
                    {lateCount > 0 && (
                      <p className="text-xs text-orange-500 mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Late upload · {lateCount} attempt{lateCount !== 1 ? 's' : ''}
                        {upload.logs[0] &&
                          ` · Last uploaded ${formatDateTime(upload.logs[0].uploadedAt)}`}
                      </p>
                    )}
                  </div>
                  <a
                    href={upload.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline shrink-0"
                  >
                    View file
                  </a>
                </div>
                <PendingUploadActions uploadId={upload.id} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PendingUploadsPage;
