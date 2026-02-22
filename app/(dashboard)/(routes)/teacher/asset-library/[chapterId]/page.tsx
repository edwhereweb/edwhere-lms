import { auth } from '@clerk/nextjs/server';
import { redirect, notFound } from 'next/navigation';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';
import { AssetDetailClient } from './_components/asset-detail-client';

interface AssetDetailPageProps {
  params: { chapterId: string };
}

const AssetDetailPage = async ({ params }: AssetDetailPageProps) => {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  const profile = await getSafeProfile();
  const isAdmin = profile?.role === 'ADMIN';
  const isTeacher = profile?.role === 'TEACHER';

  if (!profile || (!isAdmin && !isTeacher)) return redirect('/dashboard');

  const chapter = await db.chapter.findUnique({
    where: { id: params.chapterId },
    include: {
      course: {
        select: {
          id: true,
          title: true,
          userId: true,
          instructors: { select: { profileId: true } }
        }
      },
      muxData: true
    }
  });

  if (!chapter) return notFound();

  // Teachers can only access chapters from their own courses
  if (isTeacher) {
    const isCourseOwner = chapter.course.userId === userId;
    const isCourseInstructor = chapter.course.instructors.some((i) => i.profileId === profile.id);
    if (!isCourseOwner && !isCourseInstructor) return redirect('/teacher/asset-library');
  }

  return <AssetDetailClient chapter={chapter} />;
};

export default AssetDetailPage;
