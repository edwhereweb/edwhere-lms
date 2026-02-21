import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import getSafeProfile from '@/actions/get-safe-profile';
import { MentorChatWrapper } from './_components/mentor-chat-wrapper';

interface Props {
  params: { courseId: string };
}

export default async function CourseChatPage({ params }: Props) {
  const { userId } = await auth();
  if (!userId) return redirect('/sign-in');

  const profile = await getSafeProfile();
  if (!profile) return redirect('/dashboard');

  const isTeacherOrAdmin = profile.role === 'ADMIN' || profile.role === 'TEACHER';

  if (!isTeacherOrAdmin) {
    // Students must be enrolled
    const purchase = await db.purchase.findUnique({
      where: { userId_courseId: { userId, courseId: params.courseId } }
    });
    if (!purchase) return redirect(`/courses/${params.courseId}`);
  }

  return (
    <div className="h-[calc(100vh-80px)]">
      <MentorChatWrapper
        courseId={params.courseId}
        currentProfileId={profile.id}
        currentRole={profile.role}
      />
    </div>
  );
}
