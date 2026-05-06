import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { LandingPageForm } from '../../../landing-pages/_components/landing-page-form';
import getSafeProfile from '@/actions/get-safe-profile';
import { LandingPage } from '../../../landing-pages/_components/landing-page-columns';

const MarketerEditLandingPage = async ({ params }: { params: { pageId: string } }) => {
  const { userId } = await auth();
  if (!userId) return redirect('/');

  const profile = await getSafeProfile();
  if (!profile || !['MARKETER', 'ADMIN'].includes(profile.role)) return redirect('/');

  const landingPage = (await db.landingPage.findUnique({
    where: { id: params.pageId, createdBy: userId }
  })) as unknown as LandingPage;

  if (!landingPage) return redirect('/marketer/landing-pages');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">Edit Landing Page</h1>
      <LandingPageForm initialData={landingPage} />
    </div>
  );
};

export default MarketerEditLandingPage;
