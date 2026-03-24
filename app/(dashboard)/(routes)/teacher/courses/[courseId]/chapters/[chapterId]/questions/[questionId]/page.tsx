import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { checkCourseEdit } from '@/lib/course-auth';
import { db } from '@/lib/db';
import { QuestionEditForm } from './_components/question-edit-form';

export default async function QuestionEditPage({
  params
}: {
  params: { courseId: string; chapterId: string; questionId: string };
}) {
  const { userId } = await auth();
  if (!userId) {
    return redirect('/');
  }

  const denied = await checkCourseEdit(userId, params.courseId);
  if (denied) {
    return redirect('/');
  }


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const question = await (db as any).question.findUnique({
    where: {
      id: params.questionId
    }
  });

  if (!question) {
    return redirect(`/teacher/courses/${params.courseId}/chapters/${params.chapterId}`);
  }

  return (
    <div className="p-6">
       <QuestionEditForm initialData={question} courseId={params.courseId} chapterId={params.chapterId} questionId={params.questionId} />
    </div>
  );
}
