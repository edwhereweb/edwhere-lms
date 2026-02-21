import { Sidebar } from './_components/Sidebar';
import { Navbar } from './_components/navbar';
import { auth } from '@clerk/nextjs/server';
import getSafeProfile from '@/actions/get-safe-profile';

const DashboardLayout = async ({ children }: { children: React.ReactNode }) => {
  const { userId } = await auth();

  // Unauthenticated users (e.g. landing page at /) — just render children,
  // no sidebar/navbar wrapper. Middleware already blocks protected routes.
  if (!userId) {
    return <>{children}</>;
  }

  const safeProfile = await getSafeProfile();

  if (!safeProfile) {
    throw new Error('Unable to load profile. Please check your database connection.');
  }

  return (
    <div className="h-full bg-background">
      <div className="h-[80px] md:pl-56 fixed inset-y-0 w-full z-50">
        <Navbar currentProfile={safeProfile} />
      </div>

      <div className="hidden md:flex h-full w-56 flex-col fixed inset-y-0 z-50">
        <Sidebar currentProfile={safeProfile} />
      </div>
      <main className="md:pl-56 pt-[80px] h-full bg-background">{children}</main>
    </div>
  );
};

export default DashboardLayout;
