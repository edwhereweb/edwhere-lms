import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { isTeacher } from '@/lib/teacher';
import getSafeProfile from '@/actions/get-safe-profile';
import { getBatches } from '@/actions/get-batches';
import { SessionsTabs } from './_components/sessions-tabs';

const OfflineSessionsPage = async () => {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  const isAuthorized = await isTeacher();
  if (!isAuthorized) return redirect('/');

  const profile = await getSafeProfile();
  if (!profile) return redirect('/');

  const batches = await getBatches(userId, profile.role);

  return (
    <div className="p-6">
      <SessionsTabs batches={batches} />
    </div>
  );
};

export default OfflineSessionsPage;
