import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { isTeacher } from '@/lib/teacher';
import { getBatchReportDetail } from '@/actions/get-batch-reports';

type Params = { params: Promise<{ batchId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const teacherAccess = await isTeacher();
    if (!teacherAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const { batchId } = await params;

    const report = await getBatchReportDetail(batchId);
    if (!report) return mobileError('NOT_FOUND', 'Batch not found', 404);

    return mobileSuccess(report);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_BATCH_REPORT_DETAIL', error);
  }
}
