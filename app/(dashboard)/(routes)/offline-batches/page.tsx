import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getStudentBatches } from '@/actions/get-batches';
import { StudentBatchList } from './_components/student-batch-list';

const StudentOfflineBatchesPage = async () => {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  const batches = await getStudentBatches(userId);

  // If not enrolled in any batch, redirect to dashboard
  if (batches.length === 0) return redirect('/dashboard');

  return (
    <div className="p-6">
      <StudentBatchList batches={batches} />
    </div>
  );
};

export default StudentOfflineBatchesPage;
