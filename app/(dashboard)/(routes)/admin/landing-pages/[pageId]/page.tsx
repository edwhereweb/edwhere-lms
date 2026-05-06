import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { LandingPageForm } from '../../../landing-pages/_components/landing-page-form';
import getSafeProfile from '@/actions/get-safe-profile';
import { LandingPage } from '../../../landing-pages/_components/landing-page-columns';

const AdminEditLandingPage = async ({ params }: { params: { pageId: string } }) => {
  const { userId } = await auth();
  if (!userId) return redirect('/');

  const profile = await getSafeProfile();
  if (!profile || profile.role !== 'ADMIN') return redirect('/');

  const landingPage = (await db.landingPage.findUnique({
    where: { id: params.pageId }
  })) as unknown as LandingPage;

  if (!landingPage) return redirect('/admin/landing-pages');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">Review Landing Page</h1>
      <LandingPageForm initialData={landingPage} />
    </div>
  );
};

export default AdminEditLandingPage;
