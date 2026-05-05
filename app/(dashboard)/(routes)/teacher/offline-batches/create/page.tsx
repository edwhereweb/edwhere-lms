import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { isTeacher } from '@/lib/teacher';
import { CreateBatchForm } from './_components/create-batch-form';

const CreateBatchPage = async () => {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  const isAuthorized = await isTeacher();
  if (!isAuthorized) return redirect('/');

  return (
    <div className="p-6">
      <Link
        href="/teacher/offline-batches"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 w-fit"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Batches
      </Link>
      <h1 className="text-2xl font-semibold mb-6">Create Offline Batch</h1>
      <CreateBatchForm />
    </div>
  );
};

export default CreateBatchPage;
