import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import getSafeProfile from '@/actions/get-safe-profile';
import { getBatches } from '@/actions/get-batches';
import { SessionsTabs } from './_components/sessions-tabs';

const OfflineSessionsPage = async () => {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  // One profile read covers both the role check and the page's own use.
  const profile = await getSafeProfile();
  if (!profile || (profile.role !== 'ADMIN' && profile.role !== 'TEACHER')) return redirect('/');

  const batches = await getBatches(userId, profile.role);

  return (
    <div className="p-6">
      <SessionsTabs batches={batches} />
    </div>
  );
};

export default OfflineSessionsPage;
