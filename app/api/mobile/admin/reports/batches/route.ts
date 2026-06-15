import { auth } from '@clerk/nextjs/server';
import { mobileSuccess, mobileError, handleMobileApiError } from '@/lib/api-mobile-utils';
import { isTeacher } from '@/lib/teacher';
import { getBatchReportsList } from '@/actions/get-batch-reports';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return mobileError('UNAUTHORIZED', 'Unauthorized', 401);

    const teacherAccess = await isTeacher();
    if (!teacherAccess) return mobileError('FORBIDDEN', 'Forbidden', 403);

    const reports = await getBatchReportsList();

    return mobileSuccess(reports);
  } catch (error) {
    return handleMobileApiError('MOBILE_ADMIN_BATCH_REPORTS_LIST', error);
  }
}
