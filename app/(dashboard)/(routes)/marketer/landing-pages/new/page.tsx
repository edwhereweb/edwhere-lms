import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { LandingPageForm } from '../../../landing-pages/_components/landing-page-form';
import getSafeProfile from '@/actions/get-safe-profile';

const MarketerNewLandingPage = async () => {
  const { userId } = await auth();
  if (!userId) return redirect('/');

  const profile = await getSafeProfile();
  if (!profile || !['MARKETER', 'ADMIN'].includes(profile.role)) return redirect('/');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold">Create New Landing Page</h1>
      <LandingPageForm />
    </div>
  );
};

export default MarketerNewLandingPage;
