import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { LandingPagesClient } from '../../landing-pages/_components/landing-pages-client';
import getSafeProfile from '@/actions/get-safe-profile';
import { LandingPage } from '../../landing-pages/_components/landing-page-columns';

const MarketerLandingPagesPage = async () => {
  const { userId } = await auth();
  if (!userId) return redirect('/');

  const profile = await getSafeProfile();
  if (!profile || !['MARKETER', 'ADMIN'].includes(profile.role)) return redirect('/');

  const pages = (await db.landingPage.findMany({
    where: { createdBy: userId },
    orderBy: { createdAt: 'desc' }
  })) as unknown as LandingPage[];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">My Landing Pages</h1>
      </div>
      <LandingPagesClient data={pages} newPath="/marketer/landing-pages/new" isAdmin={false} />
    </div>
  );
};

export default MarketerLandingPagesPage;
