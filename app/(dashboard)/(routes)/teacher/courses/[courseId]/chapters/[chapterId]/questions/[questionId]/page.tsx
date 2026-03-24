import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
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

  const courseOwner = await db.course.findUnique({
    where: {
      id: params.courseId,
      userId
    }
  });

  if (!courseOwner) {
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
