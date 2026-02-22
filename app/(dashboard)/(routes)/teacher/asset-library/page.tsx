import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';
import { AssetLibraryClient } from './_components/asset-library-client';
import { BulkVideoUploader } from './_components/bulk-video-uploader';

const AssetLibraryPage = async () => {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  const profile = await getSafeProfile();
  const isAdmin = profile?.role === 'ADMIN';
  const isTeacher = profile?.role === 'TEACHER';

  if (!profile || (!isAdmin && !isTeacher)) return redirect('/dashboard');

  // Admins see all courses; teachers see only their own
  const courses = isAdmin
    ? await db.course.findMany({ select: { id: true, title: true }, orderBy: { title: 'asc' } })
    : await db.course.findMany({
        where: {
          OR: [{ userId }, { instructors: { some: { profileId: profile.id } } }]
        },
        select: { id: true, title: true },
        orderBy: { title: 'asc' }
      });

  const subtitle = isAdmin
    ? 'Browse, search, and edit all chapter assets across every course.'
    : 'Browse and edit chapter assets from your courses.';

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Asset Library</h1>
        <BulkVideoUploader courses={courses} />
      </div>
      <p className="text-sm text-muted-foreground mb-8">{subtitle}</p>
      <AssetLibraryClient courses={courses} />
    </div>
  );
};

export default AssetLibraryPage;
