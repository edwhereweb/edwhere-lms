import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { LandingPagesClient } from '../../landing-pages/_components/landing-pages-client';
import getSafeProfile from '@/actions/get-safe-profile';
import { LandingPage } from '../../landing-pages/_components/landing-page-columns';

const AdminLandingPagesPage = async () => {
  const { userId } = await auth();
  if (!userId) return redirect('/');

  const profile = await getSafeProfile();
  if (!profile || profile.role !== 'ADMIN') return redirect('/');

  const pages = (await db.landingPage.findMany({
    orderBy: { createdAt: 'desc' }
  })) as unknown as LandingPage[];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Landing Page Approvals</h1>
      </div>
      <LandingPagesClient data={pages} isAdmin={true} />
    </div>
  );
};

export default AdminLandingPagesPage;
